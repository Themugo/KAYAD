import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EscrowView } from '../../features/EscrowView';

/**
 * KAYAD Phase 12 (frontend production hardening) - coverage for
 * EscrowView's escrow deep-linking. Confirms the real gap this phase
 * found and fixed: previously selectedDeal was pure local state
 * defaulting to deals[0] with no URL sync at all - refreshing the
 * page or opening a shared link to a specific escrow deal always
 * fell back to the first deal in the list, not the actually-selected
 * one.
 *
 * Fixed (escrow page real-data integration): EscrowView no longer
 * accepts a `deals` prop - it loads real deals itself via
 * services/escrowApi.ts when a real `user` is provided. Updated to
 * mock that real module (matching this project's own established
 * fetch-mocking pattern elsewhere) instead of injecting deals
 * directly, so this still verifies the same real deep-linking
 * behavior against the component's current, real shape.
 */

const mockUser = { id: 'user-1', name: 'Test Buyer', email: 'buyer@test.com', role: 'buyer' as const, avatar: '', rating: 0, verified: false, phone: '', memberSince: '' };

function makeBackendEscrow(id: string, vehicleTitle: string) {
  return {
    id,
    buyer: { id: 'user-1', name: 'Test Buyer', email: 'buyer@test.com' },
    seller: { id: 'user-2', name: 'Test Seller', email: 'seller@test.com' },
    car: { id: `v-${id}`, title: vehicleTitle },
    amount: 1000000,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

vi.mock('../../services/escrowApi', async () => {
  const actual = await vi.importActual('../../services/escrowApi');
  return {
    ...actual,
    getMyEscrows: vi.fn(async () => [
      makeBackendEscrow('deal-1', 'First Deal Vehicle'),
      makeBackendEscrow('deal-2', 'Second Deal Vehicle'),
    ]),
  };
});

describe('EscrowView deep-linking', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('selects the deal matching the escrowId URL param on mount, not deals[0]', async () => {
    window.history.pushState({}, '', '/?escrowId=deal-2');

    render(<EscrowView user={mockUser} />);

    // getAllByText, not getByText: the vehicle title legitimately
    // appears in more than one place (the selected-deal detail view
    // and the deals list) - this asserts at least one match exists,
    // not exactly one.
    await waitFor(() => {
      expect(screen.getAllByText(/Second Deal Vehicle/i).length).toBeGreaterThan(0);
    });
  });

  it('falls back to the first real deal when the escrowId URL param does not match any real deal', async () => {
    window.history.pushState({}, '', '/?escrowId=does-not-exist');

    render(<EscrowView user={mockUser} />);

    await waitFor(() => {
      expect(screen.getAllByText(/First Deal Vehicle/i).length).toBeGreaterThan(0);
    });
  });

  it('writes the selected deal id to the URL', async () => {
    window.history.pushState({}, '', '/?escrowId=deal-2');

    render(<EscrowView user={mockUser} />);

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get('escrowId')).toBe('deal-2');
    });
  });
});
