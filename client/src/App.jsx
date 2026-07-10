import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [darkMode, setDarkMode] = useState(true);

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
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            DocuMind
          </h1>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-md hover:bg-muted"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </header>
        <main className="flex-1 overflow-hidden">
          <ChatArea selectedDocIds={selectedDocIds} />
        </main>
      </div>
    </div>
  );
}

export default App;
