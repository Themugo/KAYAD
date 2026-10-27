import { useState, useEffect, useCallback, useRef } from 'react';
import { ownerAPI } from '../../api/api';
import { Button } from '../../components/ui';

// STAGE 5B — Owner management. The server decides everything; this page shows what it reports and never displays
// tokens or secrets (the server never returns any). Every change asks for the owner's password again (step-up)
// and a typed confirmation of the address, so a stolen open session or a mis-click cannot change ownership.
const ACTIONS = {
  invite: { title: 'Invite an owner', cta: 'Send invitation', needsReason: false },
  resend: { title: 'Resend invitation', cta: 'Resend', needsReason: false },
  revokeInvitation: { title: 'Revoke invitation', cta: 'Revoke invitation', needsReason: true, danger: true },
  remove: { title: 'Remove owner', cta: 'Remove owner', needsReason: true, danger: true },
  recover: { title: 'Recover owner (out-of-band verified)', cta: 'Start recovery', needsRecovery: true },
};
const VERIFIED_VIA = { in_person: 'In person', video_call: 'Video call', phone_call_known_number: 'Phone call to a known number', other_documented: 'Other (documented below)' };
const BOX = { padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 };
const fmt = (v) => (v ? new Date(v).toLocaleString() : '—');
const input = { width: '100%', maxWidth: 420, padding: '10px 12px', fontSize: 14, border: '1px solid #94A3B8', borderRadius: 8, background: '#fff' };

function ActionDialog({ action, target, onCancel, onDone, mfaEnrolled }) {
  const cfg = ACTIONS[action];
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [via, setVia] = useState('in_person');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const formRef = useRef(null);
  // Phase 16C keyboard access: opening the inline form moves focus to its first field (so a keyboard or screen-reader user lands in it
  // instead of tabbing through the page) and Escape cancels it without submitting anything.
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    el.querySelector('input:not([type=hidden]), select, textarea')?.focus();
    el.scrollIntoView?.({ block: 'nearest' });
  }, []);
  const addr = action === 'invite' ? email : target.email;
  const confirmOk = confirmEmail.trim().toLowerCase() === String(addr || '').trim().toLowerCase() && !!addr;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const base = { confirmEmail, password, ...(mfaCode.trim() ? { mfaCode: mfaCode.trim() } : {}) };
      let res;
      if (action === 'invite') res = await ownerAPI.invite({ email, ...base, note });
      else if (action === 'resend') res = await ownerAPI.resend(target.id, base);
      else if (action === 'revokeInvitation') res = await ownerAPI.revokeInvitation(target.id, { ...base, reason });
      else if (action === 'remove') res = await ownerAPI.removeMember(target.userId, { ...base, reason });
      else res = await ownerAPI.recover(target.userId, { ...base, verifiedVia: via, note });
      setPassword(''); setMfaCode('');
      onDone(res, action);
    } catch (err) {
      setPassword(''); setMfaCode('');
      const d = err?.response?.data || {};
      setError(d.message || 'The change was not made.');
    } finally { setBusy(false); }
  };
  return (
    <form ref={formRef} onKeyDown={(e) => { if (e.key === 'Escape' && !busy) { e.stopPropagation(); onCancel(); } }} onSubmit={submit} aria-label={cfg.title} className="card" style={{ padding: 20, border: '2px solid #94A3B8', marginBottom: 16 }}>
      <h4 style={{ marginBottom: 8 }}>{cfg.title}</h4>
      {action === 'invite' ? (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="own-email" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Email address of the new owner</label>
          <input id="own-email" type="email" autoComplete="off" style={input} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      ) : (
        <p style={{ fontSize: 13, marginBottom: 12 }}>Applies to <strong>{target.email}</strong></p>
      )}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="own-confirm" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Type the address again to confirm</label>
        <input id="own-confirm" type="email" autoComplete="off" style={input} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} required />
      </div>
      {cfg.needsReason && (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="own-reason" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Reason (kept in the audit record)</label>
          <input id="own-reason" style={input} value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} required />
        </div>
      )}
      {cfg.needsRecovery && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="own-via" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>How was the person's identity verified outside this system?</label>
            <select id="own-via" style={input} value={via} onChange={(e) => setVia(e.target.value)}>{Object.entries(VERIFIED_VIA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="own-note" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>What was checked (at least 10 characters)</label>
            <input id="own-note" style={input} value={note} onChange={(e) => setNote(e.target.value)} minLength={10} required />
          </div>
        </>
      )}
      {action === 'invite' && (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="own-note2" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Note (optional, audit only)</label>
          <input id="own-note2" style={input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="own-pw" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Your password (to confirm it is really you)</label>
        <input id="own-pw" type="password" autoComplete="current-password" style={input} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {mfaEnrolled && (
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="own-mfa" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Authenticator code (or a recovery code)</label>
            <input id="own-mfa" type="text" inputMode="text" autoComplete="one-time-code" style={input} value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required />
          </div>
        )}
      {error && <div role="alert" style={{ ...BOX, background: 'var(--admin-status-danger-bg)', border: '1px solid var(--admin-status-danger-border)', color: 'var(--admin-status-danger)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button type="submit" variant={cfg.danger ? 'danger' : 'primary'} disabled={busy || !confirmOk || !password || (mfaEnrolled && !mfaCode.trim())}>{busy ? 'Working…' : cfg.cta}</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}


// PHASE 16 - the owner's own authenticator. Secrets are shown once, never stored in the browser; nothing here is trusted without the server.
function MfaPanel({ mfa, onChanged }) {
  const [step, setStep] = useState('idle'); // idle | password | scan | codes
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [enroll, setEnroll] = useState(null);
  const [codes, setCodes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fail = (err) => setError(err?.response?.data?.message || 'That did not work.');
  if (!mfa) return null;
  if (mfa.installed === false) return <div role="status" style={{ ...BOX, background: 'var(--admin-status-info-bg)', border: '1px solid var(--admin-status-info-border)', color: 'var(--admin-status-info)' }}>Two-factor sign-in needs the Phase 16 database migration, which has not been applied here. Nothing has been changed.</div>;
  if (mfa.keyConfigured === false) return <div role="alert" style={{ ...BOX, background: 'var(--admin-status-danger-bg)', border: '1px solid var(--admin-status-danger-border)', color: 'var(--admin-status-danger)' }}>Two-factor sign-in is not configured on this server (the encryption key is missing), so it cannot be turned on.</div>;
  const start = async (e) => { e.preventDefault(); setBusy(true); setError(null); try { const r = await ownerAPI.mfaEnroll({ password }); setEnroll(r); setStep('scan'); } catch (err) { fail(err); } finally { setPassword(''); setBusy(false); } };
  const activate = async (e) => { e.preventDefault(); setBusy(true); setError(null); try { const r = await ownerAPI.mfaActivate({ code: code.trim() }); setCodes(r.recoveryCodes || []); setEnroll(null); setCode(''); setStep('codes'); onChanged(); } catch (err) { fail(err); } finally { setBusy(false); } };
  const finish = () => { setCodes(null); setStep('idle'); };
  return (
    <section aria-label="Two-factor sign-in" style={{ border: '1px solid #CBD5E1', borderRadius: 10, padding: 16, marginBottom: 20 }}>
      <h4 style={{ marginBottom: 6 }}>Your two-factor sign-in</h4>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
        {mfa.enrolled ? `Authenticator app is on. ${mfa.recoveryCodesRemaining} recovery code${mfa.recoveryCodesRemaining === 1 ? '' : 's'} left.` : 'Authenticator app is off. Turn it on so a stolen password alone cannot open an owner session.'}
        {mfa.policy === 'required' && !mfa.enrolled ? ' This deployment requires owners to enrol before they can change owners.' : ''}
      </p>
      {error && <div role="alert" style={{ ...BOX, background: 'var(--admin-status-danger-bg)', border: '1px solid var(--admin-status-danger-border)', color: 'var(--admin-status-danger)' }}>{error}</div>}
      {step === 'idle' && !mfa.enrolled && <Button variant="primary" onClick={() => { setError(null); setStep('password'); }}>Set up authenticator</Button>}
      {step === 'password' && (
        <form onSubmit={start} aria-label="Confirm password to start enrolment">
          <label htmlFor="mfa-pw" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Your password</label>
          <input id="mfa-pw" type="password" autoComplete="current-password" style={input} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div style={{ marginTop: 10, display: 'flex', gap: 10 }}><Button type="submit" variant="primary" disabled={busy || !password}>{busy ? 'Working…' : 'Continue'}</Button><Button variant="outline" onClick={() => setStep('idle')}>Cancel</Button></div>
        </form>
      )}
      {step === 'scan' && enroll && (
        <form onSubmit={activate} aria-label="Activate authenticator">
          <p style={{ fontSize: 13 }}>In your authenticator app choose “Enter a setup key” and type this key (shown only now):</p>
          <code data-testid="mfa-secret" style={{ display: 'block', padding: 10, background: '#F1F5F9', borderRadius: 6, letterSpacing: 2, wordBreak: 'break-all', margin: '8px 0' }}>{enroll.secret}</code>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Account: {mfa.account || 'your owner address'} · Type: time-based · 6 digits · 30 seconds.</p>
          <label htmlFor="mfa-code" style={{ display: 'block', fontWeight: 600, fontSize: 13, marginTop: 8 }}>Enter the 6-digit code it shows</label>
          <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" style={input} value={code} onChange={(e) => setCode(e.target.value)} required />
          <div style={{ marginTop: 10 }}><Button type="submit" variant="primary" disabled={busy || code.trim().length < 6}>{busy ? 'Checking…' : 'Turn on'}</Button></div>
        </form>
      )}
      {step === 'codes' && codes && (
        <div role="status">
          <p style={{ fontSize: 13, fontWeight: 600 }}>Save these recovery codes now. Each works once, and they will not be shown again.</p>
          <ul data-testid="mfa-recovery-codes" style={{ columns: 2, fontFamily: 'monospace', margin: '8px 0 12px', paddingLeft: 18 }}>{codes.map((c) => <li key={c}>{c}</li>)}</ul>
          <Button variant="primary" onClick={finish}>I have saved them</Button>
        </div>
      )}
    </section>
  );
}

export default function AdminOwnerManagement() {
  const [state, setState] = useState({ status: 'loading' });
  const [data, setData] = useState(null);
  const [dialog, setDialog] = useState(null); // { action, target }
  const [notice, setNotice] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [mfa, setMfa] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await ownerAPI.overview();
      if (!res || !Array.isArray(res.members) || !Array.isArray(res.invitations)) {
        setState({ status: 'error', message: 'Owner management returned an unexpected response. Nothing is shown rather than guessing.' });
        return;
      }
      setData(res); setState({ status: 'ready' });
      try { const m = await ownerAPI.mfaStatus(); setMfa(m?.mfa || null); } catch { setMfa(null); }
    } catch (err) {
      const d = err?.response?.data || {};
      setState({ status: 'error', message: d.message || 'Could not load owner management.' });
    }
  }, []);
  // fetch-on-mount: load() only sets state after the awaited request resolves (same pattern as the other admin tabs).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (state.status === 'loading') return <div className="loading-center"><div className="spinner" /></div>;
  if (state.status === 'error') {
    return <div role="alert" style={{ ...BOX, background: 'var(--admin-status-danger-bg)', border: '1px solid var(--admin-status-danger-border)', color: 'var(--admin-status-danger)' }}>{state.message} <button className="btn btn-sm btn-outline" onClick={load}>Retry</button></div>;
  }

  const usableCount = data.members.filter((m) => m.usable).length;
  const done = async (res, action) => {
    setDialog(null);
    const text = {
      invite: res.emailDelivered ? 'Invitation sent. Access is granted only after the person verifies their mailbox and accepts.' : `Invitation created but the email could not be delivered (${res.emailStatus || 'not sent'}). Use Resend once e-mail is available.`,
      resend: 'A fresh invitation was issued; the previous link no longer works.',
      revokeInvitation: 'Invitation revoked.', remove: 'Owner removed. Their sessions end immediately.', recover: 'Recovery started. The person must verify their mailbox again.',
    }[action];
    setNotice({ kind: 'success', text });
    await load();
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: '1rem', marginBottom: 6 }}>Platform owners</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
        {usableCount} active, verified owner{usableCount === 1 ? '' : 's'}. Owner privilege comes only from the membership list below, and every change is recorded.
        {data.bootstrap?.status === 'open' ? ' Initial setup is still open.' : ''}
      </p>
      {!data.canManage && (
        <div role="alert" style={{ ...BOX, background: 'var(--admin-status-info-bg)', border: '1px solid var(--admin-status-info-border)', color: 'var(--admin-status-info)' }}>
          {data.store?.mode === 'legacy' ? 'Owner management needs the owner-governance migration, which has not been applied to this database. Owner access works as before.' : 'The membership store cannot be read, so changes are disabled.'}
        </div>
      )}
      {notice && <div role="status" style={{ ...BOX, background: 'var(--admin-status-success-bg)', border: '1px solid var(--admin-status-success-border)', color: 'var(--admin-status-success)' }}>{notice.text}</div>}
      <MfaPanel mfa={mfa} onChanged={load} />
      {dialog && <ActionDialog action={dialog.action} target={dialog.target} onCancel={() => setDialog(null)} onDone={done} mfaEnrolled={!!mfa?.enrolled} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h4>Owners</h4>
        {data.canManage && <Button variant="primary" onClick={() => { setNotice(null); setDialog({ action: 'invite', target: {} }); }}>Invite owner</Button>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="owner-tbl" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }} aria-label="Owners">
          <thead role="rowgroup"><tr role="row" style={{ textAlign: 'left' }}><th role="columnheader">Owner</th><th role="columnheader">State</th><th role="columnheader">Added</th><th role="columnheader">By</th><th role="columnheader" /></tr></thead>
          <tbody role="rowgroup">
            {data.members.filter((m) => m.status === 'active').map((m) => (
              <tr role="row" key={m.id} data-testid={`owner-${m.email}`}>
                <td role="cell" data-label="Owner">{m.name ? `${m.name} · ` : ''}{m.email}{m.primary ? ' · Primary owner' : ''}{m.userId === data.self?.id ? ' (you)' : ''}</td>
                <td role="cell" data-label="State">{m.usable ? 'Active · verified' : `Blocked — ${m.blockedReason || 'not usable'}`}</td>
                <td role="cell" data-label="Added">{fmt(m.activatedAt)}</td><td role="cell" data-label="By">{m.addedBy || '—'}</td>
                <td role="cell" className="owner-tbl-actions" data-label="Actions">
                  {data.canManage && m.userId !== data.self?.id && !(m.primary && !data.self?.primary && data.primaryProtection !== false) && <Button size="sm" variant="outline" onClick={() => { setNotice(null); setDialog({ action: 'remove', target: m }); }}>Remove</Button>}
                  {data.canManage && m.primary && !data.self?.primary && data.primaryProtection !== false && <span style={{ color: 'var(--text-muted)' }}>Protected — only the primary owner can leave</span>}
                  {data.canManage && !m.usable && m.userId !== data.self?.id && <Button size="sm" variant="outline" onClick={() => { setNotice(null); setDialog({ action: 'recover', target: m }); }}>Recover</Button>}
                  {data.canManage && m.userId === data.self?.id && usableCount > 1 && <Button size="sm" variant="outline" onClick={() => { setNotice(null); setDialog({ action: 'remove', target: m }); }}>Leave</Button>}
                  {m.userId === data.self?.id && usableCount <= 1 && <span style={{ color: 'var(--text-muted)' }}>Last owner — add another before leaving</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 style={{ margin: '20px 0 8px' }}>Invitations</h4>
      {data.invitations.length === 0 ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No invitations.</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="owner-tbl" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }} aria-label="Invitations">
            <thead role="rowgroup"><tr role="row" style={{ textAlign: 'left' }}><th role="columnheader">Address</th><th role="columnheader">Status</th><th role="columnheader">Expires</th><th role="columnheader">Sent</th><th role="columnheader">Invited by</th><th role="columnheader" /></tr></thead>
            <tbody role="rowgroup">
              {data.invitations.map((i) => (
                <tr role="row" key={i.id} data-testid={`invitation-${i.email}`}>
                  <td role="cell" data-label="Address">{i.email}</td><td role="cell" data-label="Status">{i.status}</td><td role="cell" data-label="Expires">{fmt(i.expiresAt)}</td><td role="cell" data-label="Sent">{i.resendCount + 1}×, last {fmt(i.lastSentAt)}</td><td role="cell" data-label="Invited by">{i.invitedBy || '—'}</td>
                  <td role="cell" className="owner-tbl-actions" data-label="Actions">
                    {data.canManage && (i.status === 'pending' || i.status === 'expired') && <Button size="sm" variant="outline" onClick={() => { setNotice(null); setDialog({ action: 'resend', target: i }); }}>Resend</Button>}
                    {data.canManage && i.status === 'pending' && <Button size="sm" variant="outline" onClick={() => { setNotice(null); setDialog({ action: 'revokeInvitation', target: i }); }}>Revoke</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h4 style={{ margin: '20px 0 8px' }}>Who changed what</h4>
      <div style={{ overflowX: 'auto' }}>
        <table className="owner-tbl" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }} aria-label="Owner audit history">
          <thead role="rowgroup"><tr role="row" style={{ textAlign: 'left' }}><th role="columnheader">When</th><th role="columnheader">Action</th><th role="columnheader">Result</th><th role="columnheader">By</th><th role="columnheader">Target</th><th role="columnheader">Reason</th></tr></thead>
          <tbody role="rowgroup">
            {(showAll ? data.events : data.events.slice(0, 20)).map((e) => (<tr role="row" key={e.id}><td role="cell" data-label="When">{fmt(e.at)}</td><td role="cell" data-label="Action">{e.action}</td><td role="cell" data-label="Result">{e.result}</td><td role="cell" data-label="By">{e.actor}</td><td role="cell" data-label="Target">{e.targetEmail || '—'}</td><td role="cell" data-label="Reason">{e.reason || '—'}</td></tr>))}
          </tbody>
        </table>
      </div>
      {data.events.length > 20 && <div style={{ marginTop: 8 }}><Button size="sm" variant="outline" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show latest 20' : `Show all ${data.events.length}`}</Button></div>}
      <div style={{ marginTop: 16 }}><Button variant="outline" onClick={load}>Reload owners</Button></div>
    </div>
  );
}
