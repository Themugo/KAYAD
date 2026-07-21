export default function Pagination({ page = 1, totalPages = 1, onChange, className = '' }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={`ui-pagination ${className}`}>
      <button
        className={`ui-pagination__btn ${page <= 1 ? 'ui-pagination__btn--disabled' : ''}`}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      {start > 1 && (
        <>
          <button className="ui-pagination__btn" onClick={() => onChange(1)}>1</button>
          {start > 2 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          className={`ui-pagination__btn ${p === page ? 'ui-pagination__btn--active' : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
          <button className="ui-pagination__btn" onClick={() => onChange(totalPages)}>{totalPages}</button>
        </>
      )}
      <button
        className={`ui-pagination__btn ${page >= totalPages ? 'ui-pagination__btn--disabled' : ''}`}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
