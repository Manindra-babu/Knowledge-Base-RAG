const { pipeline } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

const VECTOR_STORE_PATH = path.join(__dirname, 'store.json');

// We use local HuggingFace embeddings via Xenova/transformers.js
let extractorPipeline = null;

async function getExtractor() {
  if (!extractorPipeline) {
    extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      session_options: {
        intraOpNumThreads: 1,
        interOpNumThreads: 1,
        enableCpuMemArena: false,
        enableMemPattern: false
      }
    });
  }
  return extractorPipeline;
}

async function embedTexts(texts) {
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  return output.tolist();
}

let memoryVectors = [];

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function chunkText(text, chunkSize, chunkOverlap) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    let end = i + chunkSize;
    // Try to break at a space if possible to avoid cutting words
    if (end < text.length) {
        let lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > i + (chunkSize / 2)) end = lastSpace;
    }
    const chunk = text.slice(i, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    i = end - chunkOverlap;
  }
  return chunks;
}

async function initVectorStore() {
  if (fs.existsSync(VECTOR_STORE_PATH)) {
    console.log('Loading existing memory vectors from JSON...');
    try {
      memoryVectors = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, 'utf8'));
      console.log(`Loaded ${memoryVectors.length} vectors.`);
    } catch (e) {
      console.error('Failed to load vector store, starting fresh.', e);
      memoryVectors = [];
    }
  } else {
    console.log('Creating new memory vector store...');
    memoryVectors = [];
  }
}

async function saveStore() {
  fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(memoryVectors));
}

async function addDocumentToStore(fileId, fileName, text, chunkSize = 1000, chunkOverlap = 200) {
  const textChunks = chunkText(text, chunkSize, chunkOverlap);
  const docs = textChunks.map(chunk => ({
    pageContent: chunk,
    metadata: { fileId, fileName }
  }));
  const vectors = await embedTexts(docs.map(d => d.pageContent));
  
  for (let i = 0; i < docs.length; i++) {
    memoryVectors.push({
      pageContent: docs[i].pageContent,
      metadata: docs[i].metadata,
      embedding: vectors[i]
    });
  }
  
  await saveStore();
  console.log(`Added ${docs.length} chunks to vector store for file ${fileName}`);
}

async function deleteDocumentFromStore(fileId) {
  const initialLength = memoryVectors.length;
  memoryVectors = memoryVectors.filter(
    vec => vec.metadata && vec.metadata.fileId !== fileId
  );
  await saveStore();
  console.log(`Deleted ${initialLength - memoryVectors.length} chunks for file ${fileId}`);
}

async function searchSimilarChunks(query, k = 5) {
  const queryEmbeddingResult = await embedTexts([query]);
  const queryEmbedding = queryEmbeddingResult[0];
  
  const scored = memoryVectors.map(vec => ({
    ...vec,
    score: cosineSimilarity(queryEmbedding, vec.embedding)
  }));
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

module.exports = {
  initVectorStore,
  addDocumentToStore,
  deleteDocumentFromStore,
  searchSimilarChunks
};
