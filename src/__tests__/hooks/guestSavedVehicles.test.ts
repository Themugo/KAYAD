import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVehicleCollections } from '../../hooks/useVehicleCollections';

const fav = vi.hoisted(() => ({ getFavorites: vi.fn(), toggleFavorite: vi.fn() }));
vi.mock('../../services/vehicleApi', () => ({ getCarById: vi.fn(), mapBackendCarToVehicle: vi.fn() }));
vi.mock('../../services/favoriteApi', () => ({
  getFavorites: fav.getFavorites,
  toggleFavorite: fav.toggleFavorite,
  FavoriteApiError: class extends Error {},
}));

const KEY = 'kayad.guestSavedVehicles';
beforeEach(() => { window.localStorage.clear(); fav.getFavorites.mockReset(); fav.toggleFavorite.mockReset(); });

describe('saving a vehicle while signed out', () => {
  it('keeps the visitor’s picks in the browser across reloads', () => {
    const first = renderHook(() => useVehicleCollections([], null));
    act(() => first.result.current.handleToggleSave('c1'));
    act(() => first.result.current.handleToggleSave('c2'));
    expect(JSON.parse(window.localStorage.getItem(KEY) || '[]')).toEqual(['c1', 'c2']);
    first.unmount();
    const again = renderHook(() => useVehicleCollections([], null));
    expect(again.result.current.savedVehicles).toEqual(['c1', 'c2']);
    act(() => again.result.current.handleToggleSave('c1'));
    expect(JSON.parse(window.localStorage.getItem(KEY) || '[]')).toEqual(['c2']);
  });

  it('merges the picks into the account after sign-in and clears the browser copy', async () => {
    window.localStorage.setItem(KEY, JSON.stringify(['c1', 'c9']));
    fav.getFavorites.mockResolvedValue({ favorites: [{ id: 'c1' }] });
    fav.toggleFavorite.mockResolvedValue({ favorited: true });
    const { result } = renderHook(() => useVehicleCollections([], 'user-1'));
    await waitFor(() => expect(result.current.savedVehicles.sort()).toEqual(['c1', 'c9']));
    expect(fav.toggleFavorite).toHaveBeenCalledTimes(1);
    expect(fav.toggleFavorite).toHaveBeenCalledWith('c9');
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('never shows one account’s saved list to the next signed-out visitor', async () => {
    fav.getFavorites.mockResolvedValue({ favorites: [{ id: 'private-1' }] });
    const { result, rerender } = renderHook(({ u }: { u: string | null }) => useVehicleCollections([], u), { initialProps: { u: 'user-1' as string | null } });
    await waitFor(() => expect(result.current.savedVehicles).toEqual(['private-1']));
    rerender({ u: null });
    await waitFor(() => expect(result.current.savedVehicles).toEqual([]));
  });
});
