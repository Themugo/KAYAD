// src/components/ui/Drawer.jsx
import { useEffect } from 'react';

export default function Drawer({
  open,
  onClose,
  side = 'right',
  title,
  children,
  footer,
  closeOnOverlay = true,
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

  return (
    <>
      <div
        className="ui-drawer-overlay"
        onClick={(e) => { if (closeOnOverlay && e.target === e.currentTarget && onClose) onClose(); }}
      />
      <aside
        className={`ui-drawer ui-drawer--${side}`}
        role="complementary"
        aria-label={title || 'Drawer'}
      >
        {(title || onClose) && (
          <div className="ui-modal__header">
            {title && <h3 className="ui-modal__title">{title}</h3>}
            {onClose && (
              <button className="ui-modal__close" onClick={onClose} aria-label="Close drawer">
                ✕
              </button>
            )}
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </aside>
    </>
  );
}
