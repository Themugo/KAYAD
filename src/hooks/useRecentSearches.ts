import { useCallback, useEffect, useState } from 'react';
import { preferencesAPI } from '../api/api.exports';
import { useOptionalAuth } from '../context/AuthContext';

const RECENT_KEY = 'kayad_recent_searches';
const MAX_RECENT = 5;

function readLocal(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function writeLocal(values: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(values.slice(0, MAX_RECENT))); } catch {}
}

/** Phase 53: one recent-search state boundary. Authenticated users persist
 * recent searches through the real user-preferences API; anonymous visitors
 * retain a deliberately local browser history because there is no user to
 * persist it against. API failures do not masquerade as successful writes. */
export function useRecentSearches() {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setRecentSearches(readLocal());
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const response = await preferencesAPI.get();
        const values = response?.data?.search?.recentSearches;
        if (!cancelled && Array.isArray(values)) {
          setRecentSearches(values.filter((value: unknown): value is string => typeof value === 'string').slice(0, MAX_RECENT));
        }
      } catch {
        if (!cancelled) setRecentSearches([]);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const addRecentSearch = useCallback(async (query: string) => {
    const normalized = query.trim();
    if (!normalized) return;

    if (!userId) {
      const next = [normalized, ...readLocal().filter(s => s.toLowerCase() !== normalized.toLowerCase())].slice(0, MAX_RECENT);
      writeLocal(next);
      setRecentSearches(next);
      return;
    }

    try {
      const response = await preferencesAPI.addRecentSearch(normalized);
      const values = response?.data?.recentSearches;
      if (Array.isArray(values)) {
        setRecentSearches(values.filter((value: unknown): value is string => typeof value === 'string').slice(0, MAX_RECENT));
      }
    } catch {
      // Keep the last confirmed server state; do not fabricate persistence.
    }
  }, [userId]);

  const clearRecentSearches = useCallback(async () => {
    if (!userId) {
      try { localStorage.removeItem(RECENT_KEY); } catch {}
      setRecentSearches([]);
      return;
    }
    try {
      await preferencesAPI.clearRecentSearches();
      setRecentSearches([]);
    } catch {
      // Keep the last confirmed server state on failure.
    }
  }, [userId]);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}
