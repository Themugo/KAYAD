import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({ register: vi.fn(), preview: vi.fn(), keySeq: 0 }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ register: m.register }) }));
vi.mock('../../api/api', () => ({ inspectorAPI: { apply: vi.fn() } }));
vi.mock('../../services/dealerPlatformApi', () => ({ previewTeamInvitation: m.preview }));
vi.mock('../../services/authApi', () => ({
  AuthApiError: class AuthApiError extends Error { kind: string; status?: number; code?: string; constructor(message: string, kind = 'unknown', status?: number, code?: string) { super(message); this.kind = kind; this.status = status; this.code = code; } },
  resendVerification: vi.fn(),
  newRegistrationIdempotencyKey: () => `key-${++m.keySeq}-0123456789abcdef`,
}));
import OnboardingFlow from '../../components/OnboardingFlow';

const TOKEN = 'c'.repeat(64);
const NEXT = `/dealer/setup?invite=${TOKEN}`;
const mount = (entry = `/register?next=${encodeURIComponent(NEXT)}`) => render(<MemoryRouter initialEntries={[entry]}><OnboardingFlow /></MemoryRouter>);
const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const STRONG = 'Str0ng!Passw0rd';
const valid = (over: Record<string, unknown> = {}) => ({ data: { state: 'valid', dealershipName: 'Amani Motors', roleLabel: 'sales_agent', invitedEmail: 'mugo.james27@gmail.com', accountStatus: 'none', ...over } });

beforeEach(() => { cleanup(); vi.clearAllMocks(); window.localStorage.clear(); m.preview.mockResolvedValue(valid()); });

describe('invitation-first registration (/register?next=/dealer/setup?invite=…)', () => {
  it('skips the role chooser, shows the dealership and role, and fills in and LOCKS the invited e-mail', async () => {
    mount();
    expect(await screen.findByTestId('register-invite-banner')).toHaveTextContent('Amani Motors');
    expect(screen.getByTestId('register-invite-banner')).toHaveTextContent('sales agent');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    const email = screen.getByTestId('register-email') as HTMLInputElement;
    await waitFor(() => expect(email.value).toBe('mugo.james27@gmail.com'));
    expect(email.readOnly).toBe(true);
    expect(m.preview).toHaveBeenCalledWith(TOKEN);
    expect(screen.queryByRole('button', { name: /^change$/i })).toBeNull(); // no way to switch to a dealer / business role from an invitation
  });
  it('creates an ORDINARY PERSONAL account (role "user") with the invited address, then remembers the invitation for after verification and sign-in', async () => {
    m.register.mockResolvedValue({ user: { id: 'u' } });
    mount();
    await waitFor(() => expect((screen.getByTestId('register-email') as HTMLInputElement).value).toBe('mugo.james27@gmail.com'));
    type('Full name', 'James Mugo'); type('Password', STRONG);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(m.register).toHaveBeenCalledTimes(1));
    expect(m.register.mock.calls[0][0]).toMatchObject({ role: 'user', email: 'mugo.james27@gmail.com' });
    expect(m.register.mock.calls[0][0]).not.toHaveProperty('businessName');
    expect(await screen.findByText(/We sent a verification link to mugo.james27@gmail.com/)).toBeInTheDocument();
    // the invitation path (validated, in-app) is what survives the verification round trip; no password or token elsewhere
    const stored = JSON.parse(window.localStorage.getItem('kayad:auth-intent') || '{}');
    expect(stored.next).toBe(NEXT);
    expect(JSON.stringify(window.localStorage)).not.toContain(STRONG);
    // sign-in after verification returns to the same invitation
    expect(screen.getAllByRole('link', { name: /sign in/i }).some((a) => (a.getAttribute('href') || '') === `/login?next=${encodeURIComponent(NEXT)}`)).toBe(true);
  });
  it('an address that already has an account offers "sign in instead" with the invitation carried', async () => {
    m.preview.mockResolvedValue(valid({ accountStatus: 'personal' }));
    mount();
    const link = await screen.findByRole('link', { name: /sign in instead/i });
    expect(link).toHaveAttribute('href', `/login?next=${encodeURIComponent(NEXT)}`);
  });
  it.each([['expired', /it expired/], ['cancelled', /it was cancelled/], ['accepted', /already accepted/], ['not_recognised', /replaced or is not recognised/]])('an unusable invitation (%s) is explained, the e-mail stays editable and nothing is locked', async (state, re) => {
    m.preview.mockResolvedValue({ data: { state, dealershipName: 'Amani Motors' } });
    mount();
    expect(await screen.findByTestId('register-invite-unusable')).toHaveTextContent(re);
    const email = screen.getByTestId('register-email') as HTMLInputElement;
    expect(email.readOnly).toBe(false); expect(email.value).toBe('');
  });
  it('if the invitation cannot be checked, registration still works and the link will bring the person back afterwards', async () => {
    m.preview.mockRejectedValue(new Error('offline'));
    mount();
    expect(await screen.findByTestId('register-invite-unavailable')).toBeInTheDocument();
    expect((screen.getByTestId('register-email') as HTMLInputElement).readOnly).toBe(false);
  });
  it('only a well-formed invitation path switches this mode on (a look-alike next never skips the role chooser)', () => {
    mount(`/register?next=${encodeURIComponent('/dealer/setup?invite=short')}`);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(m.preview).not.toHaveBeenCalled();
    cleanup();
    mount(`/register?next=${encodeURIComponent('/somewhere?invite=' + TOKEN)}`);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });
});
