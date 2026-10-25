import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let authUser: any;
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: authUser, isAuth: true, loading: false, sessionStatus: 'ready' }),
  SessionRecovery: () => null,
}));
vi.mock('../../../api/api', () => ({ adminAPI: { alerts: vi.fn().mockResolvedValue({ unreadCount: 0, alerts: [] }) } }));

import AdminLayout from '../../../components/admin/AdminLayout';

const mount = (path: string) => render(
  <MemoryRouter initialEntries={[path]}><AdminLayout><div>page-body</div></AdminLayout></MemoryRouter>,
);

beforeEach(() => { authUser = { id: 'u1', name: 'Amina Otieno', role: 'superadmin', permissions: [] }; });
afterEach(() => cleanup());

describe('Super Admin shell', () => {
  it('renders one canonical sidebar, header and content region', () => {
    mount('/admin/users');
    expect(screen.getAllByRole('complementary', { name: 'Administration navigation' })).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByText('page-body')).toBeTruthy();
  });

  it('shows the authenticated identity in the header, never a placeholder', () => {
    mount('/admin');
    const identity = screen.getByRole('group', { name: /Signed in as Amina Otieno, Super Admin/ });
    expect(within(identity).getByText('Amina Otieno')).toBeTruthy();
    expect(within(identity).getByText('AO')).toBeTruthy();
  });

  it('uses readable breadcrumb labels including acronyms', () => {
    mount('/admin/ntsa-queue');
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByText('NTSA queue')).toBeTruthy();
    expect(within(crumbs).getByText('NTSA queue').getAttribute('aria-current')).toBe('page');
  });

  it('offers a way back to the marketplace', () => {
    mount('/admin');
    expect(screen.getByRole('link', { name: /View marketplace/ }).getAttribute('href')).toBe('/');
  });

  it('gives every destination its own icon', () => {
    mount('/admin');
    const links = Array.from(document.querySelectorAll('.admin-sidebar__links a')).filter((a) => a.getAttribute('href') !== '/');
    expect(links.length).toBeGreaterThanOrEqual(29);
    const icons = links.map((a) => Array.from(a.querySelector('svg')!.classList).find((c) => c.startsWith('lucide-') && c !== 'lucide')!);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('does not show superadmin-only destinations to other staff', () => {
    authUser = { id: 'u2', name: 'Moses', role: 'marketing', permissions: [] };
    mount('/admin');
    expect(screen.queryByText('Staff Permissions')).toBeNull();
    expect(screen.queryByText('Panic Room')).toBeNull();
    expect(screen.queryByText('Webhoist')).toBeNull();
  });
});
