import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import AppLayout from './components/AppLayout';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/auth" />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        className: 'dark:bg-surface dark:text-textMain border dark:border-white/10',
        style: {
          background: 'var(--color-surface)',
          color: 'var(--color-textMain)',
          border: '1px solid var(--color-border)',
        }
      }} />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        {/* AppLayout acts as a wrapper for authenticated routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          {/* Note: The new chat route includes the chat_id (session) */}
          <Route path="chat/:pdfId/session/:chatId" element={<Chat />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
