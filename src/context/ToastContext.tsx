// src/context/ToastContext.tsx
import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface Toast {
  id: number;
  msg: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextValue {
  toast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const icons: Record<string, string> = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return (
    <ToastCtx.Provider value={useMemo(() => ({ toast }), [toast])}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastCtx);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
