import { useEffect, useState } from 'react';
import { getMyWorkspace } from '../../services/dealerPlatformApi';

export type DealershipMembership = { dealershipName: string; teamRole: string; permissions: string[] };
export type MyDealership = { loading: boolean; membership: DealershipMembership | null; ambiguous: boolean; error: boolean };

const cache = new Map<string, Promise<{ membership: DealershipMembership | null; ambiguous: boolean }>>();
/** Test/logout helper: membership can change (hired/fired), so the cache is per user and cleared on demand. */
export const resetMyDealershipCache = () => cache.clear();

/** Does this signed-in PERSONAL account work for a dealership? Fails closed: any error means "no workspace shown". */
export function useMyDealership(userId?: string | null, role?: string | null): MyDealership {
  const enabled = !!userId && role === 'user';
  const [state, setState] = useState<MyDealership>({ loading: enabled, membership: null, ambiguous: false, error: false });
  useEffect(() => {
    if (!enabled || !userId) { setState({ loading: false, membership: null, ambiguous: false, error: false }); return; }
    let live = true;
    let p = cache.get(userId);
    if (!p) { p = getMyWorkspace(); cache.set(userId, p); p.catch(() => cache.delete(userId)); }
    p.then((d) => { if (live) setState({ loading: false, membership: d.membership || null, ambiguous: !!d.ambiguous, error: false }); })
     .catch(() => { if (live) setState({ loading: false, membership: null, ambiguous: false, error: true }); });
    return () => { live = false; };
  }, [enabled, userId]);
  return state;
}
