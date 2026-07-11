// src/components/ui/Modal.jsx
import { useEffect } from 'react';

export default function Modal({
  open,
  onClose,
  title,
  size,
  footer,
  children,
  closeOnOverlay = true,
  className = '',
}) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size ? `ui-modal--${size}` : '';

  return (
    <div
      className="ui-modal-overlay"
      onClick={(e) => { if (closeOnOverlay && e.target === e.currentTarget && onClose) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      <div className={`ui-modal ${sizeClass} ${className}`}>
        {(title || onClose) && (
          <div className="ui-modal__header">
            {title && <h3 className="ui-modal__title">{title}</h3>}
            {onClose && (
              <button className="ui-modal__close" onClick={onClose} aria-label="Close dialog">
                ✕
              </button>
            )}
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
