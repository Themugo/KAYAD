import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Shield, ShieldOff, Activity, DollarSign, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

const KILL_SWITCHES = [
  {
    id: 'auctions', label: 'Auction Engine', icon: Activity,
    desc: 'Pauses all live countdowns and prevents new bids.',
    killColor: '#ef4444', killBg: 'rgba(239,68,68,0.05)', killBorder: 'rgba(239,68,68,0.3)',
    killLabel: 'KILL ALL AUCTIONS', recoverLabel: 'Re-enable Auctions',
  },
  {
    id: 'payments', label: 'Financial Gateway', icon: DollarSign,
    desc: 'Disables M-Pesa STK pushes and bank verification uploads.',
    killColor: '#d97706', killBg: 'rgba(245,158,11,0.05)', killBorder: 'rgba(245,158,11,0.3)',
    killLabel: 'FREEZE PAYMENTS', recoverLabel: 'Re-enable Payments',
  },
  {
    id: 'registrations', label: 'User Registrations', icon: Shield,
    desc: 'Blocks new account creation. Existing users unaffected.',
    killColor: '#8b5cf6', killBg: 'rgba(139,92,246,0.05)', killBorder: 'rgba(139,92,246,0.3)',
    killLabel: 'BLOCK REGISTRATIONS', recoverLabel: 'Open Registrations',
  },
  {
    id: 'ghost_check', label: 'Ghost Check Detection', icon: ShieldOff,
    desc: 'Disables automated ghost account detection checks.',
    killColor: '#f97316', killBg: 'rgba(249,115,22,0.05)', killBorder: 'rgba(249,115,22,0.3)',
    killLabel: 'DISABLE GHOST CHECK', recoverLabel: 'Enable Ghost Check',
  },
  {
    id: 'escrows', label: 'Escrow Transactions', icon: Shield,
    desc: 'Pauses all escrow creation and releases.',
    killColor: '#06b6d4', killBg: 'rgba(6,182,212,0.05)', killBorder: 'rgba(6,182,212,0.3)',
    killLabel: 'FREEZE ESCROWS', recoverLabel: 'Re-enable Escrows',
  },
  {
    id: 'messaging', label: 'Messaging System', icon: WifiOff,
    desc: 'Disables chat and notification delivery.',
    killColor: '#64748b', killBg: 'rgba(100,116,139,0.05)', killBorder: 'rgba(100,116,139,0.3)',
    killLabel: 'DISABLE MESSAGING', recoverLabel: 'Enable Messaging',
  },
];

export default function PanicRoom() {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    adminAPI.systemHealth().then(d => setHealth(d.health || d)).catch(() => {});
  }, []);

  const handleKillSwitch = async (type, extra = {}) => {
    const sw = KILL_SWITCHES.find(s => s.id === type);
    const label = sw?.label || type;
    if (!window.confirm(`DANGER: This will immediately stop ${label}. Proceed?`)) return;
    setLoading(type);
    try {
      await adminAPI.systemKillSwitch({ type, ...extra });
      toast(`⚠️ ${label} DISABLED`, 'error');
    } catch { toast('Failed to execute', 'error'); }
    finally { setLoading(null); }
  };

  const handleRecover = async (type) => {
    if (!window.confirm(`Reactivate ${type}?`)) return;
    setLoading(`recover_${type}`);
    try {
      await adminAPI.systemRecover({ type });
      toast(`✅ ${type} re-enabled`, 'success');
    } catch { toast('Failed to recover', 'error'); }
    finally { setLoading(null); }
  };

  if (!isSuperAdmin) return <div className="page loading-center"><p className="text-slate-500">Access denied. Super admin only.</p></div>;

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 60px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 9999, padding: '4px 12px', marginBottom: 12 }}>
            <AlertTriangle size={12} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Super Admin</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#fff', margin: '0 0 8px' }}>
            Panic <span style={{ color: '#ef4444' }}>Room</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>System-wide emergency controls. Use only in production incidents.</p>
        </div>

        {/* System Health Banner */}
        {health && (
          <div style={{
            marginBottom: 28, padding: '14px 20px', borderRadius: 12,
            background: health.status === 'healthy' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${health.status === 'healthy' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.2)'}`,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            {health.status === 'healthy' ? <Wifi size={18} style={{ color: '#22c55e' }} /> : <WifiOff size={18} style={{ color: '#ef4444' }} />}
            <span style={{ fontWeight: 600, color: health.status === 'healthy' ? '#22c55e' : '#ef4444', fontSize: 13, textTransform: 'uppercase' }}>
              {health.status === 'healthy' ? 'System Healthy' : 'System Warning'}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {health.users} users · {health.listings} listings · {health.liveAuctions} live auctions · {health.criticalAlerts24h > 0 ? `${health.criticalAlerts24h} critical alerts (24h)` : 'no critical alerts'}
            </span>
          </div>
        )}

        {/* Kill Switch Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
          {KILL_SWITCHES.map(sw => (
            <div key={sw.id} style={{ border: `1px solid ${sw.killBorder}`, background: sw.killBg, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <sw.icon size={18} style={{ color: sw.killColor }} />
                <h4 style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{sw.label}</h4>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>{sw.desc}</p>
              <button onClick={() => handleKillSwitch(sw.id)} disabled={loading === sw.id}
                style={{ width: '100%', padding: '12px 0', background: sw.killColor, color: '#fff', fontWeight: 900, fontSize: 12, borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: `0 4px 16px ${sw.killColor}30` }}>
                {loading === sw.id ? '...' : sw.killLabel}
              </button>
              <button onClick={() => handleRecover(sw.id)} disabled={loading === `recover_${sw.id}`}
                style={{ width: '100%', padding: '8px 0', marginTop: 8, background: 'transparent', color: 'var(--text-muted)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 11 }}>
                {loading === `recover_${sw.id}` ? '...' : `↩ ${sw.recoverLabel}`}
              </button>
            </div>
          ))}
        </div>

        {/* Maintenance Mode */}
        <div style={{ border: '1px solid rgba(255,255,255,0.05)', background: '#0C0C0C', borderRadius: 16, padding: 28 }}>
          <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} style={{ color: '#f97316' }} /> Maintenance Mode (Total Blackout)
          </h4>
          <input placeholder="Emergency message for users..."
            value={msg} onChange={e => setMsg(e.target.value)}
            style={{ width: '100%', background: '#050505', border: '1px solid rgba(255,255,255,0.1)', padding: 14, borderRadius: 10, marginBottom: 16, color: '#fff', fontSize: 13, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => handleKillSwitch('full_maintenance', { message: msg })} disabled={loading === 'full_maintenance'}
              style={{ flex: 1, padding: '14px 0', border: '1px solid #fff', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 10, background: 'transparent', cursor: 'pointer' }}>
              {loading === 'full_maintenance' ? '...' : 'ACTIVATE GLOBAL MAINTENANCE'}
            </button>
            <button onClick={() => handleRecover('maintenance')} disabled={loading === 'recover_maintenance'}
              style={{ flex: 1, padding: '14px 0', background: 'var(--gold)', color: '#000', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
              {loading === 'recover_maintenance' ? '...' : 'END MAINTENANCE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
