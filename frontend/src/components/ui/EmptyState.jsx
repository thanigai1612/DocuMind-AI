import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center glass rounded-xl border border-white/5">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-surface/50 border border-white/10 flex items-center justify-center mb-4 shadow-lg text-textMuted">
          <Icon className="w-8 h-8 opacity-70" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-textMain mb-2">{title}</h3>
      <p className="text-sm text-textMuted max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
