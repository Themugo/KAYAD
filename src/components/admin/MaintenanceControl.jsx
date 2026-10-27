import { useCallback, useEffect, useRef, useState } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';

// Maintenance control (Panic Room). The SERVER is the only source of truth: every state shown here was read back from
// GET /api/admin/system/maintenance/status. A click never changes what is displayed by itself; after each action the state is
// re-read, and when a request fails the page says so and shows the state the server actually holds.
// mode="owner"    : System Owner - activate / change scope / end maintenance
// mode="recovery" : explicitly authorised technical-recovery staff - status + end maintenance only (the server enforces the same)

const card = { border: '1px solid rgba(10, 51, 64, 0.05)', background: '#FFFFFF', borderRadius: 16, padding: 28, marginBottom: 20 };
const input = { width: '100%', background: '#f6faf9', border: '1px solid rgba(10, 51, 64, 0.1)', padding: 12, borderRadius: 10, color: '#0a3340', fontSize: 13, outline: 'none' };
const label = { display: 'block', fontSize: 11, fontWeight: 700, color: '#0a3340', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' };
const fmt = (iso) => { try { return iso ? new Date(iso).toLocaleString() : '—'; } catch { return '—'; } };

const errorText = (err) => {
  const d = err?.response?.data;
  if (d?.code === 'MAINTENANCE_STATE_CONFLICT') return 'The maintenance state changed since this page loaded. The current state is shown below; review it and try again.';
  if (d?.message) return d.message;
  if (err?.response?.status === 503) return 'The service or its database is unavailable right now. Nothing was changed by this request.';
  return 'The request could not be completed. Nothing is assumed to have changed; check the state shown.';
};

export default function MaintenanceControl({ mode = 'owner' }) {
  const { toast } = useToast();
  const [data, setData] = useState(null);          // last state confirmed by the server
  const [loadError, setLoadError] = useState(null); // honest reason the state is not available
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);           // 'activate' | 'recover' | null
  const [formError, setFormError] = useState('');
  const [scope, setScope] = useState('dealers');
  const [reason, setReason] = useState('');
  const [incidentRef, setIncidentRef] = useState('');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.maintenanceStatus();
      if (!alive.current) return null;
      setData(res); setLoadError(null);
      return res;
    } catch (err) {
      if (!alive.current) return null;
      const status = err?.response?.status;
      setLoadError({ status, message: status === 403 ? 'Only System Owners and explicitly authorised technical-recovery staff can use the maintenance controls.' : errorText(err) });
      return null;
    } finally { if (alive.current) setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const state = data?.state;
  const caps = data?.capabilities;
  const scopes = data?.scopes || [];
  const selected = scopes.find((s) => s.id === scope);
  const isGlobal = scope === 'global';
  const phrase = caps?.globalConfirmation || 'GLOBAL SHUTDOWN';
  const canActivate = mode === 'owner' && caps?.canActivate;

  const clearSecrets = () => { setPassword(''); setMfaCode(''); };
  const run = async (kind) => {
    setFormError('');
    if (kind === 'activate') {
      if (reason.trim().length < 8) return setFormError('State the reason for this maintenance (at least 8 characters).');
      if (isGlobal && confirmation !== phrase) return setFormError(`Type ${phrase} exactly to confirm a global shutdown.`);
    } else if (mode === 'recovery' && reason.trim().length < 8) return setFormError('State why maintenance is being ended (at least 8 characters).');
    if (!password) return setFormError('Re-enter your password to confirm this change.');
    setBusy(kind);
    const common = { reason: reason.trim(), incidentRef: incidentRef.trim(), password, mfaCode: mfaCode.trim() || undefined, expectedVersion: state?.version };
    try {
      const out = kind === 'activate'
        ? await adminAPI.maintenanceActivate({ ...common, scope, message: message.trim() || undefined, confirmation: isGlobal ? confirmation : undefined })
        : await adminAPI.maintenanceRecover(common);
      clearSecrets(); setConfirmation('');
      const fresh = await refresh(); // display what the server holds now, not what we hoped for
      const confirmed = kind === 'activate' ? fresh?.state?.active && fresh?.state?.scope === scope : fresh && fresh.state.active === false;
      if (!fresh) toast('The request was accepted but the state could not be re-read. Press Refresh before relying on it.', 'error');
      else if (!confirmed) toast('The server reports a different state than requested. Review the status shown.', 'error');
      else toast(out?.changed === false ? 'Already in that state — nothing changed.' : kind === 'activate' ? 'Maintenance state confirmed by the server.' : 'Maintenance ended — confirmed by the server.', 'success');
    } catch (err) {
      setFormError(errorText(err));
      if (err?.response?.data?.state) setData((prev) => (prev ? { ...prev, state: err.response.data.state } : prev));
      else await refresh();
    } finally { if (alive.current) setBusy(null); }
  };

  return (
    <section aria-labelledby="maint-h" style={card}>
      <h4 id="maint-h" style={{ color: '#0a3340', fontWeight: 700, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={16} style={{ color: '#176b87' }} /> Maintenance control
      </h4>
      <p style={{ fontSize: 12, color: 'var(--admin-muted-content)', margin: '0 0 16px' }}>
        {mode === 'recovery' ? 'Authorised technical recovery: you can see the maintenance state and end it. You cannot start or change maintenance.' : 'Choose exactly who is affected. System Owners and authorised technical-recovery staff can always sign in to end maintenance.'}
      </p>

      {/* server-confirmed status */}
      <div role="status" aria-live="polite" style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, border: `1px solid ${state?.active ? 'rgba(185,28,28,0.35)' : 'rgba(10,51,64,0.12)'}`, background: state?.active ? 'rgba(185,28,28,0.06)' : '#f6faf9' }}>
        {loading && !data && <span style={{ fontSize: 13 }}>Reading the maintenance state from the server…</span>}
        {loadError && (
          <div role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>
            <strong>Maintenance state unavailable{loadError.status ? ` (error ${loadError.status})` : ''}.</strong> {loadError.message} The state is NOT assumed.
            {data ? ' The last confirmed state below may be out of date.' : ''}
          </div>
        )}
        {state && (
          <div style={{ fontSize: 13, color: '#0a3340' }}>
            <div style={{ fontWeight: 800, letterSpacing: '0.04em', color: state.active ? '#b91c1c' : '#0F766E' }}>
              {state.active ? `MAINTENANCE ACTIVE — ${state.scopeLabel}` : 'MAINTENANCE NOT ACTIVE'}
            </div>
            {state.active && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Affects: {state.affects.join(', ')}</li>
                {state.unaffected?.length > 0 && <li>Not affected: {state.unaffected.join(', ')}</li>}
                <li>Reason: {state.reason || '—'}{state.incidentRef ? ` (${state.incidentRef})` : ''}</li>
                <li>Started by {state.operatorName || 'unknown operator'}{state.operatorRole ? ` (${state.operatorRole.replace('_', ' ')})` : ''} at {fmt(state.activatedAt)}; last change {fmt(state.updatedAt)}</li>
                <li>Message shown to affected users: “{state.message}”</li>
              </ul>
            )}
            {!state.active && state.lastRecovery && (
              <div style={{ marginTop: 6 }}>Last ended by {state.lastRecovery.by || 'unknown'} at {fmt(state.lastRecovery.at)}{state.lastRecovery.reason ? ` — ${state.lastRecovery.reason}` : ''}</div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--admin-muted-content)' }}>
              Confirmed by the server · version {state.version} · operator on this page: {data.operator?.name} · {fmt(data.operator?.at)}
              <button type="button" onClick={refresh} disabled={loading || !!busy} aria-label="Refresh maintenance state" style={{ marginLeft: 10, border: '1px solid rgba(10,51,64,0.15)', background: 'transparent', borderRadius: 8, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}>
                <RefreshCw size={11} aria-hidden="true" style={{ verticalAlign: '-1px' }} /> Refresh
              </button>
            </div>
          </div>
        )}
        {loadError && !data && (
          <button type="button" onClick={refresh} style={{ marginTop: 10, border: '1px solid rgba(10,51,64,0.15)', background: 'transparent', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>Try again</button>
        )}
      </div>

      {formError && <div role="alert" style={{ color: '#b91c1c', fontSize: 13, marginBottom: 14 }}>{formError}</div>}

      {canActivate && (
        <fieldset disabled={!!busy} style={{ border: 'none', padding: 0, margin: '0 0 24px' }}>
          <legend style={{ ...label, marginBottom: 10 }}>{state?.active ? 'Change maintenance scope' : 'Start maintenance'}</legend>
          <div role="radiogroup" aria-label="Maintenance scope" style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
            {scopes.map((s) => (
              <label key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${scope === s.id ? (s.id === 'global' ? '#b91c1c' : '#176b87') : 'rgba(10,51,64,0.1)'}`, background: scope === s.id ? (s.id === 'global' ? 'rgba(185,28,28,0.05)' : 'rgba(23,107,135,0.05)') : 'transparent' }}>
                <input type="radio" name="maint-scope" value={s.id} checked={scope === s.id} onChange={() => setScope(s.id)} style={{ marginTop: 3 }} />
                <span style={{ fontSize: 13, color: '#0a3340' }}>
                  <strong style={{ color: s.id === 'global' ? '#b91c1c' : '#0a3340' }}>{s.label}{s.id === 'global' ? ' — genuine platform-wide emergency only' : ''}</strong>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--admin-muted-content)', lineHeight: 1.45 }}>{s.summary}</span>
                </span>
              </label>
            ))}
          </div>

          {selected && (
            <div aria-label="Impact preview" style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 10, background: isGlobal ? 'rgba(185,28,28,0.06)' : '#f6faf9', border: `1px solid ${isGlobal ? 'rgba(185,28,28,0.3)' : 'rgba(10,51,64,0.08)'}`, fontSize: 12, color: '#0a3340' }}>
              <strong>Impact if activated now</strong>
              <div style={{ marginTop: 4 }}>Refused: {selected.affects.join(' · ')}</div>
              {selected.unaffected?.length > 0 && <div>Unaffected: {selected.unaffected.join(' · ')}</div>}
              {isGlobal && <div style={{ marginTop: 6, fontWeight: 700, color: '#b91c1c' }}>Everyone, including visitors and all staff, is refused. Only System Owners and authorised technical-recovery staff can sign in, and only to end maintenance.</div>}
            </div>
          )}

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label} htmlFor="maint-reason">Reason (required)</label>
              <input id="maint-reason" style={input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Why is this needed? e.g. database failover" />
            </div>
            <div>
              <label style={label} htmlFor="maint-incident">Incident reference</label>
              <input id="maint-incident" style={input} value={incidentRef} onChange={(e) => setIncidentRef(e.target.value)} maxLength={64} placeholder="e.g. INC-1042" />
            </div>
            <div>
              <label style={label} htmlFor="maint-message">Message shown to affected users</label>
              <input id="maint-message" style={input} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} placeholder="Leave empty for the default wording" />
            </div>
            {isGlobal && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...label, color: '#b91c1c' }} htmlFor="maint-confirm">Type {phrase} to confirm</label>
                <input id="maint-confirm" style={{ ...input, borderColor: 'rgba(185,28,28,0.4)' }} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" />
              </div>
            )}
          </div>
        </fieldset>
      )}

      {(canActivate || mode === 'recovery') && (
        <fieldset disabled={!!busy} style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ ...label, marginBottom: 10 }}><ShieldCheck size={12} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> Confirm as {data?.operator?.name || 'operator'}</legend>
          {mode === 'recovery' && (
            <div style={{ marginBottom: 12 }}>
              <label style={label} htmlFor="maint-rec-reason">Why is maintenance being ended? (required)</label>
              <input id="maint-rec-reason" style={input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
            </div>
          )}
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 14 }}>
            <div>
              <label style={label} htmlFor="maint-pw">Your password</label>
              <input id="maint-pw" type="password" autoComplete="current-password" style={input} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {mode === 'owner' && (
              <div>
                <label style={label} htmlFor="maint-mfa">Authenticator or recovery code (if enabled)</label>
                <input id="maint-mfa" inputMode="text" autoComplete="one-time-code" style={input} value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {canActivate && (
              <button type="button" onClick={() => run('activate')} disabled={!!busy || !data}
                style={{ flex: 1, minWidth: 220, padding: '14px 0', border: `1px solid ${isGlobal ? '#b91c1c' : 'rgba(10, 51, 64, 0.15)'}`, color: isGlobal ? '#FFFFFF' : '#0a3340', background: isGlobal ? '#b91c1c' : 'transparent', fontWeight: 700, fontSize: 13, borderRadius: 10, cursor: 'pointer' }}>
                {busy === 'activate' ? 'Applying — waiting for the server…' : isGlobal ? 'ACTIVATE GLOBAL SHUTDOWN' : state?.active ? 'APPLY NEW SCOPE' : 'ACTIVATE SELECTED MAINTENANCE'}
              </button>
            )}
            <button type="button" onClick={() => run('recover')} disabled={!!busy || !data}
              style={{ flex: 1, minWidth: 220, padding: '14px 0', background: '#13B8A6', color: '#0a3340', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
              {busy === 'recover' ? 'Applying — waiting for the server…' : 'END MAINTENANCE'}
            </button>
          </div>
        </fieldset>
      )}
    </section>
  );
}
