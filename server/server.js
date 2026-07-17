require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { parseDocument } = require('./parsers');
const { initVectorStore, addDocumentToStore, deleteDocumentFromStore, searchSimilarChunks } = require('./vector/db');
const { ChatGroq } = require('@langchain/groq');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Set up multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '20') * 1024 * 1024 }
});

// Simple in-memory document registry
const docsRegistryPath = path.join(__dirname, 'documents.json');
let documents = [];
if (fs.existsSync(docsRegistryPath)) {
  documents = JSON.parse(fs.readFileSync(docsRegistryPath, 'utf8'));
}

function saveRegistry() {
  fs.writeFileSync(docsRegistryPath, JSON.stringify(documents, null, 2));
}

// Initialize vector store
initVectorStore().then(() => {
  console.log('Vector store initialized');
});

// Routes
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = uuidv4();
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;

    // Parse Document
    const text = await parseDocument(filePath, mimeType);
    
    // Chunk and Store in Vector DB
    await addDocumentToStore(
      fileId, 
      fileName, 
      text, 
      parseInt(process.env.CHUNK_SIZE || '2000'), 
      parseInt(process.env.CHUNK_OVERLAP || '200')
    );

    const docMeta = {
      id: fileId,
      name: fileName,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      status: 'Ready'
    };

    documents.push(docMeta);
    saveRegistry();

    res.json({ message: 'File uploaded and processed successfully', document: docMeta });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents', (req, res) => {
  res.json(documents);
});

app.delete('/api/documents/:id', async (req, res) => {
  const fileId = req.params.id;
  const docIndex = documents.findIndex(d => d.id === fileId);
  
  if (docIndex > -1) {
    const doc = documents[docIndex];
    // Delete file
    // Note: We need the actual file path. Since we didn't save it, we might just leave the file or clean up uploads folder.
    // In a real app we'd save the filepath in the registry.
    documents.splice(docIndex, 1);
    saveRegistry();
    
    // Delete from vector DB
    await deleteDocumentFromStore(fileId);
    res.json({ message: 'Document deleted' });
  } else {
    res.status(404).json({ error: 'Document not found' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, documentIds } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Retrieve similar chunks
    const topK = parseInt(process.env.TOP_K_RESULTS || '15');
    let chunks = await searchSimilarChunks(message, topK);
    
    // Optionally filter chunks by selected documentIds if provided
    if (documentIds && documentIds.length > 0) {
        chunks = chunks.filter(c => documentIds.includes(c.metadata.fileId));
    }

    // Determine max score and confidence
    let maxScore = 0;
    if (chunks.length > 0) {
        maxScore = Math.max(...chunks.map(c => c.score || 0));
    }
    
    let confidence = 'Low';
    if (maxScore >= 0.25) confidence = 'High';
    else if (maxScore >= 0.15) confidence = 'Medium';

    const sources = chunks.map(c => ({
      fileName: c.metadata.fileName,
      score: c.score,
      excerpt: c.pageContent.substring(0, 200) + '...'
    }));

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send metadata immediately
    res.write(`data: ${JSON.stringify({ type: 'meta', sources, confidence })}\n\n`);

    const isGreeting = (msg) => {
      const normalized = msg.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
      const greetingWords = [
        'hi', 'hello', 'hey', 'greetings', 'hola', 'yo',
        'good morning', 'good afternoon', 'good evening',
        'how are you', 'how is it going', 'how do you do', 'how u dng', 'how are u',
        'whats up', 'whatsup'
      ];
      return greetingWords.some(word => 
        normalized === word || 
        normalized.startsWith(word + ' ') || 
        normalized.endsWith(' ' + word)
      );
    };

    if (chunks.length === 0 || maxScore < 0.05) {
       // Return early with not found or greeting message
       if (isGreeting(message)) {
         res.write(`data: ${JSON.stringify({ type: 'text', content: 'Hello! How are you doing? Is there anything you would like to ask or clarify regarding the uploaded documents?' })}\n\n`);
       } else {
         res.write(`data: ${JSON.stringify({ type: 'text', content: 'I could not find any relevant information in the uploaded documents for your query.' })}\n\n`);
       }
       res.write(`data: [DONE]\n\n`);
       return res.end();
    }

    const contextText = chunks.map(c => `[Source: ${c.metadata.fileName}]\n${c.pageContent}`).join('\n\n');

    // 2. Build Groq Prompt
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.1
    });

    const promptTemplate = PromptTemplate.fromTemplate(`You are a helpful assistant that answers questions strictly based on the provided document context. If the answer is not found in the context, say: 'I could not find this information in the uploaded documents.' Always cite which document and section your answer comes from.
Format multi-step answers as bullet points.

Context:
{context}

User Question: {question}

Answer:`);

    const chain = promptTemplate.pipe(model).pipe(new StringOutputParser());

    // 3. Stream Llama response
    const stream = await chain.stream({
      context: contextText,
      question: message
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process chat query' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'text', content: '\n\n[Error: Connection interrupted]' })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
