import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { Send, Bot, User, Edit3, Check, X, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export default function Chat() {
  const { pdfId, chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [chatDetails, setChatDetails] = useState(null);
  
  // Renaming state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatId) {
      fetchChatData();
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const fetchChatData = async () => {
    setIsInitializing(true);
    try {
      const [messagesRes, chatsRes] = await Promise.all([
        api.get(`/chat/${chatId}/messages`),
        api.get(`/chat/history/${pdfId}`)
      ]);
      setMessages(messagesRes.data);
      
      const currentChat = chatsRes.data.find(c => c.id === parseInt(chatId));
      if (currentChat) {
        setChatDetails(currentChat);
        setEditNameValue(currentChat.name);
      }
    } catch (err) {
      toast.error('Failed to load chat data.');
      console.error(err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userContent = input;
    const tempUserMsg = { role: 'user', content: userContent };
    
    // Optimistic UI update
    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post(`/chat/${chatId}/ask`, { question: userContent });
      setMessages(prev => [...prev, { role: 'ai', content: res.data.answer }]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate response.');
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Sorry, I encountered an error while trying to answer that.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRename = async () => {
    if (!editNameValue.trim()) {
      setIsEditingName(false);
      return;
    }
    
    const renameToast = toast.loading('Renaming chat...');
    try {
      await api.put(`/chat/rename/${chatId}`, { name: editNameValue });
      setChatDetails({ ...chatDetails, name: editNameValue });
      setIsEditingName(false);
      toast.success('Chat renamed successfully', { id: renameToast });
    } catch (err) {
      toast.error('Failed to rename chat', { id: renameToast });
      console.error("Error renaming chat", err);
    }
  };

  if (isInitializing) {
    return (
      <div className="h-full flex flex-col p-6">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="space-y-6 max-w-4xl w-full mx-auto">
          <Skeleton className="h-20 w-3/4 self-end" />
          <Skeleton className="h-24 w-3/4" />
          <Skeleton className="h-16 w-3/4 self-end" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      
      {/* Top Bar inside main area */}
      <header className="h-16 px-6 glass flex items-center justify-between border-b border-white/5 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input 
                type="text"
                autoFocus
                className="bg-surface border border-primary/50 rounded px-2 py-1 text-textMain text-sm focus:outline-none"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
              <button onClick={handleRename} className="p-1 hover:bg-white/10 rounded text-green-500 transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setIsEditingName(false); setEditNameValue(chatDetails?.name || ''); }} className="p-1 hover:bg-white/10 rounded text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-textMain tracking-wide">{chatDetails?.name || 'Chat Session'}</h2>
              <button onClick={() => setIsEditingName(true)} className="p-1.5 hover:bg-white/10 rounded-md text-textMuted hover:text-textMain transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {messages.length === 0 && !isTyping && (
            <div className="h-[50vh] flex flex-col items-center justify-center">
              <EmptyState 
                icon={Bot} 
                title="AI Assistant Ready" 
                description="I've analyzed your document. What would you like to know about it?" 
              />
            </div>
          )}

          {messages.map((msg, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={index} 
              className={`flex gap-4 md:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-primary' : 'bg-surface border border-white/10'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-primary" />}
              </div>
              <div className={`px-5 py-4 rounded-2xl max-w-[85%] text-sm md:text-base leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none shadow-md shadow-primary/20' 
                  : 'glass text-textMain rounded-tl-none border-l border-primary/20'
              }`}>
                {/* Simple whitespace formatting */}
                {msg.content.split('\n').map((line, i) => (
                  <span key={i}>{line}<br /></span>
                ))}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 md:gap-6">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="glass px-5 py-4 rounded-2xl rounded-tl-none flex items-center gap-3 text-textMuted">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-white/5 shrink-0">
        <div className="max-w-4xl mx-auto relative group">
          <form onSubmit={handleSend} className="flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your document..."
              className="w-full bg-surface border border-white/10 text-textMain rounded-xl pl-6 pr-14 py-4 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-gray-500 shadow-xl"
              disabled={isTyping}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-primary hover:bg-primaryHover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/30 focus:outline-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-2.5">
            <p className="text-[11px] text-textMuted/70">AI responses may be inaccurate. Verify important information.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
