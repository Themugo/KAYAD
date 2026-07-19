export default function Spinner({
  size = 'md',
  variant = 'default',
  label,
  className = '',
}) {
  const classes = [
    'ui-spinner',
    `ui-spinner--${size}`,
    `ui-spinner--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} role="status" aria-label={label || 'Loading'}>
      <div className="ui-spinner__dot" />
      {label && <span className="ui-spinner__label">{label}</span>}
    </div>
  );
}

export function SpinnerPage({ label = 'Loading...' }) {
  return (
    <div className="loading-center" role="status" aria-label={label}>
      <Spinner size="lg" />
      {label && <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 14 }}>{label}</p>}
    </div>
  );
}

export function SpinnerInline({ label, className = '' }) {
  return (
    <div className={`ui-spinner-inline ${className}`} role="status" aria-label={label || 'Loading'}>
      <Spinner size="sm" />
      {label && <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 12 }}>{label}</span>}
    </div>
  );
}
