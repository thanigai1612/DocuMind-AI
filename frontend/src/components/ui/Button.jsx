import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  isLoading = false,
  className = '',
  fullWidth = false,
  icon = null
}) {
  const baseClasses = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary hover:bg-primaryHover text-white focus:ring-primary/50 shadow-md shadow-primary/20',
    secondary: 'bg-surface/50 hover:bg-surface border border-white/10 text-textMain focus:ring-gray-500/50',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 focus:ring-red-500/50',
    ghost: 'hover:bg-white/5 text-textMuted hover:text-textMain'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
