import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FileText, LogOut, MessageSquare, Plus, Trash2, Edit2, ChevronLeft, Menu, Sun, Moon, Monitor } from 'lucide-react';
import api from '../api/axios';
import { useTheme } from '../contexts/ThemeContext';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [pdfs, setPdfs] = useState([]);
  const [activePdfId, setActivePdfId] = useState(null);
  const [chats, setChats] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchPdfs();
  }, []);

  useEffect(() => {
    // Determine active PDF based on URL if we are in a chat
    const match = location.pathname.match(/\/chat\/(\d+)\/session\/(\d+)/);
    if (match) {
      const pdfId = parseInt(match[1]);
      setActivePdfId(pdfId);
      fetchChats(pdfId);
    } else {
      setActivePdfId(null);
      setChats([]);
    }
  }, [location.pathname]);

  const fetchPdfs = async () => {
    try {
      const res = await api.get('/pdf/list');
      setPdfs(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/auth');
      }
    }
  };

  const fetchChats = async (pdfId) => {
    try {
      const res = await api.get(`/chat/history/${pdfId}`);
      setChats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChat = async () => {
    if (!activePdfId) return;
    try {
      const res = await api.post(`/chat/create/${activePdfId}`, { name: 'New Chat Session' });
      fetchChats(activePdfId);
      navigate(`/chat/${activePdfId}/session/${res.data.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    try {
      await api.delete(`/chat/${chatId}`);
      setChats(chats.filter(c => c.id !== chatId));
      setRefreshTrigger(prev => prev + 1);
      // If we are currently on this chat, go back to dashboard
      if (location.pathname.includes(`/session/${chatId}`)) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePdf = async (pdfId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this PDF and ALL its chats?')) return;
    try {
      await api.delete(`/pdf/${pdfId}`);
      setPdfs(pdfs.filter(p => p.id !== pdfId));
      setRefreshTrigger(prev => prev + 1);
      if (activePdfId === pdfId) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="flex h-screen bg-background overflow-hidden text-textMain">
      
      {/* Mobile Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 glass border-b border-white/5 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2 font-bold text-lg cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 bg-primary/20 rounded-md flex items-center justify-center">
            <FileText className="text-primary w-5 h-5" />
          </div>
          DocuMind
        </div>
        <button onClick={toggleMobileMenu} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Left Sidebar - PDFs */}
      <div className={`w-64 glass-card border-r border-white/5 flex-shrink-0 flex flex-col transition-transform duration-300 z-40 fixed md:relative h-full ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 bg-primary/20 rounded-md flex items-center justify-center mr-3">
            <FileText className="text-primary w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-wide">DocuMind</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
          <div className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-4 ml-2 mt-2">Your Documents</div>
          {pdfs.map(pdf => (
            <div 
              key={pdf.id}
              onClick={() => {
                setActivePdfId(pdf.id);
                fetchChats(pdf.id);
                if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                navigate(`/dashboard`); // Going to dashboard to select a chat for this PDF, or auto-create one
              }}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activePdfId === pdf.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className={`w-4 h-4 shrink-0 ${activePdfId === pdf.id ? 'text-primary' : 'text-textMuted'}`} />
                <span className="truncate text-sm font-medium">{pdf.filename}</span>
              </div>
              <button onClick={(e) => handleDeletePdf(pdf.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-textMuted transition-all shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {pdfs.length === 0 && (
            <div className="text-sm text-textMuted text-center mt-8 px-4">Upload PDFs from the dashboard to see them here.</div>
          )}
        </div>
        
        <div className="p-4 border-t border-white/5 space-y-2">
          <button onClick={toggleTheme} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : theme === 'light' ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            {theme === 'dark' ? 'Light Mode' : theme === 'light' ? 'System Theme' : 'Dark Mode'}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-textMuted hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Second Sidebar - Chats for Active PDF */}
      {activePdfId && (
        <div className={`w-64 bg-surface/50 border-r border-white/5 flex-shrink-0 flex flex-col transition-transform duration-300 z-30 fixed md:relative h-full pt-16 md:pt-0 ${isMobileMenuOpen ? 'translate-x-64' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-4 border-b border-white/5">
            <button 
              onClick={handleCreateChat}
              className="w-full py-2.5 bg-primary hover:bg-primaryHover text-white rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-primary/20 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" /> New Chat
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
            <div className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-4 ml-2">Chat Sessions</div>
            {chats.map(chat => {
              const isActive = location.pathname.includes(`/session/${chat.id}`);
              return (
                <div 
                  key={chat.id}
                  onClick={() => {
                    navigate(`/chat/${activePdfId}/session/${chat.id}`);
                    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                  }}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-white/10 shadow-sm border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-textMuted'}`} />
                    <div className="flex flex-col overflow-hidden">
                      <span className={`truncate text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>{chat.name}</span>
                      <span className="text-[10px] text-textMuted mt-0.5">{new Date(chat.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={(e) => handleDeleteChat(chat.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-textMuted transition-all shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
            {chats.length === 0 && (
              <div className="text-sm text-textMuted text-center mt-8 px-4">No chats yet. Create one above!</div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 pt-16 md:pt-0 ${isMobileMenuOpen && activePdfId ? 'translate-x-[32rem]' : isMobileMenuOpen ? 'translate-x-64' : 'translate-x-0'}`}>
        {/* Overlay for mobile when menu is open */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}
        <Outlet context={{ fetchPdfs, refreshTrigger, setRefreshTrigger }} />
      </div>
    </div>
  );
}
