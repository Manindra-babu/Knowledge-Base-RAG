import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

const GithubIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchDocuments = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await axios.get(`${API_URL}/api/documents`);
      setDocuments(res.data);
      // Select all by default
      setSelectedDocIds(res.data.map(d => d.id));
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const toggleDocSelection = (id) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar 
        documents={documents} 
        refreshDocs={fetchDocuments}
        selectedDocIds={selectedDocIds}
        toggleDocSelection={toggleDocSelection}
      />
      <div className="flex-1 flex flex-col h-full">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            DocuMind
          </h1>
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/Manindra-babu/Knowledge-Base-RAG" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
              title="View GitHub Repository"
            >
              <GithubIcon className="w-5 h-5" />
            </a>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-md hover:bg-muted text-sm font-medium transition-colors"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <ChatArea selectedDocIds={selectedDocIds} />
        </main>
      </div>
    </div>
  );
}

export default App;
