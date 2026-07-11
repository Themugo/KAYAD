// Performance monitoring component for identifying slow renders and bottlenecks
// Can be used in development to measure component render times

import { useState, useEffect, useRef, useCallback, memo } from 'react';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  type: 'render' | 'api' | 'interaction';
}

interface PerformanceStats {
  renders: number;
  avgRenderTime: number;
  slowRenders: number;
  totalApiCalls: number;
  slowApiCalls: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  logToConsole?: boolean;
  slowThreshold?: number;
  maxMetrics?: number;
  showPanel?: boolean;
}

// Global performance tracking
const globalMetrics: PerformanceMetric[] = [];
const globalStats: PerformanceStats = {
  renders: 0,
  avgRenderTime: 0,
  slowRenders: 0,
  totalApiCalls: 0,
  slowApiCalls: 0,
};

// Track a render
export function trackRender(componentName: string, duration: number) {
  if (duration > 16.67) { // Slower than 60fps
    globalMetrics.push({
      name: componentName,
      duration,
      timestamp: Date.now(),
      type: 'render',
    });
    globalStats.renders++;
    globalStats.slowRenders++;
    
    // Keep only last 100 metrics
    if (globalMetrics.length > 100) {
      globalMetrics.shift();
    }
    
    // Update average
    const totalTime = globalMetrics
      .filter(m => m.type === 'render')
      .reduce((acc, m) => acc + m.duration, 0);
    globalStats.avgRenderTime = totalTime / globalStats.renders;
  }
}

// Track an API call
export function trackApiCall(endpoint: string, duration: number, success: boolean) {
  if (duration > 1000) { // Slower than 1 second
    globalMetrics.push({
      name: endpoint,
      duration,
      timestamp: Date.now(),
      type: 'api',
    });
    globalStats.totalApiCalls++;
    
    if (!success) {
      globalStats.slowApiCalls++;
    }
  }
}

// Get performance stats
export function getPerformanceStats(): PerformanceStats {
  return { ...globalStats };
}

// Get recent metrics
export function getRecentMetrics(count: number = 20): PerformanceMetric[] {
  return globalMetrics.slice(-count);
}

// Clear metrics
export function clearPerformanceMetrics() {
  globalMetrics.length = 0;
  globalStats.renders = 0;
  globalStats.avgRenderTime = 0;
  globalStats.slowRenders = 0;
  globalStats.totalApiCalls = 0;
  globalStats.slowApiCalls = 0;
}

// HOC for tracking component performance
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  return memo(function PerformanceTrackedComponent(props: P) {
    const startTime = useRef(performance.now());
    const renderCount = useRef(0);
    
    useEffect(() => {
      const duration = performance.now() - startTime.current;
      trackRender(displayName, duration);
      
      if (import.meta.env.DEV && duration > 16.67) {
        if (import.meta.env.DEV) console.warn(`[Performance] Slow render: ${displayName} took ${duration.toFixed(2)}ms`);
      }
      
      renderCount.current++;
    });
    
    startTime.current = performance.now();
    
    return <WrappedComponent {...props} />;
  });
}

// Hook for tracking render performance
export function useRenderPerformance(componentName: string) {
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    const duration = performance.now() - startTime.current;
    trackRender(componentName, duration);
    
    if (import.meta.env.DEV && duration > 16.67) {
      if (import.meta.env.DEV) console.warn(`[Performance] Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  });
  
  startTime.current = performance.now();
}

// Performance Monitor Panel Component
const PerformancePanel = memo(function PerformancePanel({
  stats,
  metrics,
  onClose,
}: {
  stats: PerformanceStats;
  metrics: PerformanceMetric[];
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      width: 320,
      maxHeight: 400,
      background: 'rgba(0,0,0,0.95)',
      border: '1px solid var(--gold)',
      borderRadius: 12,
      padding: 16,
      zIndex: 9999,
      overflow: 'auto',
      fontFamily: 'monospace',
      fontSize: 12,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>⚡ Performance</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ×
        </button>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 6 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Renders</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{stats.renders}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 6 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Slow Renders</div>
            <div style={{ color: stats.slowRenders > 10 ? '#ef4444' : '#22c55e', fontSize: 16, fontWeight: 'bold' }}>
              {stats.slowRenders}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 6 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Avg Time</div>
            <div style={{ color: stats.avgRenderTime > 16 ? '#f59e0b' : '#22c55e', fontSize: 16, fontWeight: 'bold' }}>
              {stats.avgRenderTime.toFixed(2)}ms
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 6 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Slow API</div>
            <div style={{ color: stats.slowApiCalls > 5 ? '#ef4444' : '#22c55e', fontSize: 16, fontWeight: 'bold' }}>
              {stats.slowApiCalls}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Metrics */}
      <div>
        <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Recent Issues</div>
        {metrics.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 16 }}>
            No performance issues detected
          </div>
        ) : (
          metrics.map((metric, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 4,
                marginBottom: 4,
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                {metric.name}
              </span>
              <span style={{
                color: metric.type === 'api' ? '#f59e0b' : '#ef4444',
                fontWeight: 'bold',
              }}>
                {metric.duration.toFixed(0)}ms
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Main Performance Monitor Component
export default function PerformanceMonitor({
  enabled = import.meta.env.DEV,
  logToConsole = false,
  slowThreshold = 16,
  maxMetrics = 10,
  showPanel = false,
}: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(showPanel);
  const [stats, setStats] = useState<PerformanceStats>({ ...globalStats });
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);

  // Update stats periodically
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setStats({ ...globalStats });
      setMetrics(getRecentMetrics(maxMetrics));
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, maxMetrics]);

  // Keyboard shortcut to toggle
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.altKey && e.shiftKey) {
        setIsVisible(v => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);

  if (!enabled || !isVisible) return null;

  return (
    <PerformancePanel
      stats={stats}
      metrics={metrics}
      onClose={() => setIsVisible(false)}
    />
  );
}

// Performance optimization tips component
export function PerformanceTips() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const tips = [
    { title: 'Virtualize Long Lists', desc: 'Use VirtualList for lists with 100+ items' },
    { title: 'Memoize Expensive Components', desc: 'Wrap heavy components with React.memo' },
    { title: 'Debounce Search Input', desc: 'Debounce search to 300ms to reduce API calls' },
    { title: 'Lazy Load Routes', desc: 'Use React.lazy for routes not needed on initial load' },
    { title: 'Optimize Images', desc: 'Use lazy loading, srcset, and WebP format' },
    { title: 'Cache API Responses', desc: 'Use SWR or React Query for automatic caching' },
    { title: 'Avoid Inline Objects', desc: 'Pass objects outside JSX to prevent re-renders' },
    { title: 'Use CSS Animations', desc: 'Prefer CSS transforms over layout-triggering properties' },
  ];

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
    }}>
      <button
        onClick={() => setIsExpanded(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
        Performance Optimization Tips
      </button>
      
      {isExpanded && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, color: 'var(--gold)', marginBottom: 4 }}>{tip.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{tip.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
