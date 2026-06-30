import { FilterX } from 'lucide-react';

export default function ShowroomEmptyState({ onClear }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '80px 32px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 16,
        background: 'rgba(212,196,168,0.1)',
        border: '1px solid rgba(212,196,168,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <FilterX size={36} style={{ color: 'var(--gold)' }} />
      </div>
      <div style={{
        fontSize: 11,
        color: 'var(--gold)',
        fontWeight: 800,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        Empty Gallery
      </div>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: 'clamp(1.4rem,3vw,1.8rem)',
        color: '#fff',
        margin: '0 0 12px',
      }}>
        No vehicles match this search
      </h2>
      <p style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 1.6,
        margin: '0 0 24px',
        maxWidth: 400,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        Try loosening a filter — or browse the full catalogue.
      </p>
      <button
        type="button"
        onClick={onClear}
        style={{
          padding: '10px 22px',
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: 'var(--gold)',
          color: '#0a0a0a',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        Reset Filters
      </button>
    </div>
  );
}
