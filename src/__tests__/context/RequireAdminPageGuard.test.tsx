// The admin ROUTE guard must agree with the server for direct URL access (moderator and others), not only the sidebar.
// Server truth: ci/db-journeys/29_permission_matrix.mjs and backend/routes. Before this fix a page with a permission mapping but no role list
// (featured-vehicles, inspector-applications) opened for EVERY staff role, and the moderator could open users, config, communications and
// provider-governance, whose data calls all answered 403.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, RequireAdminPage } from '../../context/AuthContext';

const authMocks = vi.hoisted(() => ({ getMe: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn().mockResolvedValue(undefined), updateProfile: vi.fn() }));
vi.mock('../../services/authApi', () => authMocks);
vi.mock('../../utils/posthog', () => ({ setPostHogUser: vi.fn(), clearPostHogUser: vi.fn() }));

const asRole = (role: string) => authMocks.getMe.mockResolvedValue({ id: 'u1', name: 'T', email: 't@example.test', role });
const open = async (role: string, path: string) => {
  cleanup();
  asRole(role);
  render(<MemoryRouter initialEntries={[path]}><AuthProvider><Routes>
    <Route path="/" element={<div>HOME</div>} />
    <Route path={path} element={<RequireAdminPage><div>PAGE CONTENT</div></RequireAdminPage>} />
  </Routes></AuthProvider></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText('PAGE CONTENT') || screen.queryByText(/Insufficient Permissions|Superadmin Only/) || screen.queryByText('HOME')).toBeTruthy());
  return !!screen.queryByText('PAGE CONTENT');
};
beforeEach(() => { vi.clearAllMocks(); });

const MODERATOR_DENIED = ['/admin/users', '/admin/inspector-applications', '/admin/featured-vehicles', '/admin/config', '/admin/communications', '/admin/provider-governance', '/admin/moderation', '/admin/feedback'];
describe('moderator direct URL access matches the server', () => {
  it.each(MODERATOR_DENIED)('moderator is denied %s without the page content ever rendering', async (p) => { expect(await open('moderator', p)).toBe(false); });
  it.each(['/admin/reports', '/admin/reviews', '/admin/chats', '/admin/security-log'])('moderator still opens %s (server allows)', async (p) => { expect(await open('moderator', p)).toBe(true); });
});
describe('other roles keep the access the server gives them', () => {
  it('super admin opens everything checked', async () => { for (const p of MODERATOR_DENIED) expect(await open('superadmin', p)).toBe(true); });
  it('admin opens config, communications, provider-governance, inspector-applications, featured-vehicles', async () => {
    for (const p of ['/admin/config', '/admin/communications', '/admin/provider-governance', '/admin/inspector-applications', '/admin/featured-vehicles']) expect(await open('admin', p)).toBe(true);
  });
  it('ghost_checker opens inspector-applications and provider-governance but not config', async () => {
    expect(await open('ghost_checker', '/admin/inspector-applications')).toBe(true);
    expect(await open('ghost_checker', '/admin/provider-governance')).toBe(true);
    expect(await open('ghost_checker', '/admin/config')).toBe(false);
  });
  it('marketing opens featured-vehicles (MANAGE_ADS) but not users or communications', async () => {
    expect(await open('marketing', '/admin/featured-vehicles')).toBe(true);
    expect(await open('marketing', '/admin/users')).toBe(false);
    expect(await open('marketing', '/admin/communications')).toBe(false);
  });
  it('technical_support and hr keep /admin/users; hr is denied feedback', async () => {
    expect(await open('technical_support', '/admin/users')).toBe(true);
    expect(await open('hr', '/admin/users')).toBe(true);
    expect(await open('hr', '/admin/feedback')).toBe(false);
  });
  it('technical_support opens communications (MANAGE_SUPPORT)', async () => { expect(await open('technical_support', '/admin/communications')).toBe(true); });
});
