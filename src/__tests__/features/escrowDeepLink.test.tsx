import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EscrowView } from '../../features/EscrowView';

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

describe('EscrowView deep-linking', () => {
  afterEach(() => { window.history.pushState({}, '', '/'); });

  it('opens the deals tab and selects the deal named by ?escrowId=', async () => {
    window.history.pushState({}, '', '/?escrowId=deal-2');
    render(<EscrowView user={user} />);
    expect(await screen.findByRole('heading', { name: 'Second Deal Vehicle' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'First Deal Vehicle' })).toBeNull();
  });

  it('does NOT silently fall back to another deal when the id is unknown', async () => {
    window.history.pushState({}, '', '/?escrowId=does-not-exist');
    render(<EscrowView user={user} />);
    expect(await screen.findByTestId('escrow-unknown-link')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'First Deal Vehicle' })).toBeNull();
  });

  it('keeps the selected id in the URL', async () => {
    window.history.pushState({}, '', '/?escrowId=deal-2');
    render(<EscrowView user={user} />);
    await waitFor(() => expect(new URLSearchParams(window.location.search).get('escrowId')).toBe('deal-2'));
  });
});
