// src/context/ToastContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius)',
              padding: '14px 20px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'slideInRight 0.3s ease',
              maxWidth: 360,
              cursor: 'pointer',
            }}
            onClick={() => remove(t.id)}
          >
            <span className="toast-icon">
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) return { toast: () => {} };
  return ctx;
};
