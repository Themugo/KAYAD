import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function StatBox({ icon: Icon, label, value, sub, color = 'var(--gold)', to }) {
  const inner = (
    <div role="presentation" style={{
      background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '22px', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { if (to) { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { if (to) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: `${color}08` }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '2rem', color: '#fff', lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

export function NavTile({ to, icon: Icon, label, desc, danger }) {
  const accent = danger ? '#ef4444' : 'var(--gold)';
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div role="presentation" style={{
        background: '#0C0C0C',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14, padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}35`; e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.04)' : '#111'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#0C0C0C'; }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: danger ? '#ef4444' : '#fff', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{desc}</div>
        </div>
        <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
      </div>
    </Link>
  );
}

export function AlertDot({ severity }) {
  const map = { critical: 'var(--red)', warning: 'var(--orange)', info: 'var(--gold)', low: '#eab308' };
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: map[severity] || map.low,
      flexShrink: 0, marginTop: 3, display: 'inline-block',
    }} />
  );
}
