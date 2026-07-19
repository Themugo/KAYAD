import { useEffect, useCallback } from 'react';
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
}) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'ui-modal--sm',
    md: 'ui-modal--md',
    lg: 'ui-modal--lg',
    xl: 'ui-modal--xl',
    full: 'ui-modal--full',
  };

  return createPortal(
    <div className={`ui-modal-overlay ${className}`} onClick={(e) => { if (closeOnOverlay && e.target === e.currentTarget && onClose) onClose(); }}>
      <div
        className={`ui-modal ${sizeClasses[size] || 'ui-modal--md'}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && (
          <button className="ui-modal__close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        )}
        {title && (
          <div className="ui-modal__header">
            <h3 className="ui-modal__title">{title}</h3>
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
