import React from 'react';

export default function Toast({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-box">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-msg ${t.type || 'info'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
