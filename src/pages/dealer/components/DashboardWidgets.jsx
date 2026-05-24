// src/pages/dealer/components/DashboardWidgets.jsx
// Shared widgets and constants for the dealer dashboard

import { Link } from 'react-router-dom';
import { ArrowUpRight, Check } from 'lucide-react';

export const TABS_CONFIG = [
  { id: 'overview', label: 'Overview' },
  { id: 'listings', label: 'Listings' },
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
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        {to && <ArrowUpRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{value}</div>
      {(sub || showTrend) && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          {sub}
          {showTrend && <span style={{ color: isUp ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{isUp ? '↑' : '↓'}{Math.abs(trend)}%</span>}
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
