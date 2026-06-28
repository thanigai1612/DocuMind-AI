import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { UploadCloud, FileText, Loader2, BarChart2, MessageSquare, HelpCircle, Clock, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

export default function Dashboard() {
  const { fetchPdfs, refreshTrigger, setRefreshTrigger } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard statistics.');
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    const uploadToast = toast.loading('Uploading and processing PDF...');
    
    try {
      await api.post('/pdf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully!', { id: uploadToast });
      fetchStats();
      fetchPdfs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error uploading file', { id: uploadToast });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePdf = async (pdfId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this PDF and ALL its chats?')) return;
    
    const deleteToast = toast.loading('Deleting document...');
    try {
      await api.delete(`/pdf/${pdfId}`);
      toast.success('Document deleted successfully', { id: deleteToast });
      fetchStats();
      fetchPdfs();
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      toast.error('Failed to delete document', { id: deleteToast });
      console.error(err);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 custom-scrollbar">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-textMain mb-2">Welcome Back!</h1>
        <p className="text-textMuted">Here is an overview of your workspace.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card hover={false} className="flex items-center gap-4">
          <div className="p-4 bg-primary/20 rounded-xl">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-textMuted">Total Documents</div>
            {stats ? (
              <div className="text-3xl font-bold text-textMain">{stats.total_pdfs}</div>
            ) : (
              <Skeleton className="h-9 w-16 mt-1" />
            )}
          </div>
        </Card>
        <Card hover={false} className="flex items-center gap-4">
          <div className="p-4 bg-green-500/20 rounded-xl">
            <MessageSquare className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-textMuted">Total Chat Sessions</div>
            {stats ? (
              <div className="text-3xl font-bold text-textMain">{stats.total_chats}</div>
            ) : (
              <Skeleton className="h-9 w-16 mt-1" />
            )}
          </div>
        </Card>
        <Card hover={false} className="flex items-center gap-4">
          <div className="p-4 bg-purple-500/20 rounded-xl">
            <HelpCircle className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-textMuted">Questions Asked</div>
            {stats ? (
              <div className="text-3xl font-bold text-textMain">{stats.total_questions}</div>
            ) : (
              <Skeleton className="h-9 w-16 mt-1" />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upload & Recent PDFs */}
        <div className="space-y-8">
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`glass border-2 border-dashed border-white/10 hover:border-primary/50 transition-all rounded-2xl p-10 text-center ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'}`}
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
            <h3 className="text-lg font-semibold text-textMain mb-2">
              {isUploading ? 'Processing your PDF...' : 'Upload new document'}
            </h3>
            <p className="text-sm text-textMuted">
              {isUploading ? 'Extracting text and generating embeddings.' : 'Drag & drop or click to browse.'}
            </p>
          </div>

          <Card>
            <h2 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-textMuted" /> Recent Documents
            </h2>
            <div className="space-y-3">
              {!stats ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : stats.recent_pdfs.length === 0 ? (
                <EmptyState 
                  icon={FileText} 
                  title="No documents yet" 
                  description="Upload your first PDF document to get started." 
                />
              ) : (
                stats.recent_pdfs.map(pdf => (
                  <div key={pdf.id} className="flex items-center justify-between p-4 bg-surface/50 rounded-xl hover:bg-surface transition-colors group border border-white/5">
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-textMain font-medium">{pdf.filename}</span>
                      <span className="text-xs text-textMuted mt-1">{(pdf.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(pdf.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleDeletePdf(pdf.id, e)}
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Chats */}
        <Card>
          <h2 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-textMuted" /> Recent Chat Sessions
          </h2>
          <div className="space-y-3">
            {!stats ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : stats.recent_chats.length === 0 ? (
              <EmptyState 
                icon={MessageSquare} 
                title="No chats yet" 
                description="Select a document and start chatting with it." 
              />
            ) : (
              stats.recent_chats.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => navigate(`/chat/${chat.pdf_id}/session/${chat.id}`)}
                  className="flex items-center justify-between p-4 bg-surface/50 rounded-xl hover:bg-surface hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer group border border-white/5"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-textMain font-medium">{chat.name}</span>
                      <span className="text-xs text-textMuted mt-1">Updated {new Date(chat.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-textMuted opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-1" />
                </div>
              ))
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
