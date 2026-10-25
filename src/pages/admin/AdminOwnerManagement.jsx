import { useState, useEffect, useCallback } from 'react';
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

function ActionDialog({ action, target, onCancel, onDone }) {
  const cfg = ACTIONS[action];
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [via, setVia] = useState('in_person');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const addr = action === 'invite' ? email : target.email;
  const confirmOk = confirmEmail.trim().toLowerCase() === String(addr || '').trim().toLowerCase() && !!addr;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const base = { confirmEmail, password };
      let res;
      if (action === 'invite') res = await ownerAPI.invite({ email, ...base, note });
      else if (action === 'resend') res = await ownerAPI.resend(target.id, base);
      else if (action === 'revokeInvitation') res = await ownerAPI.revokeInvitation(target.id, { ...base, reason });
      else if (action === 'remove') res = await ownerAPI.removeMember(target.userId, { ...base, reason });
      else res = await ownerAPI.recover(target.userId, { ...base, verifiedVia: via, note });
      setPassword('');
      onDone(res, action);
    } catch (err) {
      setPassword('');
      const d = err?.response?.data || {};
      setError(d.message || 'The change was not made.');
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} aria-label={cfg.title} className="card" style={{ padding: 20, border: '2px solid #94A3B8', marginBottom: 16 }}>
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
      {error && <div role="alert" style={{ ...BOX, background: 'var(--admin-status-danger-bg)', border: '1px solid var(--admin-status-danger-border)', color: 'var(--admin-status-danger)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button type="submit" variant={cfg.danger ? 'danger' : 'primary'} disabled={busy || !confirmOk || !password}>{busy ? 'Working…' : cfg.cta}</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}

export default function AdminOwnerManagement() {
  const [state, setState] = useState({ status: 'loading' });
  const [data, setData] = useState(null);
  const [dialog, setDialog] = useState(null); // { action, target }
  const [notice, setNotice] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await ownerAPI.overview();
      if (!res || !Array.isArray(res.members) || !Array.isArray(res.invitations)) {
        setState({ status: 'error', message: 'Owner management returned an unexpected response. Nothing is shown rather than guessing.' });
        return;
      }
      setData(res); setState({ status: 'ready' });
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
      {dialog && <ActionDialog action={dialog.action} target={dialog.target} onCancel={() => setDialog(null)} onDone={done} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h4>Owners</h4>
        {data.canManage && <Button variant="primary" onClick={() => { setNotice(null); setDialog({ action: 'invite', target: {} }); }}>Invite owner</Button>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }} aria-label="Owners">
          <thead><tr style={{ textAlign: 'left' }}><th>Owner</th><th>State</th><th>Added</th><th>By</th><th /></tr></thead>
          <tbody>
            {data.members.filter((m) => m.status === 'active').map((m) => (
              <tr key={m.id} data-testid={`owner-${m.email}`}>
                <td>{m.name ? `${m.name} · ` : ''}{m.email}{m.userId === data.self?.id ? ' (you)' : ''}</td>
                <td>{m.usable ? 'Active · verified' : `Blocked — ${m.blockedReason || 'not usable'}`}</td>
                <td>{fmt(m.activatedAt)}</td><td>{m.addedBy || '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {data.canManage && m.userId !== data.self?.id && <Button size="sm" variant="outline" onClick={() => { setNotice(null); setDialog({ action: 'remove', target: m }); }}>Remove</Button>}
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
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }} aria-label="Invitations">
            <thead><tr style={{ textAlign: 'left' }}><th>Address</th><th>Status</th><th>Expires</th><th>Sent</th><th>Invited by</th><th /></tr></thead>
            <tbody>
              {data.invitations.map((i) => (
                <tr key={i.id} data-testid={`invitation-${i.email}`}>
                  <td>{i.email}</td><td>{i.status}</td><td>{fmt(i.expiresAt)}</td><td>{i.resendCount + 1}×, last {fmt(i.lastSentAt)}</td><td>{i.invitedBy || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
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
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }} aria-label="Owner audit history">
          <thead><tr style={{ textAlign: 'left' }}><th>When</th><th>Action</th><th>Result</th><th>By</th><th>Target</th><th>Reason</th></tr></thead>
          <tbody>
            {(showAll ? data.events : data.events.slice(0, 20)).map((e) => (<tr key={e.id}><td>{fmt(e.at)}</td><td>{e.action}</td><td>{e.result}</td><td>{e.actor}</td><td>{e.targetEmail || '—'}</td><td>{e.reason || '—'}</td></tr>))}
          </tbody>
        </table>
      </div>
      {data.events.length > 20 && <div style={{ marginTop: 8 }}><Button size="sm" variant="outline" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show latest 20' : `Show all ${data.events.length}`}</Button></div>}
      <div style={{ marginTop: 16 }}><Button variant="outline" onClick={load}>Reload owners</Button></div>
    </div>
  );
}
