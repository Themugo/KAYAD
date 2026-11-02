import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ accept: vi.fn() }));
vi.mock('../../../services/dealerPlatformApi', () => ({ acceptTeamInvite: m.accept }));
import DealerTeamInvite from '../../../pages/dealer/DealerTeamInvite';

const TOKEN = 'a'.repeat(64);
const at = (q: string) => window.history.pushState({}, '', `/dealer/setup${q}`);
beforeEach(() => vi.clearAllMocks());

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
  it.each([[404, /not found|already been used/i], [410, /expired/i], [403, /different e-mail/i], [409, /already an active member/i]])('server %i is explained and retry stays available', async (status, re) => {
    at(`?invite=${TOKEN}`);
    m.accept.mockRejectedValue({ response: { status, data: status === 403 || status === 409 ? {} : {} } });
    render(<DealerTeamInvite />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(re);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
});
