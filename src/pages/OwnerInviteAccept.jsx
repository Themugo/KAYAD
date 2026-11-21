import { useEffect, useRef, useState } from 'react';
import { ownerAPI } from '../api/api';

// STAGE 5B — owner invitation acceptance. The token lives only in the link; it is read once, sent to the server, and removed from the address bar.
export default function OwnerInviteAccept() {
  const tokenRef = useRef(null);
  const [phase, setPhase] = useState('loading'); // loading | form | done | error
  const [info, setInfo] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tokenRef.current !== null) return;
    tokenRef.current = new URLSearchParams(window.location.search).get('token') || '';
    try { window.history.replaceState(null, '', window.location.pathname); } catch { /* ignore */ }
    if (!tokenRef.current) { setPhase('error'); setMessage('This invitation link is missing its token. Ask an owner to send a new one.'); return; }
    ownerAPI.previewInvitation(tokenRef.current)
      .then((r) => { setInfo(r); setPhase('form'); })
      .catch((e) => { setPhase('error'); setMessage(e?.response?.data?.message || 'This invitation could not be checked.'); });
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      await ownerAPI.acceptInvitation({ token: tokenRef.current, name: name || undefined, password: password || undefined });
      setPassword(''); setPhase('done');
    } catch (err) { setPassword(''); setMessage(err?.response?.data?.message || 'The invitation could not be accepted.'); }
    finally { setBusy(false); }
  };
  const needsPassword = info?.mode === 'set_password';
  return (
    <main style={{ maxWidth: 460, margin: '48px auto', padding: '0 16px' }} aria-labelledby="oi-h">
      <h1 id="oi-h" style={{ fontSize: '1.4rem', marginBottom: 12 }}>KAYAD owner invitation</h1>
      {phase === 'loading' && <p>Checking your invitation…</p>}
      {phase === 'error' && <div role="alert" style={{ padding: 14, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B' }}>{message}</div>}
      {phase === 'done' && (
        <div role="status" style={{ padding: 14, borderRadius: 8, background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46' }}>
          You are now a KAYAD owner. <a href="/login">Sign in</a> to continue.
        </div>
      )}
      {phase === 'form' && (
        <form onSubmit={submit}>
          <p style={{ marginBottom: 12, fontSize: 14 }}>This invitation is for <strong>{info.email}</strong>. It expires {new Date(info.expiresAt).toLocaleString()}.</p>
          {needsPassword ? (
            <>
              <label htmlFor="oi-name" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Your name</label>
              <input id="oi-name" style={{ width: '100%', padding: 10, marginBottom: 12 }} value={name} onChange={(e) => setName(e.target.value)} />
              <label htmlFor="oi-pw" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Choose a password</label>
              <input id="oi-pw" type="password" autoComplete="new-password" style={{ width: '100%', padding: 10, marginBottom: 4 }} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>At least 8 characters with upper and lower case, a number and a symbol.</p>
            </>
          ) : (
            <p style={{ fontSize: 13, marginBottom: 12 }}>You already have a KAYAD account with this address. Make sure you are signed in to it in this browser, then accept.</p>
          )}
          {message && <div role="alert" style={{ padding: 10, marginBottom: 12, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13 }}>{message}</div>}
          <button type="submit" className="btn btn-primary" disabled={busy || (needsPassword && !password)}>{busy ? 'Working…' : 'Accept ownership'}</button>
        </form>
      )}
    </main>
  );
}
