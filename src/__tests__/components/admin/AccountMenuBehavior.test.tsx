import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

let authUser: any;
const signOut = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: authUser, signOut }),
}));

import AdminAccountMenu from '../../../components/admin/AdminAccountMenu';

const mount = () => render(
  <MemoryRouter initialEntries={['/admin']}>
    <Routes>
      <Route path="/admin" element={<div><button>outside</button><AdminAccountMenu displayName="Amina Otieno" roleLabel="Super Admin" initials="AO" /></div>} />
      <Route path="/login" element={<div>login-page</div>} />
    </Routes>
  </MemoryRouter>,
);
const trigger = () => screen.getByRole('button', { name: /Account menu for Amina Otieno, Super Admin/ });

beforeEach(() => { authUser = { id: 'u1', name: 'Amina Otieno', role: 'superadmin', permissions: [] }; signOut.mockReset(); });
afterEach(() => cleanup());

describe('Admin account menu', () => {
  it('exposes collapsed state, opens, and closes on a second click', () => {
    mount();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    fireEvent.click(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.click(trigger());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape and returns focus to the trigger; closes on outside click', () => {
    mount();
    fireEvent.click(trigger());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger());
    fireEvent.click(trigger());
    fireEvent.mouseDown(screen.getByText('outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('supports arrow-key, Home and End navigation between items', async () => {
    mount();
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    const items = screen.getAllByRole('menuitem');
    await waitFor(() => expect(document.activeElement).toBe(items[0]));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('only lists destinations the session may open', () => {
    authUser = { id: 'u2', name: 'Tech', role: 'technical_support', permissions: [] };
    mount();
    fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    expect(screen.getByRole('menuitem', { name: /My profile/ })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /Owner management/ })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /platform settings/i })).toBeNull();
    expect(screen.getByRole('menuitem', { name: /Sign out/ })).toBeTruthy();
  });

  it('offers owner management only to an owner session', () => {
    authUser = { ...authUser, isOwner: true };
    mount();
    fireEvent.click(trigger());
    expect(screen.getByRole('menuitem', { name: /Owner management/ })).toBeTruthy();
  });

  it('signs out through the server-confirmed path and leaves for the login page', async () => {
    signOut.mockResolvedValue({ ok: true });
    mount();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('menuitem', { name: /Sign out/ }));
    await waitFor(() => expect(screen.getByText('login-page')).toBeTruthy());
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('a failed sign-out is reported, the menu stays open and the user stays on the page', async () => {
    signOut.mockResolvedValue({ ok: false, message: 'Network Error' });
    mount();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('menuitem', { name: /Sign out/ }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Network Error');
    expect(screen.queryByText('login-page')).toBeNull();
    expect(screen.getByRole('menu')).toBeTruthy();
  });
});
