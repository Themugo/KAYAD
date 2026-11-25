import React from 'react';
import { fmtCompact, fmtKes, niceTicks, shortDate, type DonutSegment, type TrendBucket } from './overviewModel';

/** Hand-rolled SVG (no chart dependency). Colour is never the only carrier of meaning: every figure also exists as text. */
export const DonutChart: React.FC<{ total: number; segments: DonutSegment[]; size?: number }> = ({ total, segments, size = 148 }) => {
  const r = 52; const c = 2 * Math.PI * r; let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={`${total} vehicles. ${segments.map((s) => `${s.label} ${s.count}`).join(', ')}`} data-testid="inventory-donut" className="shrink-0">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF3F6" strokeWidth="18" />
      {segments.map((s) => {
        const len = (s.count / total) * c; const gap = segments.length > 1 ? 2 : 0;
        const el = <circle key={s.key} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="18" strokeDasharray={`${Math.max(len - gap, 0.5)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
        offset += len; return el;
      })}
      <text x="70" y="68" textAnchor="middle" className="fill-[#102B3A]" style={{ font: '800 26px Inter, system-ui, sans-serif' }}>{total}</text>
      <text x="70" y="86" textAnchor="middle" className="fill-[#5B6B7A]" style={{ font: '500 11px Inter, system-ui, sans-serif' }}>{total === 1 ? 'Vehicle' : 'Vehicles'}</text>
    </svg>
  );
};

/** Bars = vehicles sold (left axis), line = revenue in KES (right axis). */
export const SalesTrendChart: React.FC<{ trend: TrendBucket[] }> = ({ trend }) => {
  const W = 420; const H = 190; const L = 28; const R = 46; const T = 10; const B = 34;
  const iw = W - L - R; const ih = H - T - B; const n = Math.max(trend.length, 1);
  const sold = niceTicks(Math.max(...trend.map((t) => t.sold), 0), 4); const rev = niceTicks(Math.max(...trend.map((t) => t.revenue), 0), 4);
  const x = (i: number) => L + (iw / n) * (i + 0.5);
  const ys = (v: number) => T + ih - (v / sold.max) * ih; const yr = (v: number) => T + ih - (v / rev.max) * ih;
  const bw = Math.min(30, (iw / n) * 0.55);
  const points = trend.map((t, i) => `${x(i)},${yr(t.revenue)}`).join(' ');
  const summary = trend.map((t) => `${shortDate(t.end)}: ${t.sold} sold, ${fmtKes(t.revenue)}`).join('; ');
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Sales trend. ${summary}`} data-testid="sales-trend-chart">
        {sold.ticks.map((tk, i) => <g key={i}><line x1={L} x2={W - R} y1={ys(tk)} y2={ys(tk)} stroke="#EEF3F6" /><text x={L - 6} y={ys(tk) + 3} textAnchor="end" style={{ font: '500 10px Inter, sans-serif' }} className="fill-[#5B6B7A]">{tk}</text></g>)}
        {rev.ticks.map((tk, i) => <text key={i} x={W - R + 6} y={yr(tk) + 3} style={{ font: '500 10px Inter, sans-serif' }} className="fill-[#5B6B7A]">{fmtCompact(tk)}</text>)}
        {trend.map((t, i) => <rect key={t.start} x={x(i) - bw / 2} y={ys(t.sold)} width={bw} height={Math.max(ih - (ys(t.sold) - T), 0)} rx="3" fill="#0A9F78" />)}
        {trend.length > 1 && <polyline points={points} fill="none" stroke="#22A447" strokeWidth="2" />}
        {trend.map((t, i) => <circle key={`d${t.start}`} cx={x(i)} cy={yr(t.revenue)} r="3.5" fill="#fff" stroke="#22A447" strokeWidth="2" />)}
        {trend.map((t, i) => <text key={`l${t.start}`} x={x(i)} y={H - 14} textAnchor="middle" style={{ font: '500 10px Inter, sans-serif' }} className="fill-[#5B6B7A]">{shortDate(t.end)}</text>)}
      </svg>
      <div className="mt-1 flex items-center justify-center gap-5 text-xs text-[#44566A]">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-[#0A9F78]" />Vehicles sold</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[#22A447] bg-white" />Revenue (KES)</span>
      </div>
      <table className="sr-only"><caption>Sales trend data</caption><thead><tr><th>Period ending</th><th>Vehicles sold</th><th>Revenue (KES)</th></tr></thead><tbody>{trend.map((t) => <tr key={t.start}><td>{shortDate(t.end)}</td><td>{t.sold}</td><td>{t.revenue}</td></tr>)}</tbody></table>
    </div>
  );
};
