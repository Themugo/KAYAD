import { useState } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function PanicRoom() {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(null);

  const handleKillSwitch = async (type, extra = {}) => {
    const labels = { auctions: 'ALL AUCTIONS', payments: 'ALL PAYMENTS', ghost_check: 'GHOST CHECKS', full_maintenance: 'THE ENTIRE PLATFORM' };
    const confirm = window.confirm(`DANGER: This will immediately stop ${labels[type] || type}. Proceed?`);
    if (!confirm) return;
    setLoading(type);
    try {
      await adminAPI.systemKillSwitch({ type, ...extra });
      toast(`⚠️ ${labels[type] || type} DISABLED`, 'error');
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
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 800 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow" style={{ color: '#ef4444' }}>Super Admin</div>
          <h2 style={{ color: '#ef4444' }}>SYSTEM <span style={{ color: 'white' }}>COMMAND</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Immutable Webhost Override: Use only in emergencies.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', borderRadius: '2.5rem', padding: 32 }}>
            <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 8 }}>Auction Engine</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>Instantly pauses all live countdowns and prevents new bids.</p>
            <button onClick={() => handleKillSwitch('auctions')} disabled={loading === 'auctions'}
              style={{ width: '100%', padding: '16px 0', background: '#ef4444', color: 'white', fontWeight: 900, borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(239,68,68,0.2)' }}>
              {loading === 'auctions' ? '...' : 'KILL ALL AUCTIONS'}
            </button>
            <button onClick={() => handleRecover('auctions')} disabled={loading === 'recover_auctions'}
              style={{ width: '100%', padding: '8px 0', marginTop: 8, background: 'transparent', color: 'var(--text-muted)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 11 }}>
              {loading === 'recover_auctions' ? '...' : '↩ Re-enable Auctions'}
            </button>
          </div>

          <div style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', borderRadius: '2.5rem', padding: 32 }}>
            <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 8 }}>Financial Gateway</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>Disables M-Pesa STK Pushes and Bank Verification uploads.</p>
            <button onClick={() => handleKillSwitch('payments')} disabled={loading === 'payments'}
              style={{ width: '100%', padding: '16px 0', background: '#d97706', color: 'white', fontWeight: 900, borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(217,119,6,0.2)' }}>
              {loading === 'payments' ? '...' : 'FREEZE PAYMENTS'}
            </button>
            <button onClick={() => handleRecover('payments')} disabled={loading === 'recover_payments'}
              style={{ width: '100%', padding: '8px 0', marginTop: 8, background: 'transparent', color: 'var(--text-muted)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 11 }}>
              {loading === 'recover_payments' ? '...' : '↩ Re-enable Payments'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 40, border: '1px solid rgba(255,255,255,0.05)', background: '#111', borderRadius: '2.5rem', padding: 32 }}>
          <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 16 }}>Maintenance Mode (Total Blackout)</h4>
          <input placeholder="Emergency Message for Users..."
            value={msg} onChange={e => setMsg(e.target.value)}
            style={{ width: '100%', background: 'black', border: '1px solid rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, marginBottom: 16, color: 'white', fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => handleKillSwitch('full_maintenance', { message: msg })} disabled={loading === 'full_maintenance'}
              style={{ flex: 1, padding: '16px 0', border: '1px solid white', color: 'white', fontWeight: 700, borderRadius: 12, background: 'transparent', cursor: 'pointer' }}>
              {loading === 'full_maintenance' ? '...' : 'ACTIVATE GLOBAL MAINTENANCE'}
            </button>
            <button onClick={() => handleRecover('maintenance')} disabled={loading === 'recover_maintenance'}
              style={{ flex: 1, padding: '16px 0', background: 'var(--gold)', color: 'black', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer' }}>
              {loading === 'recover_maintenance' ? '...' : 'END MAINTENANCE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
