import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EscrowView } from '../../features/EscrowView';
import * as escrowApiMock from '../../services/escrowApi';

const user = { id: 'user-1', name: 'Test Buyer', email: 'b@test.com', role: 'buyer' as const, avatar: '', phone: '' };
const deal = (id: string, title: string) => ({
  id, buyer: { id: 'user-1', name: 'Test Buyer' }, seller: { id: 'user-2', name: 'Test Seller' }, car: { id: `v-${id}`, title },
  amount: 1000000, status: 'pending', viewerRole: 'buyer', availableActions: ['view_funding_instructions'],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
vi.mock('../../services/escrowApi', async () => {
  const actual = await vi.importActual<any>('../../services/escrowApi');
  return {
    ...actual,
    getEscrowProgram: vi.fn(async () => ({ enabled: true, fundingMethods: ['bank_transfer'], releaseDays: 3, minimumAmount: 0, maximumAmount: null, currency: 'KES' })),
    getMyEscrowOverview: vi.fn(async () => ({
      escrows: [deal('deal-1', 'First Deal Vehicle'), deal('deal-2', 'Second Deal Vehicle')],
      summary: { scope: 'participant', currency: 'KES', totalDeals: 2, heldAmount: 0, heldCount: 0, pendingFundingCount: 2, activeCount: 2, settledCount: 0, needsActionCount: 0 },
    })),
  };
});

// NOTE: this file previously asserted that the public EscrowView page itself
// opened a "deals" tab and rendered a specific participant deal inline when
// visited with ?escrowId=<id>. That inline-rendering behavior was removed as
// part of the Stage 22 public-facing convergence pass: the public escrow page
// (src/features/EscrowView.tsx) now never loads participant deal data for
// any user, signed in or not (verified by grep: EscrowView.tsx contains no
// reference to getMyEscrowOverview or escrowId). Deep-linking to a specific
// deal by id now lives in the authenticated src/features/escrow/
// ParticipantEscrowDesk.tsx, reached via the buyer/seller portal, not on this
// public page. The assertions below were rewritten to guard the current,
// intentional behavior (no participant data leak on the public page, deep
// link is simply ignored there) instead of testing a capability that no
// longer exists on this component. Deep-linking coverage for
// ParticipantEscrowDesk itself is not yet written — flagged as a gap in
// KAYAD_MASTER_POLISH_AUDIT.md rather than silently dropped.
describe('EscrowView deep-linking (public page no longer renders participant deals)', () => {
  afterEach(() => { window.history.pushState({}, '', '/'); });

  it('does not render any participant deal inline when ?escrowId= is present, even for a signed-in buyer', async () => {
    window.history.pushState({}, '', '/?escrowId=deal-2');
    render(<EscrowView user={user} />);
    expect(await screen.findByRole('heading', { name: 'Escrow' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Second Deal Vehicle' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'First Deal Vehicle' })).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('never calls getMyEscrowOverview from the public page regardless of the escrowId query param', async () => {
    window.history.pushState({}, '', '/?escrowId=does-not-exist');
    render(<EscrowView user={user} />);
    await screen.findByRole('heading', { name: 'Escrow' });
    expect(escrowApiMock.getMyEscrowOverview).not.toHaveBeenCalled();
  });

  it('leaves the escrowId query param untouched rather than stripping or redirecting on it', async () => {
    window.history.pushState({}, '', '/?escrowId=deal-2');
    render(<EscrowView user={user} />);
    await waitFor(() => expect(new URLSearchParams(window.location.search).get('escrowId')).toBe('deal-2'));
  });
});
