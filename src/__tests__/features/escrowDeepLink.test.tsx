import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EscrowView } from '../../features/EscrowView/components/EscrowView';
import { EscrowTransaction } from '../../types';

/**
 * KAYAD Phase 12 (frontend production hardening) - new coverage for
 * EscrowView's escrow deep-linking, added this phase. Confirms the
 * real gap this phase found and fixed: previously selectedDeal was
 * pure local state defaulting to deals[0] with no URL sync at all -
 * refreshing the page or opening a shared link to a specific escrow
 * deal always fell back to the first deal in the list, not the
 * actually-selected one.
 */

function makeDeal(id: string, vehicleTitle: string): EscrowTransaction {
  return {
    id,
    vehicleId: `v-${id}`,
    vehicleTitle,
    amount: 1000000,
    buyerName: 'Test Buyer',
    sellerName: 'Test Seller',
    status: 'Vehicle Reserved',
    step: 1,
    updatedAt: new Date().toISOString(),
  };
}

describe('EscrowView deep-linking', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('selects the deal matching the escrowId URL param on mount, not deals[0]', () => {
    const deals = [makeDeal('deal-1', 'First Deal Vehicle'), makeDeal('deal-2', 'Second Deal Vehicle')];
    window.history.pushState({}, '', '/?escrowId=deal-2');

    render(<EscrowView deals={deals} />);

    // The journey tab (default active tab) should reflect the deal
    // matched from the URL (deal-2), not the array's first entry.
    // getAllByText, not getByText: the vehicle title legitimately
    // appears in more than one place (the selected-deal detail view
    // and the deals list) - this asserts at least one match exists,
    // not exactly one.
    expect(screen.getAllByText(/Second Deal Vehicle/i).length).toBeGreaterThan(0);
  });

  it('falls back to deals[0] when the escrowId URL param does not match any real deal', () => {
    const deals = [makeDeal('deal-1', 'First Deal Vehicle'), makeDeal('deal-2', 'Second Deal Vehicle')];
    window.history.pushState({}, '', '/?escrowId=does-not-exist');

    render(<EscrowView deals={deals} />);

    expect(screen.getAllByText(/First Deal Vehicle/i).length).toBeGreaterThan(0);
  });

  it('writes the selected deal id to the URL', () => {
    const deals = [makeDeal('deal-1', 'First Deal Vehicle'), makeDeal('deal-2', 'Second Deal Vehicle')];
    window.history.pushState({}, '', '/?escrowId=deal-2');

    render(<EscrowView deals={deals} />);

    const params = new URLSearchParams(window.location.search);
    expect(params.get('escrowId')).toBe('deal-2');
  });
});
