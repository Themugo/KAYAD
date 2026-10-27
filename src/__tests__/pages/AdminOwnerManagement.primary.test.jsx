import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// PHASE 16A: the owner list marks the primary owner and does not offer a peer owner a Remove button for it (the server enforces the same rule).
const api = vi.hoisted(() => ({ overview: vi.fn(), mfaStatus: vi.fn() }));
vi.mock('../../api/api', () => ({ ownerAPI: api }));
const { default: AdminOwnerManagement } = await import('../../pages/admin/AdminOwnerManagement');

const members = [
  { id: 'm1', userId: 'p1', email: 'primary@example.test', status: 'active', usable: true, primary: true },
  { id: 'm2', userId: 's1', email: 'second@example.test', status: 'active', usable: true, primary: false },
];
const ov = (self, extra = {}) => ({ success: true, canManage: true, self, primaryProtection: true, bootstrap: { status: 'closed' }, store: { mode: 'database' }, members, invitations: [], events: [], ...extra });
describe('AdminOwnerManagement: primary owner', () => {
  beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); api.mfaStatus.mockResolvedValue({ mfa: { installed: true, enrolled: true, keyConfigured: true } }); });
  afterEach(() => cleanup());
  it('labels the primary owner and withholds Remove from a peer, explaining why', async () => {
    api.overview.mockResolvedValue(ov({ id: 's1', primary: false }));
    render(<AdminOwnerManagement />);
    await screen.findByText(/Primary owner/);
    expect(screen.getByText(/Protected — only the primary owner can leave/)).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /remove/i }).length).toBe(0); // the peer cannot remove the primary, and has no button for itself
  });
  it('shows the primary owner a Remove button for the second owner', async () => {
    api.overview.mockResolvedValue(ov({ id: 'p1', primary: true }));
    render(<AdminOwnerManagement />);
    await screen.findByText(/Primary owner/);
    expect(screen.queryByText(/Protected — only the primary owner can leave/)).toBeNull();
    expect(screen.getAllByRole('button', { name: /remove/i }).length).toBe(1);
  });
  it('shows no protection text when the server reports the rule is switched off', async () => {
    api.overview.mockResolvedValue(ov({ id: 's1', primary: false }, { primaryProtection: false }));
    render(<AdminOwnerManagement />);
    await screen.findByText(/Primary owner/);
    expect(screen.queryByText(/Protected — only the primary owner can leave/)).toBeNull();
  });
});
