import React from 'react';

export default function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`glass-card p-6 ${hover ? 'hover:bg-surface/80 hover:ring-1 hover:ring-primary/30 cursor-pointer transition-all' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
