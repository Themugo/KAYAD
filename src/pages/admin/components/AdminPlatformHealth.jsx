import { Server, Activity, Database, Radio, Clock, AlertTriangle } from 'lucide-react';

const STATUS_LABELS = {
  healthy: 'Operational', operational: 'Operational', degraded: 'Degraded',
  unavailable: 'Unavailable', disconnected: 'Disconnected', failed: 'Failed',
  error: 'Failed', unknown: 'Unknown', env_present: 'Configured only',
  not_configured: 'Not configured',
};

function statusFor(value) {
  const raw = String(value || 'unknown').toLowerCase();
  if (['healthy', 'operational', 'ok'].includes(raw)) return 'healthy';
  if (['degraded', 'unhealthy'].includes(raw)) return 'degraded';
  if (['disconnected', 'not_configured'].includes(raw)) return 'disconnected';
  if (['error', 'failed', 'unavailable', 'timeout'].includes(raw)) return 'failed';
  if (raw === 'env_present') return 'configured';
  return 'unknown';
}

function displayStatus(value) {
  const raw = String(value || 'unknown').toLowerCase();
  return STATUS_LABELS[raw] || STATUS_LABELS[statusFor(raw)] || 'Unknown';
}

export default function AdminPlatformHealth({ sysHealth, loading = false, error = '', onRetry }) {
  const checks = sysHealth?.checks && typeof sysHealth.checks === 'object' ? sysHealth.checks : {};
  const items = [
    { label: 'API / Application', value: sysHealth?.status, icon: Activity },
    { label: 'Database', value: checks.database?.status, icon: Database },
    { label: 'Redis', value: checks.redis?.status, icon: Radio },
    { label: 'Communications schema', value: checks.communications?.schema, icon: Server },
  ];
  const checkedAt = sysHealth?.timestamp ? new Date(sysHealth.timestamp) : null;
  const validTimestamp = checkedAt && !Number.isNaN(checkedAt.getTime());

  return (
    <section aria-labelledby="platform-health-title" aria-busy={loading} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Server size={14} style={{ color: 'var(--brand)' }} /> <span id="platform-health-title">Platform Health</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>Statuses reflect the latest returned health evidence. Configuration alone does not prove provider connectivity or delivery.</p>
      {loading && <p role="status" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Checking platform health…</p>}
      {error && <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#fca5a5', marginBottom: 10 }}><AlertTriangle size={14} /> <span>{error}</span></div>}
      {!loading && !sysHealth && !error && <p role="status" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Health data unavailable; status is unknown.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {items.map((item) => {
          const state = statusFor(item.value);
          const label = item.value == null ? 'Unknown' : displayStatus(item.value);
          const healthy = state === 'healthy';
          return <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><item.icon size={14} style={{ color: 'var(--text-muted)' }} /><span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.label}</span></div>
            <span style={{ fontSize: 11, fontWeight: 600, color: healthy ? 'var(--green)' : state === 'failed' || state === 'degraded' ? '#fca5a5' : 'var(--text-muted)' }}>{label}</span>
          </div>;
        })}
      </div>
      {validTimestamp && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)', marginTop: 12 }}><Clock size={12} /> Last checked: {checkedAt.toLocaleString()}</div>}
      {onRetry && <button type="button" onClick={onRetry} disabled={loading} style={{ alignSelf: 'flex-start', marginTop: 10, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 7, color: '#fff', fontSize: 11, opacity: loading ? 0.6 : 1 }}>Retry health check</button>}
    </section>
  );
}
