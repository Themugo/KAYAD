export default function ShowroomEmptyState({ onClear }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px', maxWidth: 480, margin: '0 auto',
    }}>
      <div style={{
        fontSize: 11, color: 'var(--gold, #D4C4A8)', fontWeight: 700, letterSpacing: '0.2em',
        textTransform: 'uppercase', marginBottom: 14,
      }}>Empty Gallery</div>
      <h2 style={{
        fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontWeight: 700,
        fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', color: '#fff', margin: '0 0 12px',
      }}>No vehicles match this search</h2>
      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 22,
        fontFamily: 'var(--font-body, sans-serif)',
      }}>Try loosening a filter — or browse the full catalogue.</p>
      <button type="button" onClick={onClear}
        style={{
          background: 'var(--gold, #D4C4A8)', border: 'none', borderRadius: 10,
          padding: '10px 22px', color: '#0a0a0a', fontSize: 12, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          fontFamily: 'var(--font-body, sans-serif)',
        }}>Reset Filters</button>
    </div>
  );
}
