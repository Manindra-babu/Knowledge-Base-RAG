# Full-Stack Knowledge Base RAG Web Application

This is a Retrieval-Augmented Generation (RAG) web application that allows users to upload private documents (PDFs, TXT, DOCX) and chat with them using the Groq API (Llama 3) and Transformers.js for local embeddings.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Vector DB:** MemoryVectorStore (JSON persistence)
- **Embeddings:** `@xenova/transformers` (`all-MiniLM-L6-v2`) running locally
- **LLM:** Groq API (`llama3-8b-8192`) via LangChain
- **File Parsing:** `pdf-parse`, `mammoth` (DOCX), plain text

## Setup Instructions

### 1. Backend Setup
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Open `server/.env` and add your **Groq API Key**:
   ```
   GROQ_API_KEY=your_actual_groq_api_key_here
   ```
4. Start the backend server:
   ```bash
   npm start
   ```
   *Note: On the first run, the local embedding model (~90MB) will be downloaded automatically by transformers.js.*

### 2. Frontend Setup
1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Usage
1. Open the frontend URL (usually `http://localhost:5173`).
2. Upload a document (PDF, TXT, or DOCX).
3. Select the document in the sidebar.
4. Type a question in the chat interface. The app will search for relevant sections in your document, pass them to Groq, and return a cited answer!
