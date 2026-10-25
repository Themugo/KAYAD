// Admin dashboard widgets for the Webhoist overview, drawn with the KAYAD admin tokens so they read on the
// light admin canvas. The marketplace/buyer dashboards keep their own dark widgets in components/features/admin.
// A missing figure is shown as "Unavailable" — never as 0.

import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value?: number | string | null;
  sub?: ReactNode;
  color?: string;
  to?: string;
  trend?: number;
  kes?: boolean;
}

const known = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function StatTile({ icon, label, value, sub, color = 'var(--admin-brand)', to, trend, kes }: StatTileProps) {
  const showTrend = known(trend) && trend !== 0;
  const numeric = known(value) ? value : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const display = typeof value === 'string' && numeric === null && value.trim() !== ''
    ? value
    : numeric === null
      ? 'Unavailable'
      : kes
        ? `KES ${numeric >= 1e6 ? `${(numeric / 1e6).toFixed(1)}M` : numeric >= 1e3 ? `${Math.round(numeric / 1e3)}K` : numeric.toLocaleString('en-KE')}`
        : numeric.toLocaleString('en-KE');
  const inner = (
    <div className="admin-stat-tile" style={{ ['--tile-accent' as string]: color }}>
      <div className="admin-stat-tile__icon" aria-hidden="true">{icon}</div>
      <div className="admin-stat-tile__label">{label}</div>
      <div className={`admin-stat-tile__value${display === 'Unavailable' ? ' is-unavailable' : ''}`}>{display}</div>
      {(sub || showTrend || to) && (
        <div className="admin-stat-tile__foot">
          {sub}
          {showTrend && <span className={trend! > 0 ? 'is-up' : 'is-down'}>{trend! > 0 ? 'Up' : 'Down'} {Math.abs(trend!)}%</span>}
          {to && !sub && !showTrend && <span className="admin-stat-tile__link">View details →</span>}
        </div>
      )}
    </div>
  );
  return to ? <Link to={to} className="admin-stat-tile-link" aria-label={`${label}: ${display}. View details`}>{inner}</Link> : inner;
}

interface MiniBarChartProps {
  data?: Array<{ label: string; value?: number | null; color?: string }>;
  color?: string;
  height?: number;
  format?: (v: number) => string;
}

export function MiniBarChart({ data = [], color = 'var(--admin-brand)', height = 150, format = (v) => String(v) }: MiniBarChartProps) {
  const max = Math.max(...data.map((d) => (known(d.value) ? d.value : 0)), 1);
  return (
    <div className="admin-bar-chart" style={{ height }} role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${known(d.value) ? format(d.value) : 'unavailable'}`).join(', ')}`}>
      {data.map((d, i) => {
        const has = known(d.value);
        const pct = has ? (d.value as number) / max * 100 : 0;
        return (
          <div className="admin-bar-chart__col" key={`${d.label}-${i}`}>
            <span className="admin-bar-chart__value">{has ? (d.value ? format(d.value as number) : '0') : 'n/a'}</span>
            <div className="admin-bar-chart__bar" title={`${d.label}: ${has ? format(d.value as number) : 'Unavailable'}`} style={{ height: `${has ? Math.max(pct, 2) : 2}%`, background: has ? (d.color || color) : 'var(--admin-border)' }} />
            <span className="admin-bar-chart__label">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface BreakdownBarsProps {
  data?: Array<{ name: string; count?: number | null; color: string }>;
  total?: number | null;
}

export function BreakdownBars({ data = [], total }: BreakdownBarsProps) {
  const sum = known(total) ? total : data.reduce((a, b) => a + (known(b.count) ? b.count : 0), 0);
  return (
    <div className="admin-breakdown">
      {data.map((d) => {
        const has = known(d.count);
        const pct = has && sum ? Math.round(((d.count as number) / sum) * 100) : 0;
        return (
          <div className="admin-breakdown__row" key={d.name}>
            <div className="admin-breakdown__head">
              <span className="admin-breakdown__name">{d.name}</span>
              <span className="admin-breakdown__meta">{has ? `${(d.count as number).toLocaleString('en-KE')} · ${pct}%` : 'Unavailable'}</span>
            </div>
            <div className="admin-breakdown__track"><div style={{ width: `${pct}%`, background: d.color }} /></div>
          </div>
        );
      })}
    </div>
  );
}
