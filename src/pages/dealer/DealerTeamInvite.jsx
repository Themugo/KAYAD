import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { buildAuthPath, clearStoredAuthIntent, currentPathForNext } from '../../utils/authIntent';
import { acceptTeamInvite, getMyWorkspace, previewTeamInvitation } from '../../services/dealerPlatformApi';
import { resetMyDealershipCache } from '../../features/DealershipWorkspace/useMyDealership';

/**
 * Landing page of the e-mailed team invitation (/dealer/setup?invite=<token>). The page is PUBLIC so a person who has no account yet is told
 * what the invitation is and is taken to create one (the invitation survives registration, e-mail verification and sign-in through the
 * validated `next` path). Nothing is claimed until the server confirms the membership; the server alone decides identity (the signed-in
 * user's e-mail is read from the verified session, never from the browser).
 */
const messageFor = (err) => {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  const msg = err?.response?.data?.message;
  if (code === 'INVITATION_EXPIRED') return 'This invitation has expired. Ask the dealership to resend it.';
  if (code === 'INVITATION_CANCELLED') return 'The dealership cancelled this invitation. Ask them to send you a new one.';
  if (code === 'INVITATION_LINK_NOT_VALID' || status === 404) return msg || 'This invitation link is not recognised. It may have been replaced by a newer e-mail from the dealership. Open the most recent invitation e-mail, or ask the dealership to resend it.';
  if (status === 410) return msg || 'This invitation has expired. Ask the dealership to resend it.';
  if (status === 403) return msg || 'This invitation was sent to a different e-mail address. Sign in with the address that received it.';
  if (status === 409) return msg || 'You are already an active member of this dealership.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  return msg || 'The invitation could not be accepted. Please try again.';
};

// Distinct, honest wording for each end state of a link (previewed by the server from the stored invitation).
const STATE_COPY = {
  not_recognised: { title: 'This invitation link is not recognised', body: 'It may have been replaced by a newer e-mail from the dealership (only the newest link works), or it is not a KAYARD KE invitation link. Open the most recent invitation e-mail, or ask the dealership to resend it.' },
  expired: { title: 'This invitation has expired', body: 'Invitations work for 7 days. Ask the dealership to resend it; you will get a fresh e-mail with a new link.' },
  cancelled: { title: 'This invitation was cancelled', body: 'The dealership withdrew it. If you still expect to join their team, ask them to send you a new invitation.' },
  accepted: { title: 'This invitation has already been used', body: 'The invitation was accepted, so the link is spent. If that was you, sign in and open the dealership workspace. If it was not, tell the dealership.' },
};

const sameEmail = (a, b) => String(a || '').normalize('NFKC').trim().toLowerCase() === String(b || '').normalize('NFKC').trim().toLowerCase();
const roleName = (r) => String(r || 'team member').replace(/_/g, ' ');

const linkButton = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, padding: '0 20px', borderRadius: 'var(--radius-md, 8px)', background: 'var(--color-primary, #0B2A4A)', color: '#fff', fontWeight: 600, textDecoration: 'none' };

export default function DealerTeamInvite() {
  const token = (() => { try { return new URLSearchParams(window.location.search).get('invite') || ''; } catch { return ''; } })();
  const tokenOk = /^[0-9a-f]{64}$/i.test(token);
  const { user, isAuth, loading, logout } = useAuth();
  const [preview, setPreview] = useState(tokenOk ? { status: 'loading' } : { status: 'invalid' });
  const [state, setState] = useState({ phase: 'ready', message: '', hint: '' });
  const busy = useRef(false);
  const [switching, setSwitching] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => { document.title = 'Team invitation - KAYARD KE'; }, []);

  // What is this link? Public and read-only; runs for signed-out visitors too.
  useEffect(() => {
    if (!tokenOk) return undefined;
    let cancelled = false;
    previewTeamInvitation(token)
      .then((res) => { if (!cancelled) setPreview({ status: 'ok', ...(res?.data || {}) }); })
      .catch((err) => { if (!cancelled) setPreview({ status: 'error', message: messageFor(err) }); });
    return () => { cancelled = true; };
  }, [token, tokenOk]);

  const accept = async () => {
    if (busy.current) return;
    busy.current = true;
    setState({ phase: 'working', message: '', hint: '' });
    try {
      const res = await acceptTeamInvite(token);
      if (res?.success === false) throw Object.assign(new Error(res.message), { response: { data: res } });
      // The membership is now real on the server: drop any cached "no dealership" answer so the menu and workspace show it at once.
      resetMyDealershipCache();
      clearStoredAuthIntent();
      setState({ phase: 'done', message: '', hint: '' });
    } catch (err) {
      const data = err?.response?.data;
      // A refresh or a second tab after a successful acceptance lands here with the (now spent) link. If this person is already on a dealership
      // team, say so instead of showing a bare error (the server still refuses the spent link: nothing is claimed twice).
      if (err?.response?.status === 404 || data?.code === 'INVITATION_ALREADY_ACCEPTED') {
        try {
          const ws = await getMyWorkspace();
          if (ws?.membership) { clearStoredAuthIntent(); setState({ phase: 'already', message: ws.membership.dealershipName || '', hint: '' }); return; }
        } catch { /* fall through to the generic explanation */ }
      }
      if (err?.response?.status === 403 && data?.code === 'INVITATION_EMAIL_MISMATCH') {
        setState({ phase: 'wrongAccount', message: '', hint: data.invitedEmailHint || '' });
        return;
      }
      setState({ phase: 'error', message: messageFor(err), hint: '' });
    } finally { busy.current = false; }
  };

  // Sign out of the wrong account, then return to sign-in carrying THIS invitation (validated in-app path; the token never goes to logs).
  const switchAccount = async () => {
    if (switching) return;
    setSwitching(true); setSignOutError('');
    const next = currentPathForNext();
    const res = await logout();
    if (res && res.ok === false) { setSwitching(false); setSignOutError(res.message || 'Sign-out could not be confirmed. You are still signed in.'); return; }
    window.location.assign(buildAuthPath('login', { next }));
  };

  const goCreate = () => window.location.assign(buildAuthPath('register', { next: currentPathForNext() }));
  const goSignIn = () => window.location.assign(buildAuthPath('login', { next: currentPathForNext() }));

  const p = preview.status === 'ok' ? preview : null;
  const valid = p?.state === 'valid';
  // A hint only: the SERVER decides on accept. Shown early so the person is not asked to click a button that cannot work.
  const looksWrongAccount = valid && isAuth && user?.email && !sameEmail(user.email, p.invitedEmail);

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 bg-[#F6FAF9]">
      <div className="card" style={{ maxWidth: 480, width: '100%', padding: 28 }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Team invitation</h1>

        {preview.status === 'invalid' && <p role="alert" data-testid="invite-incomplete">This invitation link is incomplete. Open the link from the e-mail again, or ask the dealership to resend it.</p>}
        {(preview.status === 'loading' || (valid && loading)) && <p role="status" data-testid="invite-checking">Checking your invitation…</p>}
        {preview.status === 'error' && <p role="alert" data-testid="invite-error">{preview.message}</p>}

        {p && !valid && STATE_COPY[p.state] && (
          <div role="status" data-testid={`invite-state-${p.state}`}>
            <p style={{ marginBottom: 8 }}><strong>{STATE_COPY[p.state].title}</strong></p>
            {p.dealershipName && <p style={{ marginBottom: 8 }}>Dealership: <strong>{p.dealershipName}</strong></p>}
            <p style={{ marginBottom: 16 }}>{STATE_COPY[p.state].body}</p>
            {p.state === 'accepted' && isAuth && <a href="/?nav=dealership-workspace" data-testid="open-workspace" style={linkButton}>Open the dealership workspace</a>}
          </div>
        )}

        {valid && !loading && (
          <>
            <p style={{ marginBottom: 8 }} data-testid="invite-summary"><strong>{p.dealershipName}</strong> invited you to join their team as <strong>{roleName(p.roleLabel)}</strong>.</p>
            <p style={{ marginBottom: 16, fontSize: '0.9rem' }}>Accepting adds you to their team with that role. Your personal KAYARD KE account stays yours; it does not become a dealer account, and the dealership can remove your team access at any time.</p>

            {!isAuth && (
              <div data-testid="invite-signed-out">
                <p style={{ marginBottom: 12 }}>Invitation sent to <strong data-testid="invite-email">{p.invitedEmail}</strong>.</p>
                {p.accountStatus === 'other' ? (
                  <p role="alert" style={{ color: 'var(--danger, #b42318)' }} data-testid="invite-other-account">That e-mail address belongs to a dealer or staff account, which cannot join a team. Ask {p.dealershipName} to invite a personal e-mail address instead.</p>
                ) : p.accountStatus === 'none' ? (
                  <>
                    <p style={{ marginBottom: 12 }}>You do not have a KAYARD KE account yet. Create a free personal account with this address, verify your e-mail, and you will come straight back here to accept.</p>
                    <Button type="button" variant="primary" size="lg" fullWidth onClick={goCreate} data-testid="invite-create-account">Create account to accept</Button>
                    <p style={{ margin: '14px 0 8px', fontSize: '0.9rem' }}>Already registered with this address?</p>
                    <Button type="button" variant="secondary" size="lg" fullWidth onClick={goSignIn} data-testid="invite-sign-in">Sign in</Button>
                  </>
                ) : (
                  <>
                    <p style={{ marginBottom: 12 }}>This address already has a KAYARD KE account. Sign in with it to accept.</p>
                    <Button type="button" variant="primary" size="lg" fullWidth onClick={goSignIn} data-testid="invite-sign-in">Sign in to accept</Button>
                  </>
                )}
              </div>
            )}

            {isAuth && !looksWrongAccount && ['ready', 'working', 'error'].includes(state.phase) && (
              <>
                {state.phase === 'error' && <p role="alert" style={{ color: 'var(--danger, #b42318)', marginBottom: 12 }} data-testid="invite-accept-error">{state.message}</p>}
                {/* Shared design-system Button: the legacy `.btn` classes are only styled inside the admin shell, which left this control looking like plain text. */}
                <Button type="button" variant="primary" size="lg" fullWidth onClick={accept} disabled={state.phase === 'working'} data-testid="accept-invitation">
                  {state.phase === 'working' ? 'Accepting…' : state.phase === 'error' ? 'Try again' : 'Accept invitation'}
                </Button>
              </>
            )}
          </>
        )}

        {(state.phase === 'wrongAccount' || looksWrongAccount) && valid && isAuth && state.phase !== 'done' && state.phase !== 'already' && (
          <div role="alert" data-testid="wrong-account">
            <p style={{ marginBottom: 8, color: 'var(--danger, #b42318)' }}><strong>This invitation was sent to a different e-mail address.</strong></p>
            <p style={{ marginBottom: 8 }}>You are signed in as <strong>{user?.email || 'another account'}</strong>{(state.hint || p?.invitedEmail) ? <>, but the invitation was sent to <strong>{state.hint || p.invitedEmail}</strong></> : null}. Nothing has been changed and the invitation is still waiting for the right account.</p>
            <p style={{ marginBottom: 16 }}>Sign out, then sign in (or create an account) with the invited e-mail address. You will come straight back to this invitation.</p>
            {signOutError && <p role="alert" style={{ color: 'var(--danger, #b42318)', marginBottom: 12 }} data-testid="invite-accept-error">{signOutError}</p>}
            <Button type="button" variant="primary" size="lg" fullWidth onClick={switchAccount} disabled={switching} data-testid="switch-account">{switching ? 'Signing out…' : 'Sign out and use the invited e-mail'}</Button>
          </div>
        )}

        {state.phase === 'already' && (
          <div role="status">
            <p style={{ marginBottom: 12 }}><strong>This invitation has already been used.</strong> You are already on {state.message ? `${state.message}’s` : 'a dealership'} team.</p>
            <a href="/?nav=dealership-workspace" data-testid="open-workspace" style={linkButton}>Open the dealership workspace</a>
          </div>
        )}
        {state.phase === 'done' && (
          <div role="status" data-testid="invite-done">
            <p style={{ marginBottom: 12 }}><strong>You have joined the team.</strong> Your access follows the role the dealership gave you.</p>
            <a href="/?nav=dealership-workspace" data-testid="open-workspace" style={linkButton}>Open the dealership workspace</a>
          </div>
        )}
      </div>
    </main>
  );
}
