import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Vehicle } from '../types';
import { getFavorites, toggleFavorite, FavoriteApiError } from '../services/favoriteApi';

/**
 * Phase 1 architecture hardening: extracted from App.tsx (savedVehicles/
 * comparedVehicles state, toggle handlers, derived lists).
 *
 * Phase 2 (eliminate mock business state): savedVehicles is now backed
 * by the real backend `favorites` API for authenticated users -
 * confirmed real, tested, working (services/favoriteApi.ts). This is a
 * genuine CONNECTED integration, not just a single successful read:
 * fetches the real list on mount/login, and every toggle calls the
 * real POST /api/favorites/:carId/toggle endpoint with optimistic UI
 * update and rollback on failure.
 *
 * A real, permanent behavioral split, not a network-failure fallback:
 * the backend's favorite routes are auth-required (confirmed via
 * `router.use(protect)` in favoriteRoutes.js) - there is no anonymous-
 * favorites concept on the backend at all. So:
 * - Logged in: real API is the source of truth. A network failure
 *   here IS treated as a genuine error condition (surfaced via
 *   favoritesError), not silently swallowed, since a logged-in user
 *   reasonably expects their real saved list to load.
 * - Logged out: local-only state (the original, pre-Phase-2 behavior,
 *   starting empty and populated only by explicit user actions - this is not a
 *   fallback for a failure, it's the correct, permanent behavior for
 *   a user the backend has no way to persist anything for.
 *
 * Comparison selection is intentionally not owned here. Phase 47 consolidates
 * comparison into CompareContext, the app's existing persisted client-state
 * boundary, so favorites and comparison no longer have competing sources.
 */
export function useVehicleCollections(vehicles: Vehicle[], userId?: string | null) {
  const [savedVehicles, setSavedVehicles] = useState<string[]>([]);
  const [isFetchingFavorites, setIsFetchingFavorites] = useState<boolean>(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  // Tracks in-flight optimistic toggles by car ID, so a rapid
  // double-click can't race itself into an inconsistent state - a
  // second toggle on the same ID while one is already in flight is
  // ignored rather than sent, matching this program's established
  // "don't introduce new race conditions while fixing old ones"
  // caution (Phase 8).
  const pendingToggles = useRef<Set<string>>(new Set());

  // Fetch real favorites on mount / whenever the authenticated user
  // changes (covers login and logout during the same session, not
  // just app-load). Logged out (userId falsy): does nothing, leaves
  // the local default in place - the correct behavior per this hook's
  // own documented split above, not a fetch that was skipped by
  // accident.
  useEffect(() => {
    if (!userId) {
      // A logout is a hard session boundary. Never leak the previous
      // authenticated user's saved vehicles into another session.
      setSavedVehicles([]);
      setFavoritesError(null);
      setIsFetchingFavorites(false);
      return;
    }
    let cancelled = false;
    setIsFetchingFavorites(true);
    setFavoritesError(null);
    (async () => {
      try {
        const res = await getFavorites({ limit: 50 });
        if (!cancelled) {
          const ids = res.favorites
            .map((f) => f.id || f._id)
            .filter((id): id is string => Boolean(id));
          setSavedVehicles(ids);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof FavoriteApiError
              ? err.message
              : 'Unable to load your saved vehicles right now.';
          setFavoritesError(message);
          // Deliberately does NOT clear savedVehicles on failure - a
          // logged-in user who briefly loses connectivity shouldn't
          // see their previously-known saved list vanish; it simply
          // stops being confirmed-fresh until the next successful
          // fetch or toggle.
        }
      } finally {
        if (!cancelled) setIsFetchingFavorites(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Toggle Save - real API call when authenticated, local-only
  // otherwise. Optimistic: UI updates immediately, rolled back if the
  // real request fails, so the interaction still feels instant (the
  // pre-Phase-2 behavior) while now reflecting real, persisted state.
  const handleToggleSave = useCallback((id: string) => {
    if (!userId) {
      // Not authenticated - same local-only behavior as before Phase 2,
      // since there is no backend concept to connect to for an
      // anonymous visitor.
      setSavedVehicles((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
      return;
    }

    if (pendingToggles.current.has(id)) return; // ignore a rapid re-click while one is in flight
    pendingToggles.current.add(id);

    const wasSaved = savedVehicles.includes(id);
    // Optimistic update
    setSavedVehicles((prev) => (wasSaved ? prev.filter((item) => item !== id) : [...prev, id]));
    setFavoritesError(null);

    toggleFavorite(id)
      .then((res) => {
        // Reconcile with the server's actual result rather than
        // trusting the optimistic guess blindly - protects against a
        // state drift if something else (another tab, a concurrent
        // action) changed the real favorite state between the
        // optimistic update and this response.
        setSavedVehicles((prev) => {
          const isSaved = prev.includes(id);
          if (res.favorited === isSaved) return prev;
          return res.favorited ? [...prev, id] : prev.filter((item) => item !== id);
        });
      })
      .catch((err) => {
        // Roll back the optimistic update on failure.
        setSavedVehicles((prev) => (wasSaved ? [...prev, id] : prev.filter((item) => item !== id)));
        const message =
          err instanceof FavoriteApiError ? err.message : 'Unable to update your saved vehicles right now.';
        setFavoritesError(message);
      })
      .finally(() => {
        pendingToggles.current.delete(id);
      });
  }, [userId, savedVehicles]);

  const savedVehiclesList = useMemo(() => {
    return vehicles.filter((v) => savedVehicles.includes(v.id));
  }, [vehicles, savedVehicles]);

  return {
    savedVehicles,
    savedVehiclesList,
    handleToggleSave,
    isFetchingFavorites,
    favoritesError,
  };
}
