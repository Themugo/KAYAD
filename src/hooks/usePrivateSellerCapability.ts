import { useCallback, useEffect, useState } from 'react';
import { getMySellerCapability, type SellerCapability } from '../services/privateSellerCapabilityApi';

/** Loads the real private-seller state. No default is invented: while loading or on error `capability` is null. */
export function usePrivateSellerCapability(enabled: boolean) {
  const [capability, setCapability] = useState<SellerCapability | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const next = await getMySellerCapability();
        if (!cancelled) { setCapability(next); setError(''); }
      } catch {
        if (!cancelled) setError('Your seller status could not be loaded. Buyer features are not affected.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, tick]);

  const reload = useCallback(() => { setLoading(true); setError(''); setTick((n) => n + 1); }, []);
  return { capability, loading, error, reload };
}
