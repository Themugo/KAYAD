import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function StatCard({ icon, label, value, sub, accent = 'var(--gold)', to }) {
  const inner = (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '22px 22px',
      transition: 'border-color 0.2s, transform 0.2s',
      cursor: to ? 'pointer' : 'default', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => { if (to) { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { if (to) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}}
    >
      <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', background: accent, opacity: 0.07 }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: accent, marginBottom: 14 }}>
        {icon}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

export function QuickLink({ to, icon, label, desc, accent = 'var(--gold-glow)' }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-glow-strong)'; e.currentTarget.style.background = 'var(--card-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)'; }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 11, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 19 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{desc}</div>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </Link>
  );
}

export function BidStatusBadge({ status }) {
  const map = {
    pending:  { bg: 'rgba(212,196,168,0.12)', color: 'var(--gold)', label: 'Pending' },
    paid:     { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'Paid' },
    failed:   { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Failed' },
    accepted: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Accepted' },
    outbid:   { bg: 'rgba(255,159,67,0.1)', color: '#ff9f43', label: 'Outbid' },
    won:      { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'Won' },
  };
  const m = map[status] || { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', label: status };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
}

export function TimeRemaining({ endTime }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const tick = () => {
      if (!endTime) return setRemaining('');
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) return setRemaining('Ended');
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [endTime]);
  if (!remaining) return null;
  return (
    <span style={{ fontSize: 11, color: remaining === 'Ended' ? 'rgba(255,255,255,0.3)' : '#22c55e', fontWeight: 600 }}>
      {remaining === 'Ended' ? 'Ended' : `⏱ ${remaining}`}
    </span>
  );
}
