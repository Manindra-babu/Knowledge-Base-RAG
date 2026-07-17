import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Loader2, Bot, User } from 'lucide-react';

const UserAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  </div>
);

const BotAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-md">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 text-white">
      <path d="M12 2a10 10 0 0 1 10 10v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-1A10 10 0 0 1 12 2z" />
      <path d="M12 2v4" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M9 14h6" />
    </svg>
  </div>
);

const renderFormattedContent = (content, isUser = false) => {
  if (!content) return null;

  const lines = content.split('\n');

  return lines.map((line, index) => {
    // Matches bullet points starting with *, -, or +
    const listMatch = line.match(/^(\s*)([*+-])\s+(.*)$/);
    
    // Helper to format bold text: **text**
    const formatBold = (text) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    if (listMatch) {
      const indent = listMatch[1].length;
      const text = listMatch[3];
      return (
        <div key={index} className="flex items-start gap-2 py-0.5" style={{ paddingLeft: `${indent * 8 + 12}px` }}>
          <span className={`${isUser ? 'text-white' : 'text-blue-600 dark:text-blue-500'} font-bold select-none`}>•</span>
          <span className="flex-1">{formatBold(text)}</span>
        </div>
      );
    }

    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const headerClasses = 
        level === 1 ? "text-2xl font-bold mt-4 mb-2" :
        level === 2 ? "text-xl font-bold mt-3 mb-2" :
        "text-lg font-bold mt-2 mb-1";
      return <div key={index} className={headerClasses}>{formatBold(text)}</div>;
    }

    return (
      <div key={index} className={line.trim() === '' ? 'h-3' : 'min-h-[1.25rem]'}>
        {formatBold(line)}
      </div>
    );
  });
};

export default function ChatArea({ selectedDocIds }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Create an initial empty assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [], confidence: null }]);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          documentIds: selectedDocIds
        })
      });

      if (!res.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // SSE messages are separated by \n\n
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // Keep the last incomplete part in the buffer

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.slice(6);
            if (dataStr === '[DONE]') {
              break;
            }

            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'meta') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    sources: data.sources,
                    confidence: data.confidence
                  };
                  return newMessages;
                });
              } else if (data.type === 'text') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    content: newMessages[newMessages.length - 1].content + data.content
                  };
                  return newMessages;
                });
              }
            } catch (err) {
              console.error('Error parsing SSE data:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request.',
          isError: true
        };
        return newMessages;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {selectedDocIds.length === 0 && messages.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center p-6 bg-card border border-border rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">No Documents Selected</h3>
            <p className="text-gray-500">Please upload and select at least one document from the sidebar to chat.</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg mb-6 animate-pulse">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-11 h-11 text-white">
                <path d="M12 2a10 10 0 0 1 10 10v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-1A10 10 0 0 1 12 2z" />
                <path d="M12 2v4" />
                <path d="M8 10h.01" />
                <path d="M16 10h.01" />
                <path d="M9 14h6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">DocuMind AI Assistant</h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Upload and select your documents in the sidebar, then ask questions to retrieve information instantly.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'user' ? <UserAvatar /> : <BotAvatar />}
                <div className={`p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : msg.isError 
                      ? 'bg-red-500/10 border border-red-500/50 text-red-500 rounded-tl-none'
                      : 'bg-card border border-border text-foreground rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap">{renderFormattedContent(msg.content, msg.role === 'user')}</div>
                  
                  {msg.confidence && (
                    <div className="mt-3">
                      <span className={`text-xs px-2 py-1 rounded-full border ${
                        msg.confidence === 'High' ? 'bg-green-500/10 border-green-500/50 text-green-500' :
                        msg.confidence === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' :
                        'bg-red-500/10 border-red-500/50 text-red-500'
                      }`}>
                        Confidence: {msg.confidence}
                      </span>
                    </div>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs font-semibold mb-2 opacity-80">Sources:</p>
                      <ul className="space-y-2">
                        {msg.sources.map((source, i) => (
                          <li key={i} className="text-xs bg-muted/50 p-2 rounded border border-border/50">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-blue-500 dark:text-blue-400">{source.fileName}</span>
                              {source.score !== undefined && (
                                <span className="opacity-60">Score: {(source.score * 100).toFixed(1)}%</span>
                              )}
                            </div>
                            <span className="opacity-70 line-clamp-2">{source.excerpt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <BotAvatar />
              <div className="p-4 rounded-2xl bg-card border border-border text-foreground rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            disabled={selectedDocIds.length === 0 || loading}
            className="flex-1 bg-background border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || selectedDocIds.length === 0 || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
