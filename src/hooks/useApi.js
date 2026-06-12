// src/hooks/useApi.js
// ─────────────────────────────────────────────────────────
// Generic data-fetching hook with loading / error / refetch
// ─────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(fn, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData]       = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError]     = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetch = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      if (mountedRef.current) setData(result);
      return result;
    } catch (err) {
      if (mountedRef.current) setError(err);
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) {
      // Errors are surfaced via the `error` state. Swallow the rethrow here
      // so an initial fetch failure does not become an unhandled rejection.
      fetch().catch(() => {});
    }
  }, [fetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: fetch };
}

// ─────────────────────────────────────────────────────────
// Debounce hook — delays value update by `delay` ms
// ─────────────────────────────────────────────────────────
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────
// Pagination hook
// ─────────────────────────────────────────────────────────
export function usePagination(fetchFn, { limit = 12, deps = [] } = {}) {
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const result = await fetchFn({ page: p, limit });
      const data = result.data || result.cars || result.users || result.items || [];
      const tot  = result.pagination?.total || result.total || 0;
      setItems(data);
      setTotal(tot);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [page, limit, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(1); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / limit);

  return {
    items, loading, total, page, totalPages,
    nextPage: () => { if (page < totalPages) load(page + 1); },
    prevPage: () => { if (page > 1) load(page - 1); },
    goToPage: (p) => load(p),
    refetch: () => load(page),
  };
}

// ─────────────────────────────────────────────────────────
// Local storage hook
// ─────────────────────────────────────────────────────────
export function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; }
    catch { return initial; }
  });
  const set = useCallback((v) => {
    const next = typeof v === 'function' ? v(val) : v;
    setVal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch { /* storage quota exceeded or unavailable */ }
  }, [key, val]);
  return [val, set];
}

// ─────────────────────────────────────────────────────────
// Window size hook
// ─────────────────────────────────────────────────────────
export function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}
