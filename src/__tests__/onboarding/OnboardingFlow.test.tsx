import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({ register: vi.fn(), apply: vi.fn(), resend: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ register: m.register }) }));
vi.mock('../../api/api', () => ({ inspectorAPI: { apply: m.apply } }));
vi.mock('../../services/authApi', () => ({
  AuthApiError: class AuthApiError extends Error { kind: string; status?: number; code?: string; constructor(message: string, kind = 'unknown', status?: number, code?: string) { super(message); this.kind = kind; this.status = status; this.code = code; } },
  resendVerification: m.resend,
}));

import OnboardingFlow from '../../components/OnboardingFlow';
import { AuthApiError } from '../../services/authApi';

const mount = (entry = '/register') => render(<MemoryRouter initialEntries={[entry]}><OnboardingFlow /></MemoryRouter>);
const pick = (name: RegExp) => fireEvent.click(screen.getByRole('radio', { name }));
const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const STRONG = 'Str0ng!Passw0rd';

beforeEach(() => { cleanup(); vi.clearAllMocks(); window.localStorage.clear(); });

describe('OnboardingFlow', () => {
  it('lists only the public roles - no staff, no broker', () => {
    mount();
    const names = screen.getAllByRole('radio').map((r) => r.textContent || '');
    expect(names.length).toBe(5);
    expect(names.join(' ')).not.toMatch(/admin|staff member|broker|moderator/i);
  });

  it('buyer: registers role "user", creates NO session and tells them to verify email', async () => {
    m.register.mockResolvedValue({ user: { id: 'u' } });
    mount();
    pick(/buyer/i);
    type('Full name', 'Jane Wanjiru'); type(/^Email/, 'jane@example.com'); type('Password', STRONG);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(m.register).toHaveBeenCalledTimes(1));
    expect(m.register.mock.calls[0][0]).toMatchObject({ role: 'user', email: 'jane@example.com' });
    expect(await screen.findByText(/We sent a verification link to jane@example.com/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /sign in/i }).every((a) => /^\/login/.test(a.getAttribute('href') || ''))).toBe(true);
  });

  it('dealer: requires business fields and sends role "dealer"', async () => {
    m.register.mockResolvedValue({});
    mount('/register?intent=dealer');
    type('Full name', 'Dan Dealer'); type(/^Email/, 'd@example.com'); type(/^Phone/, '0712345678'); type('Password', STRONG);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect((await screen.findAllByText(/business name/i)).length).toBeGreaterThan(0);
    expect(m.register).not.toHaveBeenCalled();
    type(/Dealership business name/, 'Dan Motors'); type(/City or location/, 'Nairobi');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(m.register).toHaveBeenCalled());
    expect(m.register.mock.calls[0][0]).toMatchObject({ role: 'dealer', businessName: 'Dan Motors' });
    expect(await screen.findByText(/taken to business verification/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link').some((a) => (a.getAttribute('href') || '').includes('next=%2Fdealer%2Fonboarding'))).toBe(true);
  });

  it('a role cannot be escalated through the URL', async () => {
    m.register.mockResolvedValue({});
    mount('/register?intent=admin&role=admin');
    expect(screen.getAllByRole('radio').length).toBe(5); // unknown intent is ignored: picker shown
    pick(/buyer/i);
    type('Full name', 'Jane W'); type(/^Email/, 'j@example.com'); type('Password', STRONG);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(m.register).toHaveBeenCalled());
    expect(m.register.mock.calls[0][0].role).toBe('user');
  });

  it('duplicate email (409) shows an account-exists screen, not a created account', async () => {
    m.register.mockRejectedValue(new AuthApiError('exists', 'conflict', 409));
    mount('/register?intent=buyer');
    type('Full name', 'Jane W'); type(/^Email/, 'j@example.com'); type('Password', STRONG);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/already/i)).toBeInTheDocument();
  });

  it('an unknown outcome (network) is never blindly retried', async () => {
    m.register.mockRejectedValue(new AuthApiError('offline', 'network'));
    mount('/register?intent=buyer');
    type('Full name', 'Jane W'); type(/^Email/, 'j@example.com'); type('Password', STRONG);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(m.register).toHaveBeenCalledTimes(1));
    await screen.findByText(/couldn’t confirm that went through/i);
    expect(m.register).toHaveBeenCalledTimes(1);
  });

  const fillBuyer = () => {
    type('Full name', 'Jane W'); type(/^Email/, 'j@example.com'); type('Password', STRONG);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
  };

  it('a 503 carrying a backend code is a KNOWN refusal (nothing created), not a lost connection', async () => {
    m.register.mockRejectedValue(new AuthApiError('unavailable', 'server', 503, 'DATABASE_MIGRATION_REQUIRED'));
    mount('/register?intent=buyer');
    fillBuyer();
    expect(await screen.findByText(/couldn’t create your account right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn’t confirm that went through/i)).toBeNull();
    expect(screen.getByText(/Nothing was created/i)).toBeInTheDocument();
  });

  it('a bare gateway 503/502/504 (no backend code) stays an UNKNOWN outcome', async () => {
    for (const status of [502, 503, 504]) {
      cleanup(); vi.clearAllMocks();
      m.register.mockRejectedValue(new AuthApiError('gateway', 'server', status));
      mount('/register?intent=buyer');
      fillBuyer();
      expect(await screen.findByText(/couldn’t confirm that went through/i)).toBeInTheDocument();
    }
  });

  it('"Go back and try again" restores the form with details kept and sends nothing by itself', async () => {
    m.register.mockRejectedValue(new AuthApiError('offline', 'network'));
    mount('/register?intent=buyer');
    fillBuyer();
    await screen.findByText(/couldn’t confirm that went through/i);
    fireEvent.click(screen.getByRole('button', { name: /go back and try again/i }));
    expect((screen.getByLabelText(/^Email/) as HTMLInputElement).value).toBe('j@example.com');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe(STRONG);
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();
    expect(m.register).toHaveBeenCalledTimes(1);
  });

  it('"I may already have an account" goes to /login with the email and the role intent carried over', async () => {
    m.register.mockRejectedValue(new AuthApiError('offline', 'network'));
    mount('/register?intent=seller');
    type('Full name', 'Sam Seller'); type(/^Email/, 's@example.com'); type(/^Phone/, '0712345678'); type('Password', STRONG);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByText(/couldn’t confirm that went through/i);
    expect(m.register.mock.calls[0][0]).toMatchObject({ role: 'individual_seller', email: 's@example.com' });
    const link = screen.getByRole('link', { name: /i may already have an account/i });
    expect(link.getAttribute('href')).toMatch(/^\/login/);
    expect(link.getAttribute('href')).toMatch(/intent=seller/);
  });

  it('lost response, then retry: the 409 is explained as the first attempt having succeeded', async () => {
    m.register.mockRejectedValueOnce(new AuthApiError('offline', 'network'));
    m.register.mockRejectedValueOnce(new AuthApiError('exists', 'conflict', 409));
    mount('/register?intent=buyer');
    fillBuyer();
    await screen.findByText(/couldn’t confirm that went through/i);
    fireEvent.click(screen.getByRole('button', { name: /go back and try again/i }));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/Your earlier attempt went through/i)).toBeInTheDocument();
    expect(m.register).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  it('a plain 409 with no earlier uncertainty keeps the ordinary existing-account wording', async () => {
    m.register.mockRejectedValue(new AuthApiError('exists', 'conflict', 409));
    mount('/register?intent=buyer');
    fillBuyer();
    expect(await screen.findByText(/This email already has an account/i)).toBeInTheDocument();
    expect(screen.queryByText(/earlier attempt/i)).toBeNull();
  });

  it('double-submit sends one request', async () => {
    let release: (v: unknown) => void = () => {};
    m.register.mockReturnValue(new Promise((r) => { release = r; }));
    mount('/register?intent=buyer');
    type('Full name', 'Jane W'); type(/^Email/, 'j@example.com'); type('Password', STRONG);
    const btn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(btn); fireEvent.click(btn);
    expect(m.register).toHaveBeenCalledTimes(1);
    release({});
  });

  it('independent inspector uses the application endpoint and is told it is not an account yet', async () => {
    m.apply.mockResolvedValue({});
    mount('/register?intent=professional');
    fireEvent.click(screen.getByLabelText(/on your own|independent/i));
    type('Full name', 'Ian Inspector'); type(/^Email/, 'i@example.com'); type(/^Phone/, '0712345678');
    type(/National ID/, '12345678'); type(/City or town/, 'Nairobi'); type(/Years of experience/, '5'); type(/^Specialties/, 'engine diagnostics');
    fireEvent.click(screen.getByRole('button', { name: /send application/i }));
    await waitFor(() => expect(m.apply).toHaveBeenCalledTimes(1));
    expect(m.register).not.toHaveBeenCalled();
    expect(m.apply.mock.calls[0][0]).toMatchObject({ fullName: 'Ian Inspector', idNumber: '12345678' });
    expect(await screen.findByText(/review/i)).toBeInTheDocument();
  });

  it('keeps passwords and ID numbers out of browser storage', async () => {
    m.register.mockResolvedValue({});
    mount('/register?intent=buyer');
    type('Full name', 'Jane W'); type(/^Email/, 'j@example.com'); type('Password', STRONG);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(m.register).toHaveBeenCalled());
    const dump = JSON.stringify({ ...window.localStorage }) + JSON.stringify({ ...window.sessionStorage });
    expect(dump).not.toContain(STRONG);
    expect(dump).not.toContain('j@example.com');
  });
});
