import React from 'react';

export default function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  return (
    <div className={`animate-pulse bg-gray-300 dark:bg-gray-700/50 ${rounded} ${className}`} />
  );
}
