const palette = {
  red:    { bg: 'rgba(239,68,68,0.12)', color: 'var(--red)' },
  orange: { bg: 'rgba(249,115,22,0.12)', color: 'var(--orange)' },
  green:  { bg: 'rgba(34,197,94,0.12)', color: 'var(--green)' },
  blue:   { bg: 'rgba(59,130,246,0.12)', color: 'var(--accent)' },
  gray:   { bg: 'rgba(100,116,139,0.12)', color: 'var(--text-muted)' },
};

export default function Badge({ children, variant = 'gray', style }) {
  const v = palette[variant] || palette.gray;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 999,
        whiteSpace: 'nowrap',
        ...v,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
