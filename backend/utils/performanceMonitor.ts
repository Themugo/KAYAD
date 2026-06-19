// backend/utils/performanceMonitor.js
// ─────────────────────────────────────────────────────────────
// Performance monitoring utilities for tracking application metrics
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn, logError } from "./logger.ts";

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byEndpoint: {},
        byMethod: {},
      },
      responseTimes: {
        total: 0,
        count: 0,
        byEndpoint: {},
      },
      database: {
        queries: 0,
        slowQueries: 0,
        avgQueryTime: 0,
      },
      errors: {
        total: 0,
        byType: {},
        recent: [],
      },
      memory: {
        samples: [],
        maxSamples: 100,
      },
      uptime: process.uptime(),
    };

    this.slowQueryThreshold = 1000; // 1 second
    this.slowRequestThreshold = 3000; // 3 seconds
    this.startTime = Date.now();
  }

  /**
   * Record a request
   * @param {Object} req - Express request object
   * @param {number} duration - Request duration in milliseconds
   * @param {number} statusCode - HTTP status code
   */
  recordRequest(req, duration, statusCode) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    // Track by endpoint
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    this.metrics.requests.byEndpoint[endpoint] = 
      (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;

    // Track by method
    this.metrics.requests.byMethod[req.method] = 
      (this.metrics.requests.byMethod[req.method] || 0) + 1;

    // Track response time
    this.metrics.responseTimes.total += duration;
    this.metrics.responseTimes.count++;
    
    if (!this.metrics.responseTimes.byEndpoint[endpoint]) {
      this.metrics.responseTimes.byEndpoint[endpoint] = {
        total: 0,
        count: 0,
        min: duration,
        max: duration,
      };
    }
    
    const endpointMetrics = this.metrics.responseTimes.byEndpoint[endpoint];
    endpointMetrics.total += duration;
    endpointMetrics.count++;
    endpointMetrics.min = Math.min(endpointMetrics.min, duration);
    endpointMetrics.max = Math.max(endpointMetrics.max, duration);

    // Log slow requests
    if (duration > this.slowRequestThreshold) {
      logWarn("Slow request detected", {
        endpoint,
        duration: `${duration}ms`,
        statusCode,
      });
    }
  }

  /**
   * Record a database query
   * @param {string} query - Query description
   * @param {number} duration - Query duration in milliseconds
   */
  recordQuery(query, duration) {
    this.metrics.database.queries++;
    
    if (duration > this.slowQueryThreshold) {
      this.metrics.database.slowQueries++;
      logWarn("Slow database query detected", {
        query,
        duration: `${duration}ms`,
      });
    }

    // Update average query time
    const totalQueryTime = this.metrics.database.avgQueryTime * (this.metrics.database.queries - 1);
    this.metrics.database.avgQueryTime = (totalQueryTime + duration) / this.metrics.database.queries;
  }

  /**
   * Record an error
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  recordError(error, context = {}) {
    this.metrics.errors.total++;
    
    const errorType = error.name || error.constructor.name;
    this.metrics.errors.byType[errorType] = 
      (this.metrics.errors.byType[errorType] || 0) + 1;

    // Keep recent errors (last 50)
    this.metrics.errors.recent.unshift({
      message: error.message,
      type: errorType,
      timestamp: new Date().toISOString(),
      context,
    });

    if (this.metrics.errors.recent.length > 50) {
      this.metrics.errors.recent.pop();
    }

    logError("Error recorded", error, context);
  }

  /**
   * Record memory usage
   */
  recordMemory() {
    const memoryUsage = process.memoryUsage();
    const sample = {
      timestamp: new Date().toISOString(),
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
    };

    this.metrics.memory.samples.push(sample);

    // Keep only last N samples
    if (this.metrics.memory.samples.length > this.metrics.memory.maxSamples) {
      this.metrics.memory.samples.shift();
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    const uptime = process.uptime();
    const avgResponseTime = this.metrics.responseTimes.count > 0
      ? this.metrics.responseTimes.total / this.metrics.responseTimes.count
      : 0;

    return {
      uptime: Math.floor(uptime),
      uptimeFormatted: this.formatUptime(uptime),
      requests: {
        total: this.metrics.requests.total,
        success: this.metrics.requests.success,
        error: this.metrics.requests.error,
        successRate: this.metrics.requests.total > 0
          ? ((this.metrics.requests.success / this.metrics.requests.total) * 100).toFixed(2)
          : 0,
        perSecond: (this.metrics.requests.total / uptime).toFixed(2),
        byEndpoint: this.metrics.requests.byEndpoint,
        byMethod: this.metrics.requests.byMethod,
      },
      responseTimes: {
        average: avgResponseTime.toFixed(2),
        byEndpoint: Object.fromEntries(
          Object.entries(this.metrics.responseTimes.byEndpoint).map(([key, value]) => [
            key,
            {
              average: (value.total / value.count).toFixed(2),
              min: value.min,
              max: value.max,
              count: value.count,
            },
          ])
        ),
      },
      database: {
        queries: this.metrics.database.queries,
        slowQueries: this.metrics.database.slowQueries,
        avgQueryTime: this.metrics.database.avgQueryTime.toFixed(2),
        slowQueryRate: this.metrics.database.queries > 0
          ? ((this.metrics.database.slowQueries / this.metrics.database.queries) * 100).toFixed(2)
          : 0,
      },
      errors: {
        total: this.metrics.errors.total,
        byType: this.metrics.errors.byType,
        recent: this.metrics.errors.recent.slice(0, 10),
      },
      memory: {
        current: process.memoryUsage(),
        samples: this.metrics.memory.samples.slice(-10),
      },
      startTime: new Date(this.startTime).toISOString(),
    };
  }

  /**
   * Format uptime in human-readable format
   * @param {number} seconds - Uptime in seconds
   * @returns {string} Formatted uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(" ");
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byEndpoint: {},
        byMethod: {},
      },
      responseTimes: {
        total: 0,
        count: 0,
        byEndpoint: {},
      },
      database: {
        queries: 0,
        slowQueries: 0,
        avgQueryTime: 0,
      },
      errors: {
        total: 0,
        byType: {},
        recent: [],
      },
      memory: {
        samples: [],
        maxSamples: 100,
      },
      uptime: process.uptime(),
    };
    this.startTime = Date.now();
    
    logInfo("Performance metrics reset");
  }

  /**
   * Get health status based on metrics
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const issues = [];

    // Check error rate
    const errorRate = parseFloat(metrics.requests.errorRate);
    if (errorRate > 5) {
      issues.push({
        type: "error_rate",
        severity: "warning",
        message: `High error rate: ${errorRate}%`,
      });
    }

    // Check slow request rate
    const slowRequests = Object.values(metrics.responseTimes.byEndpoint)
      .filter(ep => parseFloat(ep.average) > this.slowRequestThreshold).length;
    
    if (slowRequests > 0) {
      issues.push({
        type: "slow_requests",
        severity: "warning",
        message: `${slowRequests} endpoints with slow response times`,
      });
    }

    // Check memory usage
    const memoryUsagePercent = (metrics.memory.current.heapUsed / metrics.memory.current.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      issues.push({
        type: "memory",
        severity: "critical",
        message: `High memory usage: ${memoryUsagePercent.toFixed(2)}%`,
      });
    } else if (memoryUsagePercent > 75) {
      issues.push({
        type: "memory",
        severity: "warning",
        message: `Elevated memory usage: ${memoryUsagePercent.toFixed(2)}%`,
      });
    }

    // Check slow query rate
    const slowQueryRate = parseFloat(metrics.database.slowQueryRate);
    if (slowQueryRate > 10) {
      issues.push({
        type: "database",
        severity: "warning",
        message: `High slow query rate: ${slowQueryRate}%`,
      });
    }

    const hasCritical = issues.some(i => i.severity === "critical");
    const hasWarning = issues.some(i => i.severity === "warning");

    return {
      status: hasCritical ? "critical" : hasWarning ? "warning" : "healthy",
      issues,
      metrics,
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware for automatic request tracking
export const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    performanceMonitor.recordRequest(req, duration, res.statusCode);
  });

  next();
};

// Start periodic memory sampling
if (process.env.NODE_ENV === "production") {
  setInterval(() => {
    performanceMonitor.recordMemory();
  }, 60000); // Sample every minute
}

export default performanceMonitor;
