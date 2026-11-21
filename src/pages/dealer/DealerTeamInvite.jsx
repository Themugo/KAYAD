import { useEffect, useRef, useState } from 'react';
import { acceptTeamInvite } from '../../services/dealerPlatformApi';

/**
 * Landing page of the e-mailed team invitation (/dealer/setup?invite=<token>). The visitor must be signed in with the invited e-mail
 * address (the server checks it). Nothing is claimed until the server confirms the membership.
 */
const messageFor = (err) => {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message;
  if (status === 404) return 'This invitation was not found, or it has already been used. Ask the dealership to send a new one.';
  if (status === 410) return 'This invitation has expired. Ask the dealership to resend it.';
  if (status === 403) return msg || 'This invitation was sent to a different e-mail address. Sign in with the address that received it.';
  if (status === 409) return msg || 'You are already an active member of this dealership.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  return msg || 'The invitation could not be accepted. Please try again.';
};

export default function DealerTeamInvite() {
  const token = (() => { try { return new URLSearchParams(window.location.search).get('invite') || ''; } catch { return ''; } })();
  const [state, setState] = useState({ phase: token.length === 64 ? 'ready' : 'invalid', message: '' });
  const busy = useRef(false);

  useEffect(() => { document.title = 'Accept team invitation - KAYAD'; }, []);

  const accept = async () => {
    if (busy.current) return;
    busy.current = true;
    setState({ phase: 'working', message: '' });
    try {
      const res = await acceptTeamInvite(token);
      if (res?.success === false) throw Object.assign(new Error(res.message), { response: { data: res } });
      setState({ phase: 'done', message: '' });
    } catch (err) {
      setState({ phase: 'error', message: messageFor(err) });
    } finally { busy.current = false; }
  };

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 bg-[#F6FAF9]">
      <div className="card" style={{ maxWidth: 480, width: '100%', padding: 28 }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Team invitation</h1>
        {state.phase === 'invalid' && <p role="alert">This invitation link is incomplete. Open the link from the e-mail again, or ask the dealership to resend it.</p>}
        {(state.phase === 'ready' || state.phase === 'working' || state.phase === 'error') && (
          <>
            <p style={{ marginBottom: 16 }}>You have been invited to join a dealership team on KAYAD. Accepting adds you to their team with the role they chose for you.</p>
            {state.phase === 'error' && <p role="alert" style={{ color: 'var(--danger, #b42318)', marginBottom: 12 }}>{state.message}</p>}
            <button type="button" className="btn btn-primary" onClick={accept} disabled={state.phase === 'working'}>
              {state.phase === 'working' ? 'Accepting…' : state.phase === 'error' ? 'Try again' : 'Accept invitation'}
            </button>
          </>
        )}
        {state.phase === 'done' && (
          <div role="status">
            <p style={{ marginBottom: 12 }}><strong>You have joined the team.</strong> Your access follows the role the dealership gave you.</p>
            <a className="btn btn-outline" href="/">Go to KAYAD</a>
          </div>
        )}
      </div>
    </main>
  );
}
