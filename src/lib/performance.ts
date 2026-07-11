/**
 * Advanced Performance Optimization Hooks
 * Comprehensive hooks for preventing unnecessary re-renders and optimizing React applications
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// Memoization Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Stable callback reference that only changes when dependencies change
 * Similar to useCallback but with additional optimizations
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  const depsRef = useRef(deps);
  
  // Update refs when dependencies change
  if (!shallowEqual(depsRef.current, deps)) {
    depsRef.current = deps;
    callbackRef.current = callback;
  }
  
  return useCallback(
    (...args: Parameters<T>) => callbackRef.current(...args),
    depsRef.current
  ) as T;
}

/**
 * Stable value reference that only changes when value actually changes
 */
export function useStableValue<T>(value: T, deps: React.DependencyList): T {
  const valueRef = useRef(value);
  const depsRef = useRef(deps);
  
  if (!shallowEqual(depsRef.current, deps)) {
    depsRef.current = deps;
    valueRef.current = value;
  }
  
  return valueRef.current;
}

/**
 * Shallow equality check for dependency arrays
 */
function shallowEqual(a: React.DependencyList, b: React.DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// List Virtualization Hook (for 100k+ items)
// ─────────────────────────────────────────────────────────────

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

export function useVirtualList<T>(
  items: T[],
  options: {
    itemHeight: number | ((index: number) => number);
    containerHeight: number;
    overscan?: number;
  }
): {
  virtualItems: VirtualItem[];
  totalHeight: number;
  scrollToIndex: (index: number) => void;
} {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate item sizes
  const itemSizes = useMemo(() => {
    return items.map((_, index) => 
      typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
    );
  }, [items, itemHeight]);
  
  // Calculate positions
  const positions = useMemo(() => {
    const pos: number[] = [];
    let current = 0;
    for (const size of itemSizes) {
      pos.push(current);
      current += size;
    }
    return pos;
  }, [itemSizes]);
  
  // Total height
  const totalHeight = useMemo(() => {
    return positions.length > 0 
      ? positions[positions.length - 1] + itemSizes[itemSizes.length - 1]
      : 0;
  }, [positions, itemSizes]);
  
  // Find visible range
  const virtualItems = useMemo(() => {
    if (items.length === 0) return [];
    
    const startOffset = positions.findIndex(pos => pos >= scrollTop);
    const endOffset = positions.findLastIndex(
      pos => pos < scrollTop + containerHeight
    );
    
    if (startOffset === -1 || endOffset === -1) return [];
    
    const start = Math.max(0, startOffset - overscan);
    const end = Math.min(items.length - 1, endOffset + overscan);
    
    const result: VirtualItem[] = [];
    for (let i = start; i <= end; i++) {
      result.push({
        index: i,
        start: positions[i],
        size: itemSizes[i],
      });
    }
    
    return result;
  }, [items.length, positions, itemSizes, scrollTop, containerHeight, overscan]);
  
  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  // Scroll to index
  const scrollToIndex = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return;
    const targetScroll = positions[index] - containerHeight / 2 + itemSizes[index] / 2;
    return targetScroll;
  }, [items.length, positions, containerHeight, itemSizes]);
  
  return { 
    virtualItems, 
    totalHeight,
    scrollToIndex: (index: number) => {
      const targetScroll = scrollToIndex(index);
      if (targetScroll !== undefined) {
        setScrollTop(Math.max(0, targetScroll));
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Batch State Updates
// ─────────────────────────────────────────────────────────────

/**
 * Batched state updates for reducing re-renders
 */
export function useBatchedUpdates<T extends object>(initialState: T) {
  const [state, setState] = useState(initialState);
  const pendingRef = useRef<Partial<T> | null>(null);
  const rafRef = useRef<number | null>(null);
  
  const setBatchedState = useCallback((update: Partial<T> | ((prev: T) => Partial<T>)) => {
    pendingRef.current = typeof update === 'function'
      ? (update as (prev: T) => Partial<T>)(state)
      : update;
    
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingRef.current) {
          setState(prev => ({ ...prev, ...pendingRef.current }));
          pendingRef.current = null;
        }
        rafRef.current = null;
      });
    }
  }, [state]);
  
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  return [state, setBatchedState] as const;
}

// ─────────────────────────────────────────────────────────────
// Prefetch Resources
// ─────────────────────────────────────────────────────────────

/**
 * Prefetch images for faster subsequent loads
 */
export function usePrefetchImages(urls: string[]) {
  useEffect(() => {
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, [urls]);
}

// ─────────────────────────────────────────────────────────────
// Intersection Observer Hook
// ─────────────────────────────────────────────────────────────

export interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserverAdvanced(
  options: UseIntersectionObserverOptions = {}
) {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
  } = options;
  
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const frozenRef = useRef(false);
  
  const frozen = freezeOnceVisible && frozenRef.current;
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element || frozen) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        setIsVisible(entry.isIntersecting);
        
        if (entry.isIntersecting && freezeOnceVisible) {
          frozenRef.current = true;
        }
      },
      { threshold, root, rootMargin }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [threshold, root, rootMargin, freezeOnceVisible, frozen]);
  
  const ref = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
  }, []);
  
  return { ref, entry, isVisible };
}

// ─────────────────────────────────────────────────────────────
// Web Vitals Monitoring
// ─────────────────────────────────────────────────────────────

export interface WebVitals {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
}

export function useWebVitals() {
  const [vitals, setVitals] = useState<WebVitals>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
  });
  
  useEffect(() => {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setVitals(prev => ({ ...prev, lcp: lastEntry.startTime }));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        setVitals(prev => ({ ...prev, fid: entries[0].processingStart - entries[0].startTime }));
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      setVitals(prev => ({ ...prev, cls: clsValue }));
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    
    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        setVitals(prev => ({ ...prev, fcp: entries[0].startTime }));
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });
    
    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      fcpObserver.disconnect();
    };
  }, []);
  
  return vitals;
}

// ─────────────────────────────────────────────────────────────
// Resource Hints
// ─────────────────────────────────────────────────────────────

export function ResourceHints() {
  useEffect(() => {
    // Preconnect to critical origins
    const preconnects = [
      'https://images.unsplash.com',
      'https://res.cloudinary.com',
      'https://supabase.co',
    ];
    
    preconnects.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
    
    // DNS prefetch for less critical origins
    const dnsPrefetches = [
      'https://fonts.googleapis.com',
    ];
    
    dnsPrefetches.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = origin;
      document.head.appendChild(link);
    });
  }, []);
  
  return null;
}

// ─────────────────────────────────────────────────────────────
// Media Query Hook
// ─────────────────────────────────────────────────────────────

export function useMediaQueryAdvanced(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  
  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } 
    // Legacy API
    else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);
  
  return matches;
}
