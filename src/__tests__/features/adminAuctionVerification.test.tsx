import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({ adminListProposals: vi.fn(), adminGetProposal: vi.fn(), adminSendEvent: vi.fn(), adminCapabilityAction: vi.fn() }));
vi.mock('../../services/privateSellerAuctionApi', async () => {
  class PsapApiError extends Error { kind: string; status?: number; code?: string; constructor(m: string, k: string, s?: number, c?: string) { super(m); this.kind = k; this.status = s; this.code = c; } }
  return { ...api, PsapApiError, newIdempotencyKey: () => 'key-' + Math.random().toString(36).slice(2) };
});
import AdminAuctionVerification from '../../features/AdminAuctionVerification';
import { PsapApiError } from '../../services/privateSellerAuctionApi';

const prop = { id: 'aaaaaaaa-1111-4111-8111-111111111111', car_id: 'c', seller_user_id: 's', proposal_version: 1, evidence_version: 2, proposal_status: 'under_review', verification_status: 'passed', custody_status: 'handover_scheduled', appeal_status: 'not_requested', inspection_payment_confirmed_at: '2026-10-20T10:00:00Z' };
beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

describe('AdminAuctionVerification', () => {
  it('lists cases, shows the DB gate verdict with blockers, and surfaces a server refusal of approval without claiming success', async () => {
    api.adminListProposals.mockResolvedValue([prop]);
    api.adminGetProposal.mockResolvedValue({ success: true, proposal: prop, events: [], eligibility: { eligible: false, blockers: ['Vehicle is not recorded in approved physical custody'] } });
    api.adminSendEvent.mockRejectedValue(new PsapApiError('CUSTODY_NOT_CONFIRMED', 'conflict', 409));
    render(<AdminAuctionVerification />);
    await userEvent.click(await screen.findByRole('button', { name: /aaaaaaaa/ }));
    expect(await screen.findByText('Gate: blocked')).toBeTruthy();
    expect(screen.getByText(/not recorded in approved physical custody/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('CUSTODY_NOT_CONFIRMED')).toBeTruthy();
    expect(screen.queryByText('Decision recorded.')).toBeNull();
  });
  it('non-approval decisions and holds require a written reason', async () => {
    api.adminListProposals.mockResolvedValue([prop]);
    api.adminGetProposal.mockResolvedValue({ success: true, proposal: prop, events: [], eligibility: { eligible: false, blockers: [] } });
    render(<AdminAuctionVerification />);
    await userEvent.click(await screen.findByRole('button', { name: /aaaaaaaa/ }));
    for (const n of ['Request changes', 'Reject', 'Place custody hold', 'Release hold']) expect((await screen.findByRole('button', { name: n }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(screen.getByLabelText(/Reason \(required/), 'Photos do not match');
    expect((screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('shows a load failure honestly with retry', async () => {
    api.adminListProposals.mockRejectedValue(new PsapApiError('x', 'forbidden', 403));
    render(<AdminAuctionVerification />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy());
  });
});
