const VARIANTS = {
  info: {
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.2)',
    color: '#2563EB',
    icon: 'ℹ️',
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.08)',
    border: 'rgba(34, 197, 94, 0.2)',
    color: '#16A34A',
    icon: '✅',
  },
  warning: {
    bg: 'rgba(251, 191, 36, 0.08)',
    border: 'rgba(251, 191, 36, 0.2)',
    color: '#D97706',
    icon: '⚠️',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.2)',
    color: '#DC2626',
    icon: '❌',
  },
};

export default function Alert({
  variant = 'info',
  title,
  children,
  icon,
  onClose,
  className = '',
  style: customStyle,
  ...rest
}) {
  const styles = VARIANTS[variant] || VARIANTS.info;

  return (
    <div
      role="alert"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        ...customStyle,
      }}
      className={className}
      {...rest}
    >
      <span style={{ fontSize: 16, lineHeight: 1.4 }}>
        {icon || styles.icon}
      </span>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{
            fontWeight: 600,
            color: styles.color,
            marginBottom: title ? 4 : 0,
            fontSize: 14,
          }}>
            {title}
          </div>
        )}
        <div style={{
          color: styles.color,
          fontSize: 13,
          opacity: 0.9,
          lineHeight: 1.5,
        }}>
          {children}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss alert"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: styles.color,
            opacity: 0.6,
            fontSize: 12,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
