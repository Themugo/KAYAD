import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from '../../components/AuthModal';
import { AuthProvider } from '../../context/AuthContext';

/**
 * KAYAD Fusion Phase 3 tests. Every test here mocks the real fetch()
 * calls AuthModal now makes (via AuthContext -> services/authApi.ts)
 * and asserts on the actual request that was sent - confirming the
 * modal genuinely calls the real backend endpoints with the right
 * method/path/body, not that it merely doesn't crash. This is the
 * first test coverage for this rewritten component.
 */

function mockFetchOnce(body: unknown, ok = true, status = ok ? 200 : 401) {
  return vi.fn().mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
}

describe('AuthModal - real backend authentication (Phase 3)', () => {
  const renderModal = () =>
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={() => {}} onLogin={() => {}} />
      </AuthProvider>
    );

  beforeEach(() => {
    // Every render triggers AuthProvider's own session-restoration
    // fetch('/api/v1/auth/me') on mount - stub it to a clean "not
    // logged in" response by default so each test's own fetch mock
    // (set up after render, for the action under test) isn't
    // confused with this unrelated background call.
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Not authenticated' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows real email/password fields, not the old demo role-picker', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText('Sign In to KAYAD')).toBeTruthy());
    expect(screen.getByPlaceholderText('name@example.co.ke')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
    // The old implementation's defining behavior - clicking a role
    // instantly logs you in as a hardcoded local account - has no
    // equivalent surface anymore: there is no "Sign In as David" style
    // button.
    expect(screen.queryByText(/Sign In as/)).toBeNull();
  });

  it('demo access is hidden by default (VITE_ENABLE_DEMO not set in test env)', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText('Sign In to KAYAD')).toBeTruthy());
    expect(screen.queryByText('Demo Access')).toBeNull();
  });

  it('clicking Sign In calls the real login endpoint with the entered credentials, not a local check', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText('Sign In to KAYAD')).toBeTruthy());

    const loginFetch = mockFetchOnce({ success: true, user: { id: 'u1', name: 'Jane', email: 'jane@kayad.co.ke', role: 'user' } });
    global.fetch = loginFetch;

    fireEvent.change(screen.getByPlaceholderText('name@example.co.ke'), { target: { value: 'jane@kayad.co.ke' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'realpassword123' } });
    fireEvent.click(screen.getByText('Sign In', { selector: 'span' }));

    await waitFor(() => expect(loginFetch).toHaveBeenCalled());
    const [url, options] = loginFetch.mock.calls[0];
    expect(url).toContain('/api/v1/auth/login');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    const sentBody = JSON.parse(options.body);
    expect(sentBody.email).toBe('jane@kayad.co.ke');
    expect(sentBody.password).toBe('realpassword123');
  });

  it('a failed login shows the real backend error message, not a fabricated one', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText('Sign In to KAYAD')).toBeTruthy());

    global.fetch = mockFetchOnce({ success: false, message: 'Invalid email or password' }, false, 401);

    fireEvent.change(screen.getByPlaceholderText('name@example.co.ke'), { target: { value: 'wrong@kayad.co.ke' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByText('Sign In', { selector: 'span' }));

    await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeTruthy());
  });

  it('a network failure (no backend reachable) shows a clear, honest message, not a silent failure', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText('Sign In to KAYAD')).toBeTruthy());

    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    fireEvent.change(screen.getByPlaceholderText('name@example.co.ke'), { target: { value: 'jane@kayad.co.ke' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'anypassword' } });
    fireEvent.click(screen.getByText('Sign In', { selector: 'span' }));

    await waitFor(() =>
      expect(screen.getByText(/Unable to reach KAYAD servers/)).toBeTruthy()
    );
  });

  it('switching to Create Account calls the real register endpoint with the selected role', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText('Sign In to KAYAD')).toBeTruthy());

    fireEvent.click(screen.getByText('Create Account', { selector: 'button' }));
    await waitFor(() => expect(screen.getByText('Create Your KAYAD Account')).toBeTruthy());

    const registerFetch = mockFetchOnce({ success: true, user: { id: 'u2', name: 'New Dealer', email: 'dealer@kayad.co.ke', role: 'dealer' } });
    global.fetch = registerFetch;

    fireEvent.change(screen.getByPlaceholderText('Jane Wanjiru'), { target: { value: 'New Dealer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dealer' }));
    fireEvent.change(screen.getByPlaceholderText('name@example.co.ke'), { target: { value: 'dealer@kayad.co.ke' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'securepass1' } });
    // "Create Account" appears twice - the mode tab and the submit
    // button - disambiguated by picking the actual <button> submit
    // element (type is not "button" for the tab... both share the same
    // accessible name, so instead target the one that's currently
    // disabled=false and is the primary submit control specifically).
    const createAccountButtons = screen.getAllByRole('button', { name: 'Create Account' });
    fireEvent.click(createAccountButtons[createAccountButtons.length - 1]);

    await waitFor(() => expect(registerFetch).toHaveBeenCalled());
    const [url, options] = registerFetch.mock.calls[0];
    expect(url).toContain('/api/v1/auth/register');
    const sentBody = JSON.parse(options.body);
    expect(sentBody.role).toBe('dealer');
    expect(sentBody.name).toBe('New Dealer');
  });
});

describe('AuthModal - demo access, only when explicitly enabled', () => {
  it('shows demo buttons when VITE_ENABLE_DEMO is true, and calls the real demo-login endpoint', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO', 'true');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false }),
    });

    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={() => {}} onLogin={() => {}} />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText('Demo Access')).toBeTruthy());

    const demoFetch = mockFetchOnce({ success: true, user: { id: 'demo-1', name: 'Demo Buyer', email: 'buyer@kayad.space', role: 'user' } });
    global.fetch = demoFetch;

    fireEvent.click(screen.getByRole('button', { name: 'Buyer' }));

    await waitFor(() => expect(demoFetch).toHaveBeenCalled());
    const [url, options] = demoFetch.mock.calls[0];
    expect(url).toContain('/api/v1/auth/demo-login');
    const sentBody = JSON.parse(options.body);
    expect(sentBody.role).toBe('buyer');

    vi.unstubAllEnvs();
  });
});
