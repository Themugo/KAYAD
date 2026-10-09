import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({ register: vi.fn(), apply: vi.fn(), resend: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ register: m.register }) }));
vi.mock('../../api/api', () => ({ inspectorAPI: { apply: m.apply } }));
vi.mock('../../services/authApi', () => ({
  AuthApiError: class AuthApiError extends Error { kind: string; status?: number; constructor(message: string, kind = 'unknown', status?: number) { super(message); this.kind = kind; this.status = status; } },
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
