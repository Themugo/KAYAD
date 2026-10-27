import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Shield, ShieldOff, Activity, DollarSign, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import MaintenanceControl from '../../components/admin/MaintenanceControl';

const KILL_SWITCHES = [
  {
    id: 'auctions', label: 'Auction Engine', icon: Activity,
    desc: 'Pauses all live countdowns and prevents new bids.',
    killColor: '#b91c1c', killBg: 'rgba(185,28,28,0.05)', killBorder: 'rgba(185,28,28,0.3)',
    killLabel: 'KILL ALL AUCTIONS', recoverLabel: 'Re-enable Auctions',
  },
  {
    id: 'payments', label: 'Financial Gateway', icon: DollarSign,
    desc: 'Disables M-Pesa STK pushes and bank verification uploads.',
    killColor: '#12576d', killBg: 'rgba(23, 107, 135, 0.05)', killBorder: 'rgba(23, 107, 135, 0.3)',
    killLabel: 'FREEZE PAYMENTS', recoverLabel: 'Re-enable Payments',
  },
  {
    id: 'registrations', label: 'User Registrations', icon: Shield,
    desc: 'Blocks new account creation. Existing users unaffected.',
    killColor: '#0E7490', killBg: 'rgba(139,92,246,0.05)', killBorder: 'rgba(139,92,246,0.3)',
    killLabel: 'BLOCK REGISTRATIONS', recoverLabel: 'Open Registrations',
  },
  {
    id: 'inspection', label: 'Pre-Inspection Detection', icon: ShieldOff,
    desc: 'Disables automated inspection account detection checks.',
    killColor: '#176b87', killBg: 'rgba(19, 184, 166, 0.05)', killBorder: 'rgba(19, 184, 166, 0.3)',
    killLabel: 'DISABLE PRE-INSPECTION', recoverLabel: 'Enable Pre-Inspection',
  },
  {
    id: 'escrows', label: 'Escrow Transactions', icon: Shield,
    desc: 'Pauses all escrow creation and releases.',
    killColor: '#0F766E', killBg: 'rgba(19,184,166,0.05)', killBorder: 'rgba(19,184,166,0.3)',
    killLabel: 'FREEZE ESCROWS', recoverLabel: 'Re-enable Escrows',
  },
  {
    id: 'messaging', label: 'Messaging System', icon: WifiOff,
    desc: 'Disables chat and notification delivery.',
    killColor: '#475569', killBg: 'rgba(71,85,105,0.05)', killBorder: 'rgba(71,85,105,0.3)',
    killLabel: 'DISABLE MESSAGING', recoverLabel: 'Enable Messaging',
  },
];

export default function PanicRoom() {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    adminAPI.systemHealth().then(d => setHealth(d.health || d)).catch(() => {});
  }, []);

  // Feature kill-switches only. Maintenance (global or scoped) has its own server-confirmed control below; the legacy endpoint refuses it.
  const handleKillSwitch = async (type) => {
    const sw = KILL_SWITCHES.find(s => s.id === type);
    const label = sw?.label || type;
    if (!window.confirm(`DANGER: This will immediately stop ${label}. Proceed?`)) return;
    setLoading(type);
    try {
      await adminAPI.systemKillSwitch({ type });
      toast(`${label} DISABLED`, 'error');
    } catch { toast('Failed to execute', 'error'); }
    finally { setLoading(null); }
  };

  const handleRecover = async (type) => {
    if (!window.confirm(`Reactivate ${type}?`)) return;
    setLoading(`recover_${type}`);
    try {
      await adminAPI.systemRecover({ type });
      toast(`${type} re-enabled`, 'success');
    } catch { toast('Failed to recover', 'error'); }
    finally { setLoading(null); }
  };

  if (!isSuperAdmin) return <div className="page loading-center"><p className="text-[#64748B]">Access denied. Super admin only.</p></div>;

  return (
    <div style={{ background: '#f6faf9', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 60px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.15)', borderRadius: 9999, padding: '4px 12px', marginBottom: 12 }}>
            <AlertTriangle size={12} style={{ color: '#b91c1c' }} />
            <span style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Super Admin</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#0a3340', margin: '0 0 8px' }}>
            Panic <span style={{ color: '#b91c1c' }}>Room</span>
          </h1>
          <p style={{ color: 'var(--admin-muted-content)', fontSize: 13 }}>System-wide emergency controls. Use only in production incidents.</p>
        </div>

        {/* System Health Banner */}
        {health && (() => {
          // Only a status the health source actually states is reported; anything else is "unknown", never "healthy" or "warning".
          const raw = typeof health.status === 'string' ? health.status.toLowerCase() : '';
          const tone = raw === 'healthy' ? 'success' : ['degraded', 'warning', 'critical', 'down', 'unhealthy'].includes(raw) ? 'danger' : 'neutral';
          const label = tone === 'success' ? 'System Healthy' : tone === 'danger' ? 'System Warning' : raw === 'no_critical_alerts' ? 'No critical alerts (provider and queue health not checked here)' : 'System status unknown';
          const count = (v, noun) => (typeof v === 'number' && Number.isFinite(v) ? `${v} ${noun}` : `${noun} unavailable`);
          const alerts = typeof health.criticalAlerts24h === 'number' && Number.isFinite(health.criticalAlerts24h)
            ? (health.criticalAlerts24h > 0 ? `${health.criticalAlerts24h} critical alerts (24h)` : 'no critical alerts (24h)')
            : 'critical alerts unavailable';
          return (
            <div role="status" style={{
              marginBottom: 28, padding: '14px 20px', borderRadius: 12,
              background: `var(--admin-status-${tone}-bg)`, border: `1px solid var(--admin-status-${tone}-border)`,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              {tone === 'success' ? <Wifi size={18} aria-hidden="true" style={{ color: 'var(--admin-status-success)' }} /> : <WifiOff size={18} aria-hidden="true" style={{ color: `var(--admin-status-${tone})` }} />}
              <span style={{ fontWeight: 600, color: `var(--admin-status-${tone})`, fontSize: 13, textTransform: 'uppercase' }}>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--admin-muted-content)' }}>
                {count(health.users, 'users')} · {count(health.listings, 'listings')} · {count(health.liveAuctions, 'live auctions')} · {alerts}
              </span>
            </div>
          );
        })()}

        {/* Kill Switch Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
          {KILL_SWITCHES.map(sw => (
            <div key={sw.id} style={{ border: `1px solid ${sw.killBorder}`, background: sw.killBg, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <sw.icon size={18} style={{ color: sw.killColor }} />
                <h4 style={{ color: '#0a3340', fontWeight: 700, fontSize: 14, margin: 0 }}>{sw.label}</h4>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>{sw.desc}</p>
              <button onClick={() => handleKillSwitch(sw.id)} disabled={loading === sw.id}
                style={{ width: '100%', padding: '12px 0', background: sw.killColor, color: '#FFFFFF', fontWeight: 900, fontSize: 12, borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: `0 4px 16px ${sw.killColor}30` }}>
                {loading === sw.id ? '...' : sw.killLabel}
              </button>
              <button onClick={() => handleRecover(sw.id)} disabled={loading === `recover_${sw.id}`}
                style={{ width: '100%', padding: '8px 0', marginTop: 8, background: 'transparent', color: 'var(--text-muted)', borderRadius: 8, border: '1px solid rgba(10, 51, 64, 0.1)', cursor: 'pointer', fontSize: 11 }}>
                {loading === `recover_${sw.id}` ? '...' : `↩ ${sw.recoverLabel}`}
              </button>
            </div>
          ))}
        </div>

        {/* Maintenance control: scope selection, impact preview, reason, step-up, server-confirmed state */}
        <MaintenanceControl mode="owner" />
      </div>
    </div>
  );
}
