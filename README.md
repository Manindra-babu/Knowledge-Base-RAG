# 🧠 Knowledge Base Retrieval System (RAG)

A full-stack Retrieval-Augmented Generation (RAG) application that lets users upload private documents (PDFs, DOCX, TXT) and chat with them accurately using AI — powered by **Groq LLM** and **ChromaDB**.

---

## 🚀 Features

- 📄 Upload PDF, DOCX, and TXT documents
- ⚡ Fast AI responses powered by Groq (LLaMA 3.3 70B)
- 🔍 Semantic search using vector embeddings
- 📌 Source citations with every answer (filename, page, excerpt)
- 🌊 Streamed responses word-by-word (like ChatGPT)
- 🗂️ Knowledge base management (upload, view, delete documents)
- 🎯 Confidence scoring based on similarity thresholds
- 🌙 Dark mode support
- 📱 Mobile responsive UI

---

## 🏗️ Architecture

```
User Question
     ↓
Embed Query (HuggingFace all-MiniLM-L6-v2)
     ↓
Search ChromaDB → Top 5 Similar Chunks
     ↓
Build Prompt (System + Chunks + Question)
     ↓
Groq API (llama-3.3-70b-versatile)
     ↓
Stream Answer + Return Sources
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind CSS |
| Backend | Node.js + Express |
| LLM | Groq API (LLaMA 3.3 70B) |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` |
| Vector DB | ChromaDB |
| PDF Parsing | `pdf-parse` |
| DOCX Parsing | `mammoth` |
| Streaming | Server-Sent Events (SSE) |

---

## 📁 Folder Structure

```
knowledge-base-rag/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── SourceCard.jsx
│   │   │   ├── DocumentSidebar.jsx
│   │   │   └── UploadZone.jsx
│   │   ├── pages/
│   │   │   ├── Chat.jsx
│   │   │   └── KnowledgeBase.jsx
│   │   └── App.jsx
│   └── package.json
│
├── server/                   # Express backend
│   ├── routes/
│   │   ├── documents.js      # Upload, list, delete
│   │   └── chat.js           # Query + RAG pipeline
│   ├── services/
│   │   ├── embeddings.js     # HuggingFace embeddings
│   │   ├── vectorDB.js       # ChromaDB operations
│   │   ├── groqLLM.js        # Groq API calls
│   │   └── chunker.js        # Text chunking logic
│   ├── parsers/
│   │   ├── pdfParser.js
│   │   ├── docxParser.js
│   │   └── txtParser.js
│   ├── uploads/              # Temporary file storage
│   └── index.js
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Prerequisites

- Node.js v18+
- Python 3.9+ (for ChromaDB)
- npm or yarn
- Groq API Key → [console.groq.com](https://console.groq.com)

---

## 🔧 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/knowledge-base-rag.git
cd knowledge-base-rag
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Install frontend dependencies

```bash
cd ../client
npm install
```

### 4. Install ChromaDB (Python)

```bash
pip install chromadb sentence-transformers
```

### 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Groq API
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Embeddings
EMBEDDING_MODEL=all-MiniLM-L6-v2

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# App Config
MAX_FILE_SIZE_MB=20
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K_RESULTS=5
PORT=3001
```

### 6. Start ChromaDB

```bash
chroma run --host localhost --port 8000
```

### 7. Start the backend server

```bash
cd server
npm run dev
```

### 8. Start the frontend

```bash
cd client
npm run dev
```

### 9. Open in browser

```
http://localhost:5173
```

---

## 📡 API Reference

### Upload a Document
```http
POST /api/documents/upload
Content-Type: multipart/form-data

Body: file (PDF | DOCX | TXT)
```

**Response:**
```json
{
  "id": "doc_abc123",
  "filename": "policy.pdf",
  "chunks": 42,
  "status": "ready"
}
```

---

### List All Documents
```http
GET /api/documents
```

**Response:**
```json
[
  {
    "id": "doc_abc123",
    "filename": "policy.pdf",
    "size": "1.2MB",
    "uploadedAt": "2025-06-18T10:00:00Z",
    "chunks": 42,
    "status": "ready"
  }
]
```

---

### Delete a Document
```http
DELETE /api/documents/:id
```

---

### Chat (Query the Knowledge Base)
```http
POST /api/chat
Content-Type: application/json

{
  "question": "What is the refund policy?",
  "documentIds": ["doc_abc123", "doc_xyz456"]
}
```

**Response (streamed via SSE):**
```json
{
  "answer": "Based on the uploaded documents, customers can request a refund within 30 days...",
  "sources": [
    {
      "filename": "policy.pdf",
      "page": 2,
      "excerpt": "...eligible for a full refund within 30 days...",
      "score": 0.92,
      "confidence": "high"
    }
  ]
}
```

---

## 🎯 Output Confidence Levels

| Similarity Score | Confidence | Behavior |
|-----------------|------------|----------|
| 0.90 – 1.00 | 🟢 High | Answer directly |
| 0.75 – 0.89 | 🟡 Medium | Answer with disclaimer |
| 0.60 – 0.74 | 🟠 Low | "This might be relevant..." |
| Below 0.60 | 🔴 None | "Not found in documents" |

---

## 🐳 Docker Setup (Optional)

```bash
docker-compose up --build
```

Services started:
- Frontend → `http://localhost:5173`
- Backend → `http://localhost:3001`
- ChromaDB → `http://localhost:8000`

---

## 🧪 Testing

```bash
# Backend tests
cd server
npm run test

# Frontend tests
cd client
npm run test
```

---

## 🔒 Security Notes

- All uploaded documents are stored locally and never sent to third-party servers (except the text chunks sent to Groq for answering)
- API keys are stored in `.env` and never exposed to the frontend
- File type and size validation on upload
- Add authentication middleware before deploying to production

---

## 📌 Supported File Types

| Format | Library Used | Max Size |
|--------|-------------|----------|
| `.pdf` | `pdf-parse` | 20MB |
| `.docx` | `mammoth` | 20MB |
| `.txt` | Native Node.js | 20MB |

---

## 🗺️ Roadmap

- [ ] User authentication (JWT)
- [ ] Multi-user support with isolated knowledge bases
- [ ] Support for `.csv` and `.xlsx` files
- [ ] URL/website ingestion
- [ ] Document versioning
- [ ] Export chat history as PDF
- [ ] Ollama support for fully local LLM

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

## 💬 Support

If you run into issues, open a GitHub Issue or reach out at manindrachowdhary1715@email.com.

---

> Built with ❤️ using Groq, ChromaDB, and React
