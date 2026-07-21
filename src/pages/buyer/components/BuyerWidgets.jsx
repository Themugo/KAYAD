import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/dashboard.css';

export function StatCard({ icon, label, value, sub, accent = 'var(--gold)', to }) {
  const inner = (
    <div className="ov-card ov-card-padded stat-card-outer" style={{ cursor: to ? 'pointer' : 'default' }}>
      <div className="stat-card-circle" style={{ background: accent }} />
      <div className="stat-card-icon-box" style={{ background: accent, color: accent }}>
        {icon}
      </div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export function QuickLink({ to, icon, label, desc, accent = 'var(--gold-glow)' }) {
  return (
    <Link to={to}>
      <div className="quick-link-card">
        <div className="quick-link-icon-box" style={{ background: accent }}>
          {icon}
        </div>
        <div className="quick-link-body">
          <div className="quick-link-label">{label}</div>
          <div className="quick-link-desc">{desc}</div>
        </div>
        <svg className="quick-link-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </Link>
  );
}

export function BidStatusBadge({ status }) {
  const labels = { pending: 'Pending', paid: 'Paid', failed: 'Failed', accepted: 'Accepted', outbid: 'Outbid', won: 'Won' };
  const label = labels[status] || status;
  return (
    <span className={`status-badge status-badge-${status || 'default'}`}>{label}</span>
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
