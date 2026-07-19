import { useEffect, useState } from 'react';

const NOTIFICATION_VARIANTS = ['success', 'error', 'warning', 'info'];

export default function Notification({
  children,
  variant = 'info',
  title,
  dismissible = true,
  duration = 0,
  onDismiss,
  icon,
  className = '',
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => handleDismiss(), duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss?.(), 200);
  };

  const classes = [
    'ui-notification',
    `ui-notification--${variant}`,
    exiting ? 'ui-notification--exit' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} role="alert" aria-live="polite">
      {icon && <span className="ui-notification__icon" aria-hidden="true">{icon}</span>}
      <div className="ui-notification__content">
        {title && <div className="ui-notification__title">{title}</div>}
        <div className="ui-notification__message">{children}</div>
      </div>
      {dismissible && (
        <button className="ui-notification__close" onClick={handleDismiss} aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}
