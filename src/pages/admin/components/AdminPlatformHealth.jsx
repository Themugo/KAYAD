import { Server, Activity, Gavel, Lock, AlertTriangle } from 'lucide-react';

export default function AdminPlatformHealth({ sysHealth }) {
  const items = [
    { label: 'System Status', status: sysHealth ? (sysHealth.status === 'healthy' ? 'connected' : sysHealth.status) : '—', icon: Activity },
    { label: 'Live Auctions', status: sysHealth ? `${sysHealth.liveAuctions ?? 0}` : '—', icon: Gavel },
    { label: 'Pending Escrows', status: sysHealth ? `${sysHealth.pendingEscrows ?? 0}` : '—', icon: Lock },
    { label: 'Alerts (24h)', status: sysHealth ? `${sysHealth.criticalAlerts24h ?? 0}` : '—', icon: AlertTriangle },
  ];

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Server size={14} style={{ color: 'var(--gold)' }} /> Platform Health
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {items.map(h => {
          const healthy = h.label === 'Alerts (24h)'
            ? (Number(h.status) === 0)
            : (h.label === 'System Status' ? h.status === 'connected' : true);
          return (
            <div key={h.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h.icon size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{h.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: healthy ? 'var(--green)' : 'var(--text-muted)' }}>
                  {h.status}
                </span>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: healthy ? 'var(--green)' : 'var(--text-muted)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
