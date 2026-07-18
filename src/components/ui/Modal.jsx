import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  showClose = true,
  className = '',
  ...rest
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 400,
    md: 560,
    lg: 720,
    xl: 960,
    full: '95vw',
  };

  const width = typeof size === 'number' ? size : sizes[size];

  return createPortal(
    <div
      ref={overlayRef}
      onClick={closeOnOverlay ? onClose : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'modalFadeIn 0.2s ease',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'modalSlideIn 0.2s ease',
        }}
        className={className}
        {...rest}
      >
        {(title || showClose) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          }}>
            {title && (
              <h2 id="modal-title" style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#0F172A',
                margin: 0,
              }}>
                {title}
              </h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid rgba(15, 23, 42, 0.1)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(15, 23, 42, 0.5)',
                  fontSize: 16,
                  marginLeft: 'auto',
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
        }}>
          {children}
        </div>
        {footer && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(15, 23, 42, 0.08)',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}>
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}
