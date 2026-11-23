import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { buildAuthPath, currentPathForNext } from '../../utils/authIntent';
import { acceptTeamInvite, getMyWorkspace } from '../../services/dealerPlatformApi';
import { resetMyDealershipCache } from '../../features/DealershipWorkspace/useMyDealership';

/**
 * Landing page of the e-mailed team invitation (/dealer/setup?invite=<token>). The visitor must be signed in with the invited e-mail
 * address (the server checks it). Nothing is claimed until the server confirms the membership.
 */
const messageFor = (err) => {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message;
  if (status === 404) return msg || 'This invitation link is no longer valid. It may have been replaced by a newer e-mail from the dealership, already used, or cancelled. Open the most recent invitation e-mail, or ask the dealership to resend it.';
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
  const { user, logout } = useAuth();
  const [switching, setSwitching] = useState(false);

  useEffect(() => { document.title = 'Accept team invitation - KAYARD KE'; }, []);

  const accept = async () => {
    if (busy.current) return;
    busy.current = true;
    setState({ phase: 'working', message: '' });
    try {
      const res = await acceptTeamInvite(token);
      if (res?.success === false) throw Object.assign(new Error(res.message), { response: { data: res } });
      // The membership is now real on the server: drop any cached "no dealership" answer so the menu and workspace show it at once.
      resetMyDealershipCache();
      setState({ phase: 'done', message: '' });
    } catch (err) {
      // A refresh or a second tab after a successful acceptance lands here with the (now spent) link. If this person is already on a dealership
      // team, say so instead of showing a bare error (the server still refuses the spent link: nothing is claimed twice).
      if (err?.response?.status === 404) {
        try {
          const ws = await getMyWorkspace();
          if (ws?.membership) { setState({ phase: 'already', message: ws.membership.dealershipName || '' }); return; }
        } catch { /* fall through to the generic explanation */ }
      }
      if (err?.response?.status === 403 && err.response.data?.code === 'INVITATION_EMAIL_MISMATCH') {
        setState({ phase: 'wrongAccount', message: '', hint: err.response.data.invitedEmailHint || '' });
        return;
      }
      setState({ phase: 'error', message: messageFor(err) });
    } finally { busy.current = false; }
  };

  // Sign out of the wrong account, then return to sign-in carrying THIS invitation (validated in-app path; the token never goes to logs).
  const switchAccount = async () => {
    if (switching) return;
    setSwitching(true);
    const next = currentPathForNext();
    const res = await logout();
    if (res && res.ok === false) { setSwitching(false); setState({ phase: 'error', message: res.message || 'Sign-out could not be confirmed. You are still signed in.' }); return; }
    window.location.assign(buildAuthPath('login', { next }));
  };

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 bg-[#F6FAF9]">
      <div className="card" style={{ maxWidth: 480, width: '100%', padding: 28 }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Team invitation</h1>
        {state.phase === 'invalid' && <p role="alert">This invitation link is incomplete. Open the link from the e-mail again, or ask the dealership to resend it.</p>}
        {(state.phase === 'ready' || state.phase === 'working' || state.phase === 'error') && (
          <>
            <p style={{ marginBottom: 16 }}>You have been invited to join a dealership team on KAYARD KE. Accepting adds you to their team with the role they chose for you.</p>
            {state.phase === 'error' && <p role="alert" style={{ color: 'var(--danger, #b42318)', marginBottom: 12 }}>{state.message}</p>}
            {/* Shared design-system Button: the legacy `.btn` classes are only styled inside the admin shell, which left this control looking like plain text. */}
            <Button type="button" variant="primary" size="lg" fullWidth onClick={accept} disabled={state.phase === 'working'} data-testid="accept-invitation">
              {state.phase === 'working' ? 'Accepting…' : state.phase === 'error' ? 'Try again' : 'Accept invitation'}
            </Button>
          </>
        )}
        {state.phase === 'wrongAccount' && (
          <div role="alert" data-testid="wrong-account">
            <p style={{ marginBottom: 8, color: 'var(--danger, #b42318)' }}><strong>This invitation was sent to a different e-mail address.</strong></p>
            <p style={{ marginBottom: 8 }}>You are signed in as <strong>{user?.email || 'another account'}</strong>{state.hint ? <>, but the invitation was sent to <strong>{state.hint}</strong></> : null}. Nothing has been changed and the invitation is still waiting for the right account.</p>
            <p style={{ marginBottom: 16 }}>Sign out, then sign in (or create an account) with the invited e-mail address. You will come straight back to this invitation.</p>
            <Button type="button" variant="primary" size="lg" fullWidth onClick={switchAccount} disabled={switching} data-testid="switch-account">{switching ? 'Signing out…' : 'Sign out and use the invited e-mail'}</Button>
          </div>
        )}
        {state.phase === 'already' && (
          <div role="status">
            <p style={{ marginBottom: 12 }}><strong>This invitation has already been used.</strong> You are already on {state.message ? `${state.message}’s` : 'a dealership'} team.</p>
            <a href="/?nav=dealership-workspace" data-testid="open-workspace" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, padding: '0 20px', borderRadius: 'var(--radius-md, 8px)', background: 'var(--color-primary, #0B2A4A)', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>Open the dealership workspace</a>
          </div>
        )}
        {state.phase === 'done' && (
          <div role="status">
            <p style={{ marginBottom: 12 }}><strong>You have joined the team.</strong> Your access follows the role the dealership gave you.</p>
            <a href="/?nav=dealership-workspace" data-testid="open-workspace" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, padding: '0 20px', borderRadius: 'var(--radius-md, 8px)', background: 'var(--color-primary, #0B2A4A)', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>Open the dealership workspace</a>
          </div>
        )}
      </div>
    </main>
  );
}
