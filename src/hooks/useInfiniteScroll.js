import { useCallback, useRef, useEffect } from 'react';

export function useInfiniteScroll(onLoadMore, hasMore, threshold = 300) {
  const observerRef = useRef(null);
  const sentinelRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node || !hasMore) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { rootMargin: `${threshold}px` }
    );
    observerRef.current.observe(node);
  }, [onLoadMore, hasMore, threshold]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return sentinelRef;
}
