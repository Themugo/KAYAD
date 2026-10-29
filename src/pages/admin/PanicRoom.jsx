import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Shield, ShieldOff, Activity, DollarSign, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import MaintenanceControl from '../../components/admin/MaintenanceControl';

const KILL_SWITCHES = [
  {
    id: 'auctions', apiType: 'auctions', stateKey: 'auctions', supported: true, label: 'Auction Bid Gate', icon: Activity,
    desc: 'Blocks bid API requests while disabled. Existing auction countdowns are not paused by this switch.',
    killColor: '#b91c1c', killBg: 'rgba(185,28,28,0.05)', killBorder: 'rgba(185,28,28,0.3)',
    killLabel: 'BLOCK NEW BIDS', recoverLabel: 'Re-enable Bidding',
  },
  {
    id: 'payments', apiType: 'payments', stateKey: 'payments', supported: true, label: 'Financial Gateway', icon: DollarSign,
    desc: 'Blocks API requests whose route contains /payment. Other payment and verification routes require separate enforcement verification.',
    killColor: '#12576d', killBg: 'rgba(23, 107, 135, 0.05)', killBorder: 'rgba(23, 107, 135, 0.3)',
    killLabel: 'FREEZE PAYMENTS', recoverLabel: 'Re-enable Payments',
  },
  {
    id: 'registrations', supported: false, label: 'User Registrations', icon: Shield,
    desc: 'Blocks new account creation. Existing users unaffected.',
    killColor: '#0E7490', killBg: 'rgba(139,92,246,0.05)', killBorder: 'rgba(139,92,246,0.3)',
    killLabel: 'BLOCK REGISTRATIONS', recoverLabel: 'Open Registrations',
  },
  {
    id: 'inspection', supported: false, label: 'Pre-Inspection Detection', icon: ShieldOff,
    desc: 'A persisted legacy flag exists, but no complete request-enforcement path was found for this switch.',
    killColor: '#176b87', killBg: 'rgba(19, 184, 166, 0.05)', killBorder: 'rgba(19, 184, 166, 0.3)',
    killLabel: 'DISABLE PRE-INSPECTION', recoverLabel: 'Enable Pre-Inspection',
  },
  {
    id: 'escrows', supported: false, label: 'Escrow Transactions', icon: Shield,
    desc: 'Pauses all escrow creation and releases.',
    killColor: '#0F766E', killBg: 'rgba(19,184,166,0.05)', killBorder: 'rgba(19,184,166,0.3)',
    killLabel: 'FREEZE ESCROWS', recoverLabel: 'Re-enable Escrows',
  },
  {
    id: 'messaging', supported: false, label: 'Messaging System', icon: WifiOff,
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
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [switchState, setSwitchState] = useState(null);
  const [switchLoading, setSwitchLoading] = useState(true);
  const [switchError, setSwitchError] = useState('');

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const d = await adminAPI.systemHealth();
      const next = d?.health && typeof d.health === 'object' ? d.health : d;
      if (!next || typeof next !== 'object' || typeof next.status !== 'string') throw new Error('Unexpected health response');
      setHealth(next);
      setHealthError('');
    } catch {
      setHealthError('System health could not be checked. The current service state is unknown.');
    } finally { setHealthLoading(false); }
  }, []);

  const refreshSwitches = useCallback(async () => {
    setSwitchLoading(true);
    try {
      const d = await adminAPI.maintenanceStatus();
      const features = d?.state?.featureSwitches;
      if (!features || typeof features !== 'object' || typeof features.auctions !== 'boolean' || typeof features.payments !== 'boolean' || typeof features.ghostCheck !== 'boolean') {
        throw new Error('Unexpected feature-switch response');
      }
      setSwitchState(features);
      setSwitchError('');
      return features;
    } catch (err) {
      setSwitchError(err?.response?.status === 403
        ? 'Feature-switch state is restricted to the System Owner control plane. No state is assumed.'
        : 'Feature-switch state could not be verified. No state is assumed.');
      return null;
    } finally { setSwitchLoading(false); }
  }, []);

  const refreshAll = useCallback(async () => { await Promise.all([refreshHealth(), refreshSwitches()]); }, [refreshHealth, refreshSwitches]);
  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Only switches enforced by the existing backend are actionable here. Other cards stay visible as explicit gaps,
  // rather than presenting buttons that the server rejects or that do not stop the claimed operation.
  const handleKillSwitch = async (type) => {
    const sw = KILL_SWITCHES.find(s => s.id === type);
    if (!sw?.supported || !sw.apiType || !switchState) return;
    const label = sw.label;
    if (!window.confirm(`DANGER: This will immediately stop ${label}. Proceed?`)) return;
    setLoading(type);
    try {
      await adminAPI.systemKillSwitch({ type: sw.apiType });
      const fresh = await refreshSwitches();
      const key = sw.stateKey;
      // Do not report success unless the canonical server state was read back and confirms the change.
      if (!fresh || fresh[key] !== false) {
        toast(`${label}: request sent; verify the server state before relying on it.`, 'error');
      } else toast(`${label} disabled — confirmed by server state.`, 'error');
    } catch { toast(`Could not disable ${label}. Check the server state and retry.`, 'error'); }
    finally { setLoading(null); }
  };

  const handleRecover = async (type) => {
    const sw = KILL_SWITCHES.find(s => s.id === type);
    if (!sw?.supported || !sw.apiType || !switchState) return;
    if (!window.confirm(`Reactivate ${sw.label}?`)) return;
    setLoading(`recover_${type}`);
    try {
      await adminAPI.systemRecover({ type: sw.apiType });
      const fresh = await refreshSwitches();
      if (fresh?.[sw.stateKey] === true) toast(`${sw.label} re-enabled — confirmed by server state.`, 'success');
      else toast(`${sw.label}: request sent, but the active state could not be confirmed.`, 'error');
    } catch { toast(`Could not recover ${sw.label}. Check the server state and retry.`, 'error'); }
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
          <p style={{ color: 'var(--admin-muted-content)', fontSize: 13 }}>System-wide emergency controls. Use only in production incidents. Only server-enforced controls can be activated here.</p>
          <button type="button" onClick={refreshAll} disabled={healthLoading || switchLoading || !!loading} style={{ marginTop: 12, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(10,51,64,0.16)', background: '#fff', color: '#0a3340', cursor: 'pointer' }}><Activity size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />{healthLoading || switchLoading ? 'Refreshing…' : 'Refresh all status'}</button>
        </div>

        {/* System Health Banner */}
        {healthError && <div role="alert" style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: 'rgba(185,28,28,0.06)', color: '#b91c1c', fontSize: 13 }}>{healthError} <button type="button" onClick={refreshHealth} disabled={healthLoading} style={{ marginLeft: 8, textDecoration: 'underline' }}>{healthLoading ? 'Checking…' : 'Retry health check'}</button></div>}
        {!health && !healthError && <div role="status" style={{ marginBottom: 14, fontSize: 13, color: 'var(--admin-muted-content)' }}>Checking system health…</div>}
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

        {switchError && <div role="alert" style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: 'rgba(185,28,28,0.06)', color: '#b91c1c', fontSize: 13 }}>{switchError} <button type="button" onClick={refreshSwitches} disabled={switchLoading} style={{ marginLeft: 8, textDecoration: 'underline' }}>{switchLoading ? 'Checking…' : 'Retry switch status'}</button></div>}

        {/* Kill Switch Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
          {KILL_SWITCHES.map(sw => (
            <div key={sw.id} style={{ border: `1px solid ${sw.killBorder}`, background: sw.killBg, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <sw.icon size={18} style={{ color: sw.killColor }} />
                <h4 style={{ color: '#0a3340', fontWeight: 700, fontSize: 14, margin: 0 }}>{sw.label}</h4>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>{sw.desc}</p>
              {sw.supported ? (
                <>
                  <div role="status" style={{ fontSize: 11, marginBottom: 10, color: switchLoading ? '#64748b' : switchError ? '#b91c1c' : switchState?.[sw.stateKey] ? '#0f766e' : '#b91c1c', fontWeight: 700 }}>
                    {switchLoading ? 'Checking server state…' : switchError ? 'STATE UNKNOWN' : switchState?.[sw.stateKey] ? 'ENABLED' : 'DISABLED'}
                  </div>
                  <button onClick={() => handleKillSwitch(sw.id)} disabled={!!loading || switchLoading || !!switchError || !switchState || switchState[sw.stateKey] === false}
                    style={{ width: '100%', padding: '12px 0', background: sw.killColor, color: '#FFFFFF', fontWeight: 900, fontSize: 12, borderRadius: 10, border: 'none', cursor: 'pointer', opacity: switchLoading || switchError || switchState?.[sw.stateKey] === false ? 0.55 : 1, boxShadow: `0 4px 16px ${sw.killColor}30` }}>
                    {loading === sw.id ? 'Applying…' : sw.killLabel}
                  </button>
                  <button onClick={() => handleRecover(sw.id)} disabled={!!loading || switchLoading || !!switchError || !switchState || switchState[sw.stateKey] === true}
                    style={{ width: '100%', padding: '8px 0', marginTop: 8, background: 'transparent', color: 'var(--text-muted)', borderRadius: 8, border: '1px solid rgba(10, 51, 64, 0.1)', cursor: 'pointer', fontSize: 11, opacity: switchLoading || switchError || switchState?.[sw.stateKey] === true ? 0.55 : 1 }}>
                    {loading === `recover_${sw.id}` ? 'Recovering…' : `↩ ${sw.recoverLabel}`}
                  </button>
                </>
              ) : (
                <div style={{ padding: 12, borderRadius: 9, background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.16)', color: '#475569', fontSize: 12 }}>
                  <strong>Not connected to an enforceable kill switch.</strong><br />No action button is shown because the backend does not currently enforce this control end to end.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Maintenance control: scope selection, impact preview, reason, step-up, server-confirmed state */}
        <MaintenanceControl mode="owner" />
      </div>
    </div>
  );
}
