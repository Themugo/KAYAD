import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const getFavorites = vi.fn();
const myNegotiations = vi.fn();
vi.mock('../../services/favoriteApi', () => ({ getFavorites: (...a: unknown[]) => getFavorites(...a) }));
vi.mock('../../services/leadApi', () => ({ leadApi: { myNegotiations: () => myNegotiations() } }));

import { useBuyingActivity, metricLabel, summariseEscrows } from '../../features/PrivateSellerPlatform/hooks/useBuyingActivity';

describe('useBuyingActivity (real endpoints only, never a fabricated zero)', () => {
  beforeEach(() => { getFavorites.mockReset(); myNegotiations.mockReset(); });

  it('reports saved vehicles and negotiations from the API responses', async () => {
    getFavorites.mockResolvedValue({ success: true, favorites: [], total: 7, pagination: { page: 1, limit: 1, total: 7, pages: 7 } });
    myNegotiations.mockResolvedValue({ leads: [{ id: 'a' }, { id: 'b' }] });
    const { result } = renderHook(() => useBuyingActivity(true));
    expect(metricLabel(result.current.saved)).toBe('—');
    await waitFor(() => expect(result.current.saved).toEqual({ state: 'ready', value: 7 }));
    expect(result.current.negotiations).toEqual({ state: 'ready', value: 2 });
  });

  it('shows Unavailable, not 0, when a request fails; the other metric is unaffected', async () => {
    getFavorites.mockRejectedValue(new Error('network'));
    myNegotiations.mockResolvedValue({ leads: [] });
    const { result } = renderHook(() => useBuyingActivity(true));
    await waitFor(() => expect(result.current.saved.state).toBe('unavailable'));
    expect(metricLabel(result.current.saved)).toBe('Unavailable');
    expect(result.current.negotiations).toEqual({ state: 'ready', value: 0 });
  });

  it('does not call the backend while disabled', () => {
    renderHook(() => useBuyingActivity(false));
    expect(getFavorites).not.toHaveBeenCalled();
    expect(myNegotiations).not.toHaveBeenCalled();
  });

  it('summarises escrow states without double counting', () => {
    const s = summariseEscrows([{ status: 'pending' }, { status: 'funded' }, { status: 'released' }, { status: 'closed' }, { status: 'refunded' }, { status: 'disputed' }]);
    expect(s).toEqual({ pendingFunding: 1, active: 3, completed: 2, refundedOrCancelled: 1, disputed: 1 });
  });
});
