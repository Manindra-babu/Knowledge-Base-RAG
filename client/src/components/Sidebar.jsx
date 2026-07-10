import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { UploadCloud, Trash2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Sidebar({ documents, refreshDocs, selectedDocIds, toggleDocSelection }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    setUploadError('');
    
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await axios.post(`${API_URL}/api/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshDocs();
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.error || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  }, [refreshDocs]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 20 * 1024 * 1024 // 20MB
  });

  const handleDelete = async (id) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await axios.delete(`${API_URL}/api/documents/${id}`);
      refreshDocs();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="w-80 h-full border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-4">Knowledge Base</h2>
        
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200
            ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:border-gray-400 dark:hover:border-gray-500'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          {uploading ? (
            <p className="text-sm">Processing document...</p>
          ) : (
            <p className="text-sm text-gray-500">Drag & drop or click to upload PDF, TXT, DOCX</p>
          )}
        </div>
        {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {documents.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <FileText className="mx-auto h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">No documents uploaded yet.</p>
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="p-3 rounded-lg border border-border bg-background flex flex-col gap-2 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input 
                    type="checkbox" 
                    checked={selectedDocIds.includes(doc.id)} 
                    onChange={() => toggleDocSelection(doc.id)}
                    className="mt-1"
                  />
                  <span className="text-sm font-medium truncate" title={doc.name}>
                    {doc.name}
                  </span>
                </div>
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors"
                  title="Delete Document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 pl-6">
                <span>{(doc.size / 1024).toFixed(1)} KB</span>
                {doc.status === 'Ready' ? (
                  <span className="flex items-center text-green-500"><CheckCircle2 className="w-3 h-3 mr-1"/> Ready</span>
                ) : (
                  <span className="flex items-center text-yellow-500"><AlertCircle className="w-3 h-3 mr-1"/> Error</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
