import { useEffect, useState } from 'react';
import { getMyWorkspace } from '../../services/dealerPlatformApi';

export type DealershipMembership = { dealerId?: string; dealershipName: string; teamRole: string; permissions: string[] };
export type DealershipChoice = { dealerId: string; dealershipName: string };
export type MyDealership = { loading: boolean; membership: DealershipMembership | null; ambiguous: boolean; choices: DealershipChoice[]; error: boolean };

const cache = new Map<string, Promise<{ membership: DealershipMembership | null; ambiguous: boolean; choices?: DealershipChoice[] }>>();
const ORG_KEY = 'kayad_dealer_org';
/** Remember which dealership this person is working in (sent as X-Dealer-Org; the server validates it against their ACTIVE memberships). */
export function selectDealership(dealerId: string | null) {
  try { if (dealerId) localStorage.setItem(ORG_KEY, dealerId); else localStorage.removeItem(ORG_KEY); } catch { /* storage unavailable */ }
  cache.clear();
}
/** Test/logout helper: membership can change (hired/fired), so the cache is per user and cleared on demand. */
export const resetMyDealershipCache = () => cache.clear();

/** Does this signed-in PERSONAL account work for a dealership? Fails closed: any error means "no workspace shown". */
export function useMyDealership(userId?: string | null, role?: string | null): MyDealership {
  const enabled = !!userId && role === 'user';
  const [state, setState] = useState<MyDealership>({ loading: enabled, membership: null, ambiguous: false, choices: [], error: false });
  useEffect(() => {
    if (!enabled || !userId) { setState({ loading: false, membership: null, ambiguous: false, choices: [], error: false }); return; }
    let live = true;
    let p = cache.get(userId);
    if (!p) { p = getMyWorkspace(); cache.set(userId, p); p.catch(() => cache.delete(userId)); }
    p.then((d) => { if (d.membership?.dealerId) { try { localStorage.setItem(ORG_KEY, d.membership.dealerId); } catch { /* ignore */ } } if (live) setState({ loading: false, membership: d.membership || null, ambiguous: !!d.ambiguous, choices: d.choices || [], error: false }); })
     .catch(() => { if (live) setState({ loading: false, membership: null, ambiguous: false, choices: [], error: true }); });
    return () => { live = false; };
  }, [enabled, userId]);
  return state;
}
