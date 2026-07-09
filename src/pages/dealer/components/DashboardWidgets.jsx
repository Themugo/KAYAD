// src/pages/dealer/components/DashboardWidgets.jsx
// Shared widgets and constants for the dealer dashboard

import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export const TABS_CONFIG = [
  { id: 'overview', label: 'Overview' },
  { id: 'listings', label: 'Listings' },
  { id: 'leads',    label: 'Leads' },
  { id: 'bids',     label: 'Bids' },
  { id: 'escrows',  label: 'Escrows' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'package',  label: 'My Package' },
  { id: 'team',     label: 'Team' },
];

export const STATUS_CONFIG = {
  active:  { label: 'Active',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
  sold:    { label: 'Sold',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  pending: { label: 'Pending', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  draft:   { label: 'Draft',   color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)' },
  live:    { label: 'Live Auction', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export const BID_STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  accepted: { label: 'Accepted', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export const ESCROW_STEPS = [
  { key: 'pending',  label: 'Pending',  color: '#f97316' },
  { key: 'held',     label: 'Held',     color: '#3b82f6' },
  { key: 'released', label: 'Released', color: '#22c55e' },
  { key: 'refunded', label: 'Refunded', color: '#6b7280' },
];

export function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function StatCard({ icon, label, value, sub, color = 'var(--gold)', to, trend }) {
  const isUp = trend > 0;
  const showTrend = trend !== undefined && trend !== null;
  const inner = (
    <div role="presentation" style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', background: color, opacity: 0.07 }} />
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{value}</div>
      {(sub || showTrend) && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {sub}
          {showTrend && <span style={{ color: isUp ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 10 }}>{isUp ? '↑' : '↓'}{Math.abs(trend)}%</span>}
        </div>
      )}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

export function StatusBadge({ status, custom }) {
  const config = custom || STATUS_CONFIG[status] || { label: status, color: '#999', bg: 'rgba(255,255,255,0.05)' };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 9999,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
      background: config.bg, color: config.color, whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  );
}

export function DemoBadge({ edited }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 700,
      background: edited ? 'rgba(34,197,94,0.12)' : 'rgba(212,196,168,0.1)',
      color: edited ? '#22c55e' : 'var(--gold)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {edited ? <><Check size={8} /> Edited</> : 'Demo'}
    </span>
  );
}

// Lightweight dependency-free bar chart (matches the hand-rolled inline style).
// data: [{ label, value }]. format(value) controls the hover/peak label.
export function MiniBarChart({ data = [], color = 'var(--gold)', height = 150, format = (v) => v }) {
  const max = Math.max(...data.map(d => d.value || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 2px' }}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontFamily: 'var(--font-display)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
              {d.value ? format(d.value) : ''}
            </span>
            <div
              title={`${d.label}: ${format(d.value)}`}
              style={{
                width: '100%', maxWidth: 46, height: `${Math.max(pct, 2)}%`, minHeight: 4,
                borderRadius: '8px 8px 2px 2px',
                background: `linear-gradient(180deg, ${color} 0%, ${color}40 100%)`,
                boxShadow: `0 0 18px ${color}22`,
                transition: 'height 0.4s ease',
              }}
            />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function EscrowProgress({ status }) {
  const idx = ESCROW_STEPS.findIndex(s => s.key === status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {ESCROW_STEPS.map((step, i) => {
        const active = i <= idx;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: active ? step.color : 'rgba(255,255,255,0.1)',
              transition: 'background 0.2s',
            }} title={step.label} />
            {i < ESCROW_STEPS.length - 1 && (
              <div style={{
                width: 16, height: 2,
                background: i < idx ? ESCROW_STEPS[i + 1].color : 'rgba(255,255,255,0.06)',
              }} />
            )}
          </div>
        );
      })}
      <span style={{ fontSize: 10, fontWeight: 700, color: ESCROW_STEPS[idx]?.color || '#666', marginLeft: 6, textTransform: 'capitalize' }}>
        {status}
      </span>
    </div>
  );
}
