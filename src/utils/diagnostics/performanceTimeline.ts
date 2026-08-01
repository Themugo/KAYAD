/**
 * KAYAD Performance Timeline
 * Measures and tracks application startup and runtime performance
 */

import { logger, LogLevel } from './logger';

export interface PerformanceEntry {
  name: string;
  start: number;
  end?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  mark?: 'start' | 'end' | 'point';
}

export interface PerformanceMetrics {
  htmlLoaded?: number;
  javascriptLoaded?: number;
  reactMounted?: number;
  providersReady?: number;
  routesReady?: number;
  firstPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  totalLoadTime?: number;
}

class PerformanceTimeline {
  private entries: Map<string, PerformanceEntry> = new Map();
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private readonly log = createPerformanceLogger();

  // Mark a performance point
  mark(name: string, metadata?: Record<string, unknown>): void {
    const now = performance.now();
    
    this.entries.set(name, {
      name,
      start: now,
      mark: 'point',
    });

    this.log.debug(`MARK: ${name}`, undefined, { time: now });
    this.notifyObservers();
  }

  // Start a timed operation
  startMeasure(name: string): void {
    const now = performance.now();
    
    this.entries.set(name, {
      name,
      start: now,
      mark: 'start',
    });

    this.log.debug(`START: ${name}`, undefined, { time: now });
  }

  // End a timed operation
  endMeasure(name: string, metadata?: Record<string, unknown>): number {
    const now = performance.now();
    const entry = this.entries.get(name);

    if (!entry) {
      this.log.warn(`No start marker found for: ${name}`);
      return 0;
    }

    const duration = now - entry.start;
    
    this.entries.set(name, {
      ...entry,
      end: now,
      duration,
      metadata,
      mark: 'end',
    });

    // Log performance
    const level = duration > 3000 ? LogLevel.WARNING : LogLevel.INFO;
    this.log.log(level, `MEASURE: ${name} (${duration.toFixed(2)}ms)`, undefined, metadata);

    // Check for slow operations
    if (duration > 5000) {
      this.log.warn(`SLOW OPERATION: ${name} took ${duration.toFixed(0)}ms`, undefined, {
        threshold: 5000,
        actual: duration,
      });
    }

    this.notifyObservers();
    return duration;
  }

  // Get all entries
  getEntries(): PerformanceEntry[] {
    return Array.from(this.entries.values());
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.htmlLoaded = navigation.responseStart;
      metrics.javascriptLoaded = navigation.domContentLoadedEventEnd;
      metrics.reactMounted = navigation.domInteractive;
      metrics.firstPaint = this.getFirstPaint();
      metrics.largestContentfulPaint = this.getLCP();
      metrics.timeToInteractive = navigation.domInteractive;
      metrics.totalLoadTime = navigation.loadEventEnd;
    }

    return metrics;
  }

  // Get First Paint time
  private getFirstPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    return fcp?.startTime;
  }

  // Get Largest Contentful Paint
  private getLCP(): number | undefined {
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    return lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : undefined;
  }

  // Observe performance changes
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.add(callback);
    return () => {
      this.observers.delete(callback);
    };
  }

  private notifyObservers(): void {
    const metrics = this.getMetrics();
    this.observers.forEach((callback) => callback(metrics));
  }

  // Measure React render time
  measureRender(componentName: string, renderFn: () => void): void {
    const start = performance.now();
    renderFn();
    const duration = performance.now() - start;
    
    this.endMeasure(`render:${componentName}`, { duration });
  }

  // Measure async operation
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.startMeasure(name);
    try {
      const result = await fn();
      this.endMeasure(name, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.endMeasure(name, { ...metadata, success: false, error: String(error) });
      throw error;
    }
  }

  // Clear all entries
  clear(): void {
    this.entries.clear();
  }

  // Get summary report
  getSummary(): {
    totalTime: number;
    operationCount: number;
    slowOperations: PerformanceEntry[];
    metrics: PerformanceMetrics;
  } {
    const entries = this.getEntries().filter((e) => e.duration !== undefined);
    const slowOperations = entries.filter((e) => (e.duration || 0) > 3000);

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const totalTime = navigation?.loadEventEnd || 0;

    return {
      totalTime,
      operationCount: entries.length,
      slowOperations,
      metrics: this.getMetrics(),
    };
  }

  // Print timeline to console
  printTimeline(): void {
    console.table(
      Array.from(this.entries.values()).map((entry) => ({
        Name: entry.name,
        Start: `${entry.start.toFixed(2)}ms`,
        Duration: entry.duration ? `${entry.duration.toFixed(2)}ms` : '-',
        Mark: entry.mark,
      }))
    );
  }
}

// Logger for performance
function createPerformanceLogger() {
  return {
    debug: (msg: string, module?: string, data?: Record<string, unknown>) => 
      logger.debug(msg, module, data),
    info: (msg: string, module?: string, data?: Record<string, unknown>) => 
      logger.info(msg, module, data),
    warn: (msg: string, module?: string, data?: Record<string, unknown>) => 
      logger.warn(msg, module, data),
    error: (msg: string, module?: string, data?: Record<string, unknown>) => 
      logger.error(msg, module, data),
    log: (level: LogLevel, msg: string, module?: string, data?: Record<string, unknown>) => 
      logger.log(level, msg, module, data),
  };
}

// Singleton instance
export const performanceTimeline = new PerformanceTimeline();

// Hook for React components
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({});

  React.useEffect(() => {
    // Initial metrics
    setMetrics(performanceTimeline.getMetrics());

    // Subscribe to updates
    const unsubscribe = performanceTimeline.subscribe(setMetrics);

    return unsubscribe;
  }, []);

  return metrics;
}

// Import React for the hook
import * as React from 'react';

export default performanceTimeline;
