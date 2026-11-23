import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ accept: vi.fn(), ws: vi.fn() }));
vi.mock('../../../services/dealerPlatformApi', () => ({ acceptTeamInvite: m.accept, getMyWorkspace: m.ws }));
vi.mock('../../../features/DealershipWorkspace/useMyDealership', () => ({ resetMyDealershipCache: vi.fn() }));
import DealerTeamInvite from '../../../pages/dealer/DealerTeamInvite';
import { buildAuthPath, safeNextPath } from '../../../utils/authIntent';

const TOKEN = 'a'.repeat(64);
const at = (q: string) => window.history.pushState({}, '', `/dealer/setup${q}`);
beforeEach(() => { vi.clearAllMocks(); m.ws.mockResolvedValue({ membership: null }); });

describe('Team invitation landing page', () => {
  it('an incomplete link is refused without calling the server', () => {
    at('?invite=short'); render(<DealerTeamInvite />);
    expect(screen.getByRole('alert')).toHaveTextContent(/incomplete/i);
    expect(m.accept).not.toHaveBeenCalled();
  });
  it('accepting calls the server with the token and confirms only after success', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockResolvedValue({ success: true, data: {} });
    render(<DealerTeamInvite />);
    expect(m.accept).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    expect(m.accept).toHaveBeenCalledWith(TOKEN);
    expect(await screen.findByText(/You have joined the team/)).toBeInTheDocument();
  });
  it.each([[404, /no longer valid/i], [410, /expired/i], [403, /different e-mail/i], [409, /already an active member/i]])('server %i is explained and retry stays available', async (status, re) => {
    at(`?invite=${TOKEN}`);
    m.accept.mockRejectedValue({ response: { status, data: status === 403 || status === 409 ? {} : {} } });
    render(<DealerTeamInvite />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(re);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
  it('the accept control is a real, visibly styled button that does not depend on the admin-only .btn classes', () => {
    at(`?invite=${TOKEN}`); render(<DealerTeamInvite />);
    const b = screen.getByRole('button', { name: 'Accept invitation' });
    expect(b.tagName).toBe('BUTTON');
    expect(b).toHaveAttribute('type', 'button');
    expect(b.className).not.toMatch(/\bbtn\b/);
    expect(b.style.display).toBe('inline-flex');
    expect(b.style.cursor).toBe('pointer');
  });
  it('a double click sends exactly one request', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockImplementation(() => new Promise((r) => setTimeout(() => r({ success: true }), 20)));
    render(<DealerTeamInvite />);
    const b = screen.getByRole('button', { name: 'Accept invitation' });
    await userEvent.dblClick(b);
    expect(m.accept).toHaveBeenCalledTimes(1);
  });
  it('after success the next step is a visible link to the workspace', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockResolvedValue({ success: true });
    render(<DealerTeamInvite />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    const link = await screen.findByTestId('open-workspace');
    expect(link).toHaveAttribute('href', '/?nav=dealership-workspace');
    expect(link.className).not.toMatch(/\bbtn\b/);
  });
  it('a logged-out visitor is sent to sign in and returned to the same invitation link', () => {
    const next = `/dealer/setup?invite=${TOKEN}`;
    expect(safeNextPath(next)).toBe(next);
    expect(buildAuthPath('login', { next })).toBe(`/login?next=${encodeURIComponent(next)}`);
    expect(buildAuthPath('register', { next })).toContain(encodeURIComponent(next));
  });
  it('a spent link after a successful acceptance (refresh / second tab) says so when the person is already on a team', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockRejectedValue({ response: { status: 404, data: {} } }); m.ws.mockResolvedValue({ membership: { dealershipName: 'Amani Motors' } });
    render(<DealerTeamInvite />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByText(/already been used/i)).toBeInTheDocument();
    expect(screen.getByText(/Amani Motors/)).toBeInTheDocument();
    expect(screen.getByTestId('open-workspace')).toHaveAttribute('href', '/?nav=dealership-workspace');
  });
  it('a replaced link without any membership explains that a newer e-mail may exist', async () => {
    at(`?invite=${TOKEN}`); m.accept.mockRejectedValue({ response: { status: 404, data: {} } });
    render(<DealerTeamInvite />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/replaced by a newer e-mail/i);
  });
});
