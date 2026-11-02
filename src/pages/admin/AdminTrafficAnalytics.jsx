import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';
import { Button } from '../../components/ui';

// Real, persisted visitor analytics - aggregates only. Every number on this page comes from GET /admin/analytics/*; nothing is estimated,
// sampled or hard-coded, and a period before tracking began is labelled instead of filled in.
const RANGES = [
  { id: 'today', label: 'Today' }, { id: 'yesterday', label: 'Yesterday' }, { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' }, { id: '90d', label: 'Last 90 days' }, { id: 'custom', label: 'Custom range' },
];
const CHANNEL = { direct: 'Direct', search: 'Search engines', social: 'Social', referral: 'Referral sites', email: 'Email', campaign: 'Campaigns' };
const n = (v) => (v === null || v === undefined ? '-' : Number(v).toLocaleString());
const pct = (v) => (v === null || v === undefined ? '-' : `${v}%`);

export function LineChart({ data, series, height = 160 }) {
  const w = 640; const pad = 28;
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] || 0)));
  const x = (i) => pad + (data.length <= 1 ? 0 : (i * (w - pad * 2)) / (data.length - 1));
  const y = (v) => height - pad - (v / max) * (height - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} role="img" aria-label={series.map((s) => s.label).join(' and ') + ' by day'} style={{ width: '100%', height: 'auto' }}>
      {[0, 0.5, 1].map((t) => <g key={t}><line x1={pad} x2={w - pad} y1={y(max * t)} y2={y(max * t)} stroke="currentColor" opacity="0.12" /><text x={4} y={y(max * t) + 4} fontSize="10" fill="currentColor" opacity="0.6">{Math.round(max * t)}</text></g>)}
      {series.map((s) => (
        <g key={s.key}>
          <polyline fill="none" stroke={s.color} strokeWidth="2" points={data.map((d, i) => `${x(i)},${y(d[s.key] || 0)}`).join(' ')} />
          {data.length <= 31 && data.map((d, i) => <circle key={d.date} cx={x(i)} cy={y(d[s.key] || 0)} r="2.5" fill={s.color}><title>{`${d.date}: ${d[s.key] || 0} ${s.label}`}</title></circle>)}
        </g>
      ))}
      {data.length > 0 && <><text x={pad} y={height - 6} fontSize="10" fill="currentColor" opacity="0.6">{data[0].date}</text><text x={w - pad} y={height - 6} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.6">{data[data.length - 1].date}</text></>}
    </svg>
  );
}

const Card = ({ title, children, testId }) => (
  <section className="card" style={{ padding: 18 }} data-testid={testId}><h3 style={{ fontSize: '0.95rem', margin: '0 0 10px' }}>{title}</h3>{children}</section>
);
const Bars = ({ rows, label, value, empty = 'No data in this period.' }) => {
  const max = Math.max(1, ...rows.map((r) => r[value]));
  if (!rows.length) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{empty}</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
      {rows.map((r, i) => (
        <li key={`${label(r)}-${i}`} style={{ fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label(r)}</span><strong>{n(r[value])}</strong></div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(100,116,139,.18)' }}><div style={{ height: 6, borderRadius: 3, width: `${Math.max(2, (r[value] / max) * 100)}%`, background: '#0A7C8C' }} /></div>
        </li>
      ))}
    </ul>
  );
};
const Stat = ({ label, value, hint, change }) => (
  <div className="card" style={{ padding: 14 }} data-testid={`stat-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{value}</div>
    {change && <div style={{ fontSize: 12, color: change.changePct === null ? 'var(--text-muted)' : change.changePct >= 0 ? '#15803d' : '#b91c1c' }}>{change.changePct === null ? 'no prior data' : `${change.changePct >= 0 ? '+' : ''}${change.changePct}% vs previous period`}</div>}
    {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
  </div>
);

export default function AdminTrafficAnalytics() {
  const [range, setRange] = useState('7d');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [report, setReport] = useState(null);
  const [live, setLive] = useState(null);
  const [state, setState] = useState({ status: 'loading' });
  const [showDefs, setShowDefs] = useState(false);

  const params = range === 'custom' ? { range, from: custom.from, to: custom.to } : { range };
  const load = useCallback(async () => {
    if (range === 'custom' && (!custom.from || !custom.to)) { setState({ status: 'idle' }); return; }
    setState({ status: 'loading' });
    try { setReport(await adminAPI.trafficSummary(params)); setState({ status: 'ready' }); }
    catch (err) { setState({ status: 'error', message: err?.response?.data?.message || 'The report could not be loaded.' }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, custom.from, custom.to]);
  useEffect(() => { load(); }, [load]);

  const refreshSeconds = live?.refreshSeconds || 30;
  useEffect(() => {
    let stop = false; let t;
    const tick = async () => { try { const l = await adminAPI.trafficLive(); if (!stop) setLive(l); } catch { if (!stop) setLive((p) => p && { ...p, stale: true }); } if (!stop) t = setTimeout(tick, refreshSeconds * 1000); };
    tick();
    return () => { stop = true; clearTimeout(t); };
  }, [refreshSeconds]);

  const exportCsv = async (kind) => {
    try {
      const blob = await adminAPI.trafficExport({ ...params, kind });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `kayad-traffic-${kind}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch { setState({ status: 'error', message: 'The export could not be created.' }); }
  };

  const t = report?.totals; const cmp = report?.comparison;
  const ch = (k) => (cmp?.available ? cmp.change?.[k] : null);

  return (
    <div style={{ display: 'grid', gap: 16 }} data-testid="traffic-analytics">
      <div>
        <h2 style={{ margin: 0 }}>Traffic Analytics</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Aggregate marketplace traffic from real recorded events. No personal browsing histories or identifiers are shown. Times are Africa/Nairobi.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }} role="group" aria-label="Date range">
        {RANGES.map((r) => <Button key={r.id} variant={range === r.id ? 'primary' : 'outline'} onClick={() => setRange(r.id)} aria-pressed={range === r.id}>{r.label}</Button>)}
        {range === 'custom' && (
          <>
            <label style={{ fontSize: 13 }}>From <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></label>
            <label style={{ fontSize: 13 }}>To <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></label>
          </>
        )}
      </div>

      {state.status === 'loading' && <p role="status">Loading analytics...</p>}
      {state.status === 'error' && <div role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--admin-status-danger-bg)', color: 'var(--admin-status-danger)' }}>{state.message}</div>}
      {state.status === 'idle' && <p>Choose a start and end date.</p>}

      {report && state.status === 'ready' && (
        <>
          {report.tracking?.note && <div role="note" data-testid="tracking-note" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--admin-status-info-bg)', color: 'var(--admin-status-info)', fontSize: 13 }}>{report.tracking.note}</div>}
          {report.tracking?.begins && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }} data-testid="tracking-begins">Tracking began: {new Date(report.tracking.begins).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}. {report.tracking.truncated && 'This range was truncated at the report row limit; narrow the dates for exact figures.'}</p>}
          {cmp && !cmp.available && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }} data-testid="comparison-note">Comparison with the previous period is not shown: {cmp.reason}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }} data-testid="summary-cards">
            <Stat label="Total visits" value={n(t.totalVisits)} change={ch('totalVisits')} hint="Sessions" />
            <Stat label="Unique visitors" value={n(t.uniqueVisitors)} change={ch('uniqueVisitors')} hint="Distinct browsers" />
            <Stat label="Guest visitors" value={n(t.guestVisitors)} hint="Never signed in this period" />
            <Stat label="Registered visitors" value={n(t.registeredVisitors)} hint="Signed in at least once" />
            <Stat label="Authenticated sessions" value={n(t.authenticatedSessions)} />
            <Stat label="New registrations" value={n(t.newRegistrations)} hint="Accounts created" />
            <Stat label="Returning visitors" value={n(t.returningVisitors)} hint={`${n(t.newVisitors)} new`} />
            <Stat label="Registration conversion" value={pct(t.registrationConversionRate)} hint="Visitors who registered / unique visitors" />
            <Stat label="Page views" value={n(t.pageViews)} change={ch('pageViews')} />
            <Stat label="Auction page views" value={n(t.auctionPageViews)} hint={`${n(t.auctionPageVisitors)} visitors`} />
          </div>

          <Card title="Traffic trend" testId="trend"><LineChart data={report.daily} series={[{ key: 'visits', label: 'visits', color: '#0A7C8C' }, { key: 'uniqueVisitors', label: 'unique visitors', color: '#B45309' }]} /><Legend items={[['Visits', '#0A7C8C'], ['Unique visitors', '#B45309']]} /></Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <Card title="Guest vs registered visitors" testId="guest-vs-registered"><LineChart data={report.daily} series={[{ key: 'guestVisitors', label: 'guest', color: '#64748B' }, { key: 'registeredVisitors', label: 'registered', color: '#0A7C8C' }]} /><Legend items={[['Guest', '#64748B'], ['Registered', '#0A7C8C']]} /></Card>
            <Card title="Registration trend" testId="registration-trend"><LineChart data={report.daily} series={[{ key: 'registrations', label: 'registration events', color: '#15803d' }]} /><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>Registration events recorded from visitor sessions.</p></Card>
            <Card title="Most visited pages" testId="top-pages"><Bars rows={report.topPages} label={(r) => r.path} value="views" /></Card>
            <Card title="Most viewed vehicle listings" testId="top-listings"><Bars rows={report.topListings} label={(r) => r.title || `Listing ${String(r.listingId).slice(0, 8)}`} value="views" /></Card>
            <Card title="Traffic sources" testId="sources"><Bars rows={report.sources.channels} label={(r) => CHANNEL[r.channel] || r.channel} value="visits" />{report.sources.topHosts.length > 0 && <p style={{ fontSize: 12, margin: '8px 0 0' }}>Top referrers: {report.sources.topHosts.map((h) => `${h.host} (${h.visits})`).join(', ')}</p>}</Card>
            <Card title="Devices" testId="devices"><Bars rows={report.devices} label={(r) => r.device.charAt(0).toUpperCase() + r.device.slice(1)} value="visits" /></Card>
            <Card title="Geography (country, aggregate)" testId="geography"><Bars rows={report.geography} label={(r) => r.country} value="visits" empty="No country data. Country is only known when the CDN supplies it." /></Card>
            <Card title="Live activity" testId="live">
              {live ? (
                <>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700 }} data-testid="live-count">{n(live.activeSessions)}</div>
                  <div style={{ fontSize: 13 }}>active sessions in the last {live.windowMinutes} minutes ({n(live.guestSessions)} guest, {n(live.registeredSessions)} signed in)</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }} data-testid="live-refresh">Refreshes every {live.refreshSeconds} seconds.{live.stale ? ' Last refresh failed; showing the previous reading.' : ''}</div>
                </>
              ) : <p style={{ fontSize: 13 }}>Loading live activity...</p>}
            </Card>
          </div>

          <Card title="Export report (CSV)" testId="export">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['summary', 'daily', 'pages', 'listings', 'sources', 'devices', 'geography'].map((k) => <Button key={k} variant="outline" onClick={() => exportCsv(k)}>{k}</Button>)}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>Exports contain the same aggregates shown here and each export is recorded in the audit log.</p>
          </Card>

          <Card title="Metric definitions" testId="definitions">
            <Button variant="outline" onClick={() => setShowDefs(!showDefs)} aria-expanded={showDefs}>{showDefs ? 'Hide' : 'Show'} how each number is counted</Button>
            {showDefs && <dl style={{ fontSize: 13, marginTop: 12 }}>{Object.entries(report.definitions || {}).map(([k, v]) => <div key={k} style={{ marginBottom: 8 }}><dt style={{ fontWeight: 600 }}>{k}</dt><dd style={{ margin: 0 }}>{String(v)}</dd></div>)}</dl>}
          </Card>
        </>
      )}
    </div>
  );
}

function Legend({ items }) {
  return <div style={{ display: 'flex', gap: 14, fontSize: 12, marginTop: 4 }}>{items.map(([l, c]) => <span key={l}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: c, marginRight: 4 }} />{l}</span>)}</div>;
}
