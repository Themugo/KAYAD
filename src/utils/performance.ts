/**
 * Performance Monitoring and Optimization Utilities
 * Provides tools for measuring and improving app performance
 */

export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  /**
   * Mark a performance checkpoint
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined') {
      this.marks.set(name, performance.now());
      performance.mark(`kayad-${name}`);
    }
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark: string): number {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(`kayad-${name}`, `kayad-${startMark}`, `kayad-${endMark}`);
        const measure = performance.getEntriesByName(`kayad-${name}`)[0];
        if (measure) {
          const duration = measure.duration;
          this.measures.set(name, duration);
          return duration;
        }
      } catch (e) {
        console.warn(`Performance measure failed: ${name}`, e);
      }
    }
    return 0;
  }

  /**
   * Get all recorded measures
   */
  getMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures);
  }

  /**
   * Clear all marks and measures
   */
  clear(): void {
    this.marks.clear();
    this.measures.clear();
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }

  /**
   * Log Web Vitals
   */
  logWebVitals(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            console.log('[Performance]', entry.name, entry.duration);
          });
        });
        observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported');
      }
    }
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request animation frame throttle
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  callback: T
): (...args: Parameters<T>) => void {
  let requestId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  const later = () => {
    requestId = null;
    if (lastArgs) {
      callback(...lastArgs);
      lastArgs = null;
    }
  };

  return function executedFunction(...args: Parameters<T>) {
    lastArgs = args;
    if (requestId === null) {
      requestId = requestAnimationFrame(later);
    }
  };
}

/**
 * Lazy load images with intersection observer
 */
export function lazyLoadImage(img: HTMLImageElement, src: string): void {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  } else {
    img.src = src;
  }
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string): void {
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }
}

/**
 * Measure component render time
 */
export function useRenderTime(componentName: string): void {
  if (typeof performance !== 'undefined') {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const duration = end - start;
      console.log(`[Render Time] ${componentName}: ${duration.toFixed(2)}ms`);
    };
  }
  return () => {};
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();
