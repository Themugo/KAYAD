import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m = vi.hoisted(() => ({ users: vi.fn(), readiness: vi.fn() }));
vi.mock('../../../api/api', async (orig) => {
  const real: any = await orig();
  return { ...real, adminAPI: { ...real.adminAPI, users: (...a: any[]) => m.users(...a), dealerOnboardingReadiness: () => m.readiness(), approveDealer: vi.fn(), toggleBan: vi.fn() } };
});
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', role: 'superadmin' } }) }));
import AdminUsers from '../../../pages/admin/AdminUsers';

const list = { success: true, users: [{ id: 'a', _id: 'a', name: 'Alpha', email: 'a@x.co', role: 'dealer', status: 'pending', approved: false }], pagination: { total: 1, page: 1, pages: 1 }, summary: { pendingApproval: 1 } };
beforeEach(() => { m.users.mockReset().mockResolvedValue(list); m.readiness.mockReset(); });

describe('Users page: dealer onboarding readiness notice', () => {
  it('warns when the database is missing onboarding objects, naming them and the migration', async () => {
    m.readiness.mockResolvedValue({ ready: false, message: 'The database is missing: dealer registration function. Apply APPLY_dealer_onboarding_minimum.sql before onboarding dealers.', checks: [{ id: 'register_function', label: 'Dealer registration function', ok: false }, { id: 'dealer_columns', label: 'Dealer onboarding columns', ok: true }] });
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('APPLY_dealer_onboarding_minimum.sql');
    expect(alert).toHaveTextContent('Dealer registration function: missing');
    expect(alert).not.toHaveTextContent('Dealer onboarding columns');
  });
  it('shows nothing when ready, or when the check itself fails (no false alarm)', async () => {
    m.readiness.mockResolvedValue({ ready: true, checks: [{ id: 'x', label: 'x', ok: true }] });
    const { unmount } = render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await screen.findByText('Alpha');
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();
    m.readiness.mockRejectedValue(new Error('network'));
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await screen.findByText('Alpha');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
