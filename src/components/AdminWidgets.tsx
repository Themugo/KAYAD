// Shared, dependency-free dashboard widgets for the admin & webhoist
// overviews. Pure presentation — matches the dark theme + mockup language.

import { Link } from 'react-router-dom';

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: React.ReactNode;
  color?: string;
  to?: string;
  trend?: number;
  kes?: boolean;
}

// Rich stat tile: icon chip + decorative corner + optional trend/footer.
export function StatTile({ icon, label, value, sub, color = 'var(--gold)', to, trend, kes }: StatTileProps) {
  const showTrend = trend !== undefined && trend !== null && trend !== 0;
  const isUp = trend > 0;
  const display = kes
    ? (Number(value) >= 1e6 ? `${(Number(value) / 1e6).toFixed(1)}M` : Number(value) >= 1e3 ? `${Math.round(Number(value) / 1e3)}K` : Number(value || 0).toLocaleString())
    : (typeof value === 'number' ? value.toLocaleString('en-KE') : (value ?? '—'));
  const inner = (
    <div
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '18px 20px', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s', height: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', background: color, opacity: 0.07 }} />
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 12, fontSize: 18 }}>
        {icon}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic', lineHeight: 1 }}>
        {kes && Number(value) ? 'KES ' : ''}{display}
      </div>
      {(sub || showTrend || to) && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 9, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {sub}
          {showTrend && <span style={{ color: isUp ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 10 }}>{isUp ? '↑' : '↓'}{Math.abs(trend)}%</span>}
          {to && !sub && !showTrend && <span style={{ color: 'var(--gold)', fontWeight: 600 }}>View details →</span>}
        </div>
      )}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

interface MiniBarChartProps {
  data?: Array<{ label: string; value: number; color?: string }>;
  color?: string;
  height?: number;
  format?: (v: number) => string;
}

// Dependency-free bar chart. data: [{ label, value }].
export function MiniBarChart({ data = [], color = 'var(--gold)', height = 150, format = (v) => String(v) }: MiniBarChartProps) {
  const max = Math.max(...data.map(d => d.value || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height, padding: '0 2px' }}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontFamily: 'var(--font-display)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
              {d.value ? format(d.value) : ''}
            </span>
            <div title={`${d.label}: ${format(d.value)}`} style={{
              width: '100%', maxWidth: 54, height: `${Math.max(pct, 2)}%`, minHeight: 4,
              borderRadius: '8px 8px 2px 2px',
              background: `linear-gradient(180deg, ${d.color || color} 0%, ${d.color || color}40 100%)`,
              boxShadow: `0 0 18px ${d.color || color}22`, transition: 'height 0.4s ease',
            }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textAlign: 'center' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface BreakdownBarsProps {
  data?: Array<{ name: string; count: number; color: string }>;
  total?: number;
}

// Horizontal breakdown bars. data: [{ name, count, color }].
export function BreakdownBars({ data = [], total }: BreakdownBarsProps) {
  const sum = total ?? data.reduce((a, b) => a + (b.count || 0), 0);
  return (
    <div>
      {data.map((d, i) => {
        const pct = sum ? Math.round((d.count / sum) * 100) : 0;
        return (
          <div key={d.name} style={{ marginBottom: i === data.length - 1 ? 0 : 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{d.name}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{(d.count || 0).toLocaleString()} · {pct}%</span>
            </div>
            <div style={{ height: 7, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 9999, background: `linear-gradient(90deg, ${d.color}, ${d.color}aa)`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
