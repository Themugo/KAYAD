import { useCallback, useEffect, useRef, useState } from 'react';
import { getFavorites } from '../../../services/favoriteApi';
import { leadApi } from '../../../services/leadApi';

/**
 * Buying-side activity for the unified personal dashboard. Every number comes from an existing backend endpoint
 * (saved vehicles: GET /api/favorites; negotiations: GET /api/leads/mine/offers). A failed request is reported as
 * `unavailable`; it is never shown as zero and nothing is estimated or mocked.
 */
export type ActivityMetric = { state: 'loading' } | { state: 'ready'; value: number } | { state: 'unavailable' };

export interface BuyingActivity {
  saved: ActivityMetric;
  negotiations: ActivityMetric;
  refresh: () => void;
}

export function useBuyingActivity(enabled = true): BuyingActivity {
  const [saved, setSaved] = useState<ActivityMetric>({ state: 'loading' });
  const [negotiations, setNegotiations] = useState<ActivityMetric>({ state: 'loading' });
  const [tick, setTick] = useState(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setSaved({ state: 'loading' });
    setNegotiations({ state: 'loading' });
    (async () => {
      const [fav, neg] = await Promise.allSettled([getFavorites({ page: 1, limit: 1 }), leadApi.myNegotiations()]);
      if (cancelled || !alive.current) return;
      if (fav.status === 'fulfilled') {
        const v = fav.value as { pagination?: { total?: number }; total?: number } | undefined;
        const total = v?.pagination?.total ?? v?.total;
        setSaved(typeof total === 'number' && Number.isFinite(total) ? { state: 'ready', value: total } : { state: 'unavailable' });
      } else setSaved({ state: 'unavailable' });
      if (neg.status === 'fulfilled') {
        const leads = (neg.value as { leads?: unknown[] } | undefined)?.leads;
        setNegotiations(Array.isArray(leads) ? { state: 'ready', value: leads.length } : { state: 'unavailable' });
      } else setNegotiations({ state: 'unavailable' });
    })();
    return () => { cancelled = true; };
  }, [enabled, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { saved, negotiations, refresh };
}

export const metricLabel = (m: ActivityMetric): string => (m.state === 'ready' ? m.value.toLocaleString() : m.state === 'loading' ? '—' : 'Unavailable');

/** Escrow-derived transaction counters (from the escrows the dashboard already loads). */
export function summariseEscrows(escrows: Array<{ status: string }>) {
  const isTerminal = (s: string) => ['closed', 'cancelled', 'refunded', 'released'].includes(s);
  return {
    pendingFunding: escrows.filter((e) => e.status === 'pending').length,
    active: escrows.filter((e) => !isTerminal(e.status)).length,
    completed: escrows.filter((e) => e.status === 'released' || e.status === 'closed').length,
    refundedOrCancelled: escrows.filter((e) => e.status === 'refunded' || e.status === 'cancelled').length,
    disputed: escrows.filter((e) => e.status === 'disputed').length,
  };
}
