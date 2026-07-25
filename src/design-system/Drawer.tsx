import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'right' | 'left';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const positionClass = position === 'right' ? 'right-0' : 'left-0';

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs transition-opacity">
      <div
        className={`fixed top-0 bottom-0 ${positionClass} w-full max-w-md bg-[#1E3063] border-l border-[#1A2A4E]/80 shadow-2xl flex flex-col z-50 animate-slideIn`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A2A4E]/60">
          {title && <h3 className="text-lg font-bold text-white font-serif">{title}</h3>}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
