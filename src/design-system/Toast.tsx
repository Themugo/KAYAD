import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  onClose,
}) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#2ECC71]" />,
    error: <AlertCircle className="w-5 h-5 text-[#DC3545]" />,
    info: <Info className="w-5 h-5 text-[#00C9CE]" />,
  };

  const bgStyles = {
    success: 'bg-[#1E3063] border-[#2ECC71]/40 text-white',
    error: 'bg-[#1E3063] border-[#DC3545]/40 text-white',
    info: 'bg-[#1E3063] border-[#00C9CE]/40 text-white',
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md max-w-sm transition-all duration-300 ${bgStyles[type]}`}
    >
      {icons[type]}
      <p className="text-sm font-medium flex-1">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
