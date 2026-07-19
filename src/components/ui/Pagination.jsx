export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  const btn = (label, active, onClick, disabled) => (
    <button
      key={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 36,
        height: 36,
        padding: '0 8px',
        border: active ? 'none' : '1px solid var(--border)',
        borderRadius: 8,
        background: active ? 'var(--accent)' : 'var(--card)',
        color: active ? '#fff' : 'var(--text)',
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 20 }}>
      {btn('‹ Prev', false, () => onChange(page - 1), page <= 1)}
      {pages.map(p => btn(p, p === page, () => onChange(p), false))}
      {btn('Next ›', false, () => onChange(page + 1), page >= totalPages)}
    </div>
  );
}
