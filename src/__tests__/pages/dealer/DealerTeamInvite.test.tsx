import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({
  accept: vi.fn(), ws: vi.fn(), logout: vi.fn(), preview: vi.fn(), clear: vi.fn(),
  auth: { user: { email: 'invited@amani.test' } as any, isAuth: true, loading: false },
}));
vi.mock('../../../services/dealerPlatformApi', () => ({ acceptTeamInvite: m.accept, getMyWorkspace: m.ws, previewTeamInvitation: m.preview }));
vi.mock('../../../features/DealershipWorkspace/useMyDealership', () => ({ resetMyDealershipCache: vi.fn() }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ ...m.auth, logout: m.logout }) }));
import DealerTeamInvite from '../../../pages/dealer/DealerTeamInvite';
import { buildAuthPath, safeNextPath } from '../../../utils/authIntent';

const TOKEN = 'a'.repeat(64);
const at = (q: string) => window.history.pushState({}, '', `/dealer/setup${q}`);
const valid = (over: Record<string, unknown> = {}) => ({ data: { state: 'valid', dealershipName: 'Amani Motors', roleLabel: 'sales_agent', invitedEmail: 'invited@amani.test', accountStatus: 'personal', ...over } });
const accept = () => screen.findByRole('button', { name: 'Accept invitation' });
beforeEach(() => {
  vi.clearAllMocks();
  m.ws.mockResolvedValue({ membership: null }); m.logout.mockResolvedValue({ ok: true }); m.preview.mockResolvedValue(valid());
  m.auth = { user: { email: 'invited@amani.test' }, isAuth: true, loading: false };
});

describe('Team invitation landing page: signed in as the invited person', () => {
  it('an incomplete link is refused without calling the server', () => {
    at('?invite=short'); render(<DealerTeamInvite />);
    expect(screen.getByTestId('invite-incomplete')).toHaveTextContent(/incomplete/i);
    expect(m.accept).not.toHaveBeenCalled(); expect(m.preview).not.toHaveBeenCalled();
  });
  it('shows the dealership and the role before anything is claimed', async () => {
    at(`?invite=${TOKEN}`); render(<DealerTeamInvite />);
    const s = await screen.findByTestId('invite-summary');
    expect(s).toHaveTextContent('Amani Motors'); expect(s).toHaveTextContent('sales agent');
    expect(m.preview).toHaveBeenCalledWith(TOKEN); expect(m.accept).not.toHaveBeenCalled();
  });
  it('accepting calls the server with the token and confirms only after success', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockResolvedValue({ success: true, data: {} });
    render(<DealerTeamInvite />);
    await userEvent.click(await accept());
    expect(m.accept).toHaveBeenCalledWith(TOKEN);
    expect(await screen.findByText(/You have joined the team/)).toBeInTheDocument();
  });
  it.each([
    [{ status: 404, data: { code: 'INVITATION_LINK_NOT_VALID' } }, /not recognised/i],
    [{ status: 410, data: { code: 'INVITATION_EXPIRED' } }, /expired/i],
    [{ status: 410, data: { code: 'INVITATION_CANCELLED' } }, /cancelled this invitation/i],
    [{ status: 409, data: {} }, /already an active member/i],
    [{ status: 429, data: {} }, /too many attempts/i],
  ])('server error %j is explained distinctly and retry stays available', async (response, re) => {
    at(`?invite=${TOKEN}`); m.accept.mockRejectedValue({ response });
    render(<DealerTeamInvite />);
    await userEvent.click(await accept());
    expect(await screen.findByTestId('invite-accept-error')).toHaveTextContent(re);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
  it('the accept control is a real, visibly styled button that does not depend on the admin-only .btn classes', async () => {
    at(`?invite=${TOKEN}`); render(<DealerTeamInvite />);
    const b = await accept();
    expect(b.tagName).toBe('BUTTON'); expect(b).toHaveAttribute('type', 'button');
    expect(b.className).not.toMatch(/\bbtn\b/); expect(b.style.display).toBe('inline-flex'); expect(b.style.cursor).toBe('pointer');
  });
  it('a double click sends exactly one request', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockImplementation(() => new Promise((r) => setTimeout(() => r({ success: true }), 20)));
    render(<DealerTeamInvite />);
    await userEvent.dblClick(await accept());
    expect(m.accept).toHaveBeenCalledTimes(1);
  });
  it('after success the next step is a visible link to the workspace', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockResolvedValue({ success: true });
    render(<DealerTeamInvite />);
    await userEvent.click(await accept());
    const link = await screen.findByTestId('open-workspace');
    expect(link).toHaveAttribute('href', '/?nav=dealership-workspace'); expect(link.className).not.toMatch(/\bbtn\b/);
  });
  it('a spent link after a successful acceptance (refresh / second tab) says so when the person is already on a team', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockRejectedValue({ response: { status: 409, data: { code: 'INVITATION_ALREADY_ACCEPTED', alreadyMember: true } } }); m.ws.mockResolvedValue({ membership: { dealershipName: 'Amani Motors' } });
    render(<DealerTeamInvite />);
    await userEvent.click(await accept());
    expect(await screen.findByText(/already been used/i)).toBeInTheDocument();
    expect(screen.getByTestId('open-workspace')).toHaveAttribute('href', '/?nav=dealership-workspace');
  });
  it('a link the server cannot match (replaced) and no membership explains that a newer e-mail may exist', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockRejectedValue({ response: { status: 404, data: {} } });
    render(<DealerTeamInvite />);
    await userEvent.click(await accept());
    expect(await screen.findByTestId('invite-accept-error')).toHaveTextContent(/replaced by a newer e-mail/i);
  });
  it('server-detected wrong account (even if the page could not tell) keeps the invitation untouched and offers switch-account', async () => {
    at(`?invite=${TOKEN}`);
    m.accept.mockRejectedValue({ response: { status: 403, data: { code: 'INVITATION_EMAIL_MISMATCH', invitedEmailHint: 'i***d@amani.test' } } });
    render(<DealerTeamInvite />);
    await userEvent.click(await accept());
    const box = await screen.findByTestId('wrong-account');
    expect(box).toHaveTextContent('invited@amani.test'); expect(box).toHaveTextContent('i***d@amani.test');
    expect(box.textContent).not.toContain(TOKEN); expect(m.accept).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('switch-account')).toBeEnabled();
  });
});

describe('wrong account is shown up front (hint only; the server still decides)', () => {
  beforeEach(() => { m.auth = { user: { email: 'someone.else@example.com' }, isAuth: true, loading: false }; });
  it('explains the mismatch without offering an Accept button that cannot work, and never calls accept', async () => {
    at(`?invite=${TOKEN}`); render(<DealerTeamInvite />);
    const box = await screen.findByTestId('wrong-account');
    expect(box).toHaveTextContent('someone.else@example.com');
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).toBeNull();
    expect(m.accept).not.toHaveBeenCalled();
  });
  it('switch account signs out first and only then goes to sign-in carrying the same invitation', async () => {
    at(`?invite=${TOKEN}`);
    const assign = vi.fn(); const loc = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...loc, assign, pathname: '/dealer/setup', search: `?invite=${TOKEN}`, hash: '' } });
    render(<DealerTeamInvite />);
    await userEvent.click(await screen.findByTestId('switch-account'));
    expect(m.logout).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(`/login?next=${encodeURIComponent(`/dealer/setup?invite=${TOKEN}`)}`);
    Object.defineProperty(window, 'location', { configurable: true, value: loc });
  });
  it('a failed sign-out is reported and does not navigate', async () => {
    at(`?invite=${TOKEN}`); m.logout.mockResolvedValue({ ok: false, message: 'Sign-out could not be confirmed' });
    const assign = vi.fn(); const loc = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...loc, assign, pathname: '/dealer/setup', search: `?invite=${TOKEN}`, hash: '' } });
    render(<DealerTeamInvite />);
    await userEvent.click(await screen.findByTestId('switch-account'));
    expect(await screen.findByTestId('invite-accept-error')).toHaveTextContent(/could not be confirmed/i);
    expect(assign).not.toHaveBeenCalled();
    Object.defineProperty(window, 'location', { configurable: true, value: loc });
  });
});

describe('signed-out visitors (the invitation-first journey)', () => {
  beforeEach(() => { m.auth = { user: null, isAuth: false, loading: false }; });
  const withLocation = () => {
    const assign = vi.fn(); const loc = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...loc, assign, pathname: '/dealer/setup', search: `?invite=${TOKEN}`, hash: '' } });
    return { assign, restore: () => Object.defineProperty(window, 'location', { configurable: true, value: loc }) };
  };
  it('a person with NO account sees the invitation and is offered "Create account", which carries the invitation', async () => {
    m.preview.mockResolvedValue(valid({ accountStatus: 'none' })); at(`?invite=${TOKEN}`);
    const w = withLocation(); render(<DealerTeamInvite />);
    expect(await screen.findByTestId('invite-summary')).toHaveTextContent('Amani Motors');
    expect(screen.getByTestId('invite-email')).toHaveTextContent('invited@amani.test');
    expect(screen.queryByTestId('accept-invitation')).toBeNull();
    await userEvent.click(screen.getByTestId('invite-create-account'));
    expect(w.assign).toHaveBeenCalledWith(`/register?next=${encodeURIComponent(`/dealer/setup?invite=${TOKEN}`)}`);
    w.restore();
  });
  it('a person who ALREADY has a personal account is sent to sign in and returned to this invitation', async () => {
    m.preview.mockResolvedValue(valid({ accountStatus: 'personal' })); at(`?invite=${TOKEN}`);
    const w = withLocation(); render(<DealerTeamInvite />);
    await userEvent.click(await screen.findByTestId('invite-sign-in'));
    expect(w.assign).toHaveBeenCalledWith(`/login?next=${encodeURIComponent(`/dealer/setup?invite=${TOKEN}`)}`);
    expect(screen.queryByTestId('invite-create-account')).toBeNull();
    w.restore();
  });
  it('an address that belongs to a dealer/staff account is told it cannot join, with no sign-in/register buttons', async () => {
    m.preview.mockResolvedValue(valid({ accountStatus: 'other' })); at(`?invite=${TOKEN}`); render(<DealerTeamInvite />);
    expect(await screen.findByTestId('invite-other-account')).toHaveTextContent(/dealer or staff account/i);
    expect(screen.queryByTestId('invite-sign-in')).toBeNull(); expect(screen.queryByTestId('invite-create-account')).toBeNull();
  });
  it.each([
    ['expired', /has expired/i], ['cancelled', /was cancelled/i], ['accepted', /already been used/i], ['not_recognised', /not recognised/i],
  ])('state %s has its own message and shows no e-mail or buttons', async (state, re) => {
    m.preview.mockResolvedValue({ data: { state, dealershipName: 'Amani Motors' } }); at(`?invite=${TOKEN}`); render(<DealerTeamInvite />);
    expect(await screen.findByTestId(`invite-state-${state}`)).toHaveTextContent(re);
    expect(screen.queryByTestId('invite-email')).toBeNull(); expect(screen.queryByTestId('invite-create-account')).toBeNull();
  });
  it('a preview that fails (network/rate limit) says so instead of a blank page', async () => {
    m.preview.mockRejectedValue({ response: { status: 429, data: {} } }); at(`?invite=${TOKEN}`); render(<DealerTeamInvite />);
    expect(await screen.findByTestId('invite-error')).toHaveTextContent(/too many attempts/i);
  });
  it('waits for the session check before choosing what to show (no flash of the sign-in buttons for a signed-in person)', async () => {
    m.auth = { user: null, isAuth: false, loading: true }; at(`?invite=${TOKEN}`); render(<DealerTeamInvite />);
    await waitFor(() => expect(m.preview).toHaveBeenCalled());
    expect(screen.queryByTestId('invite-sign-in')).toBeNull(); expect(screen.queryByTestId('invite-create-account')).toBeNull();
  });
});

describe('invitation context survives the sign-in / registration redirects', () => {
  it('the invitation is a validated in-app path that both /login and /register carry', () => {
    const next = `/dealer/setup?invite=${TOKEN}`;
    expect(safeNextPath(next)).toBe(next);
    expect(buildAuthPath('login', { next })).toBe(`/login?next=${encodeURIComponent(next)}`);
    expect(buildAuthPath('register', { next })).toBe(`/register?next=${encodeURIComponent(next)}`);
  });
});
