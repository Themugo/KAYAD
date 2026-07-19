const variants = {
  primary:   { bg: 'var(--accent)', color: '#fff', border: 'none' },
  secondary: { bg: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' },
  danger:    { bg: 'var(--red)', color: '#fff', border: 'none' },
  success:   { bg: 'var(--green)', color: '#fff', border: 'none' },
  ghost:     { bg: 'transparent', color: 'var(--text)', border: 'none' },
  outline:   { bg: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' },
};

const sizes = {
  sm:   { padding: '6px 14px', fontSize: 13, borderRadius: 6 },
  md:   { padding: '10px 20px', fontSize: 14, borderRadius: 8 },
  icon: { padding: 6, fontSize: 14, borderRadius: 6, lineHeight: 1 },
  lg:   { padding: '14px 28px', fontSize: 16, borderRadius: 10 },
};

export default function Button({
  children, variant = 'primary', size = 'md', loading, full,
  onClick, style, disabled, title, ...props
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        width: full ? '100%' : undefined,
        fontWeight: 600,
        transition: 'all 0.2s',
        ...variants[variant] || variants.primary,
        ...sizes[size] || sizes.md,
        ...style,
      }}
      {...props}
    >
      {loading ? <span className="spinner-inline" /> : null}
      {children}
    </button>
  );
}
