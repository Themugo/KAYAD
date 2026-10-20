import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({
  listMyProposals: vi.fn(), getMyProposal: vi.fn(), openProposal: vi.fn(), sendSellerEvent: vi.fn(),
}));
vi.mock('../../services/privateSellerAuctionApi', async () => {
  class PsapApiError extends Error { kind: string; status?: number; code?: string; constructor(m: string, k: string, s?: number, c?: string) { super(m); this.kind = k; this.status = s; this.code = c; } }
  return { ...api, PsapApiError, newIdempotencyKey: () => 'key-' + Math.random().toString(36).slice(2) };
});
import { AuctionVerificationSection } from '../../features/PrivateSellerPlatform/components/AuctionVerificationSection';
import { PsapApiError } from '../../services/privateSellerAuctionApi';

const listing = { id: 'car-1', title: 'Toyota Prado 2018' } as never;
const proposal = (o: Record<string, unknown> = {}) => ({ id: 'p-1', car_id: 'car-1', seller_user_id: 'u1', proposal_version: 1, evidence_version: 1,
  proposal_status: 'draft', verification_status: 'not_started', custody_status: 'awaiting_partner', appeal_status: 'not_requested', inspection_payment_confirmed_at: null, ...o });
const detail = (o: Record<string, unknown> = {}, elig = { eligible: false, blockers: ['Admin approval is not current'] }) => ({ success: true, proposal: proposal(o), events: [], eligibility: elig });

beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); });

describe('AuctionVerificationSection (seller, real API states)', () => {
  it('shows an honest loading and then empty state', async () => {
    api.listMyProposals.mockResolvedValue([]);
    render(<AuctionVerificationSection listings={[listing]} />);
    expect(screen.getByText(/Loading your auction cases/)).toBeTruthy();
    expect(await screen.findByText(/no auction cases yet/i)).toBeTruthy();
  });
  it('shows a list error with retry instead of an empty success state', async () => {
    api.listMyProposals.mockRejectedValue(new PsapApiError('x', 'server', 500));
    render(<AuctionVerificationSection listings={[]} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });
  it('never shows payment as confirmed unless the server recorded it, and shows blockers + not-cleared banner', async () => {
    api.listMyProposals.mockResolvedValue([proposal()]); api.getMyProposal.mockResolvedValue(detail());
    render(<AuctionVerificationSection listings={[listing]} />);
    await userEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    expect(await screen.findByText(/Not yet cleared for auction/)).toBeTruthy();
    expect(screen.getByText(/not a page redirect/i)).toBeTruthy();
    expect(screen.queryByText(/Payment confirmed by KAYAD/)).toBeNull();
    expect(screen.getByText('Admin approval is not current')).toBeTruthy();
  });
  it('shows payment confirmed and cleared only when the API says so', async () => {
    api.listMyProposals.mockResolvedValue([proposal({ proposal_status: 'approved', verification_status: 'passed', custody_status: 'in_custody', inspection_payment_confirmed_at: '2026-10-20T10:00:00Z' })]);
    api.getMyProposal.mockResolvedValue(detail({ proposal_status: 'approved', verification_status: 'passed', custody_status: 'in_custody', inspection_payment_confirmed_at: '2026-10-20T10:00:00Z' }, { eligible: true, blockers: [] }));
    render(<AuctionVerificationSection listings={[listing]} />);
    await userEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    expect(await screen.findByText(/Cleared for auction/)).toBeTruthy();
    expect(screen.getByText(/Payment confirmed by KAYAD/)).toBeTruthy();
  });
  it('failed inspection offers reinspection/appeal and no auction path; actions need a reason', async () => {
    api.listMyProposals.mockResolvedValue([proposal({ verification_status: 'failed' })]); api.getMyProposal.mockResolvedValue(detail({ verification_status: 'failed' }));
    api.sendSellerEvent.mockResolvedValue({ success: true });
    render(<AuctionVerificationSection listings={[listing]} />);
    await userEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    const reinspect = await screen.findByRole('button', { name: /Request reinspection/ });
    expect((reinspect as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(screen.getByLabelText(/Reason/), 'Brake pads replaced');
    await userEvent.click(reinspect);
    await waitFor(() => expect(api.sendSellerEvent).toHaveBeenCalledWith('p-1', 'reinspection_requested', { reason: 'Brake pads replaced' }, expect.any(String)));
  });
  it('surfaces a backend refusal (409) without pretending success', async () => {
    api.listMyProposals.mockResolvedValue([proposal()]); api.getMyProposal.mockResolvedValue(detail());
    api.sendSellerEvent.mockRejectedValue(new PsapApiError('PAYMENT_NOT_CONFIRMED', 'conflict', 409, 'PAYMENT_NOT_CONFIRMED'));
    render(<AuctionVerificationSection listings={[listing]} />);
    await userEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    await userEvent.type(await screen.findByLabelText(/Paid inspection booking ID/), 'bk-1');
    await userEvent.click(screen.getByRole('button', { name: /Link booking/ }));
    expect(await screen.findByText('PAYMENT_NOT_CONFIRMED')).toBeTruthy();
    expect(screen.queryByText(/Inspection booking linked/)).toBeNull();
  });
});
