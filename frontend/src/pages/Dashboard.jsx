import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { UploadCloud, FileText, Loader2, BarChart2, MessageSquare, HelpCircle, Clock, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { fetchPdfs } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      await api.post('/pdf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Refresh local stats and global pdf list
      fetchStats();
      fetchPdfs();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error uploading file');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePdf = async (pdfId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this PDF and ALL its chats?')) return;
    try {
      await api.delete(`/pdf/${pdfId}`);
      fetchStats();
      fetchPdfs();
    } catch (err) {
      console.error(err);
    }
  };

  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 custom-scrollbar">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back!</h1>
        <p className="text-textMuted">Here is an overview of your workspace.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-4 bg-primary/20 rounded-xl">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-textMuted">Total Documents</div>
            <div className="text-3xl font-bold text-white">{stats.total_pdfs}</div>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-4 bg-green-500/20 rounded-xl">
            <MessageSquare className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-textMuted">Total Chat Sessions</div>
            <div className="text-3xl font-bold text-white">{stats.total_chats}</div>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-4 bg-purple-500/20 rounded-xl">
            <HelpCircle className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-textMuted">Questions Asked</div>
            <div className="text-3xl font-bold text-white">{stats.total_questions}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upload & Recent PDFs */}
        <div className="space-y-8">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="glass border-2 border-dashed border-white/10 hover:border-primary/50 transition-all rounded-2xl p-10 text-center cursor-pointer group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="application/pdf"
            />
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-surface rounded-full group-hover:scale-110 transition-transform shadow-lg">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-primary" />
                )}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {isUploading ? 'Processing your PDF...' : 'Upload new document'}
            </h3>
            <p className="text-sm text-textMuted">
              {isUploading ? 'Extracting text and generating embeddings.' : 'Drag & drop or click to browse.'}
            </p>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-textMuted" /> Recent Documents
            </h2>
            <div className="space-y-3">
              {stats.recent_pdfs.length === 0 ? (
                <div className="text-sm text-textMuted text-center py-4">No documents found.</div>
              ) : (
                stats.recent_pdfs.map(pdf => (
                  <div key={pdf.id} className="flex items-center justify-between p-4 bg-surface/50 rounded-xl hover:bg-surface transition-colors group">
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-white font-medium">{pdf.filename}</span>
                      <span className="text-xs text-textMuted mt-1">{(pdf.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(pdf.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleDeletePdf(pdf.id, e)}
                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Chats */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-textMuted" /> Recent Chat Sessions
          </h2>
          <div className="space-y-3">
            {stats.recent_chats.length === 0 ? (
              <div className="text-sm text-textMuted text-center py-4">No chat sessions found.</div>
            ) : (
              stats.recent_chats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => navigate(`/chat/${chat.pdf_id}/session/${chat.id}`)}
                  className="flex items-center justify-between p-4 bg-surface/50 rounded-xl hover:bg-surface hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-white font-medium">{chat.name}</span>
                      <span className="text-xs text-textMuted mt-1">Updated {new Date(chat.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-textMuted opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-1" />
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
