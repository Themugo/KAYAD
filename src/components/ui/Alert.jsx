import { useState } from 'react';

const ALERT_VARIANTS = ['info', 'success', 'warning', 'error'];

export default function Alert({
  children,
  variant = 'info',
  title,
  dismissible = false,
  icon,
  className = '',
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const classes = [
    'ui-alert',
    `ui-alert--${variant}`,
    dismissible ? 'ui-alert--dismissible' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} role="alert">
      {icon && <span className="ui-alert__icon" aria-hidden="true">{icon}</span>}
      <div className="ui-alert__content">
        {title && <div className="ui-alert__title">{title}</div>}
        <div className="ui-alert__message">{children}</div>
      </div>
      {dismissible && (
        <button className="ui-alert__close" onClick={() => setDismissed(true)} aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}
