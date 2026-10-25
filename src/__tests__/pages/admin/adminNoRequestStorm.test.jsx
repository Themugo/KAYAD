import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor, renderHook } from '@testing-library/react';

/*
 * The app shell does not mount a ToastProvider, so useToast() returns its fallback context. That fallback used to
 * be a fresh object on every render, which gave `toast` a new identity each time and made every effect listing it
 * as a dependency re-run forever (the Staff page issued hundreds of requests per second and never left "Loading").
 */
const h = vi.hoisted(() => ({ api: { getStaff: vi.fn(), getStaffRoleCatalog: vi.fn() } }));
vi.mock('../../../api/api', async (orig) => ({ ...(await orig()), adminAPI: { getStaff: (...a) => h.api.getStaff(...a), getStaffRoleCatalog: (...a) => h.api.getStaffRoleCatalog(...a) } }));
vi.mock('../../../context/AuthContext', async (orig) => ({ ...(await orig()), useAuth: () => ({ user: { isOwner: true, role: 'superadmin', name: 'Owner' } }) }));

import { useToast } from '../../../context/ToastContext';
import AdminStaff from '../../../pages/admin/AdminStaff';

describe('toast fallback outside a provider', () => {
  test('keeps one stable identity across renders', () => {
    const { result, rerender } = renderHook(() => useToast());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(result.current.toast).toBe(first.toast);
  });
});

describe('Staff directory', () => {
  test('loads once and leaves the loading state on an unexpected payload', async () => {
    h.api.getStaff.mockResolvedValue({ success: true, data: [] });
    h.api.getStaffRoleCatalog.mockResolvedValue({ success: true });
    render(<AdminStaff />);
    await waitFor(() => expect(screen.queryByText(/Loading staff records/)).toBeNull());
    await new Promise((r) => setTimeout(r, 150));
    expect(h.api.getStaff.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
