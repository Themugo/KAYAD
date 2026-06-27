// backend/middleware/performanceMonitor.js
// ─────────────────────────────────────────────────────────────
// Performance Monitoring Middleware
// Tracks request duration, response times, and performance metrics
// ─────────────────────────────────────────────────────────────

import { recordHttpRequest, recordHistogram, incrementCounter } from "../config/metrics.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

/**
 * Performance monitoring middleware
 * Tracks request duration and response times
 */
export const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const originalEnd = res.end;

  // Hook into response end
  res.end = function (...args) {
    const duration = Date.now() - startTime;

    // Record metrics
    recordHttpRequest(req.method, req.path, res.statusCode, duration);
    recordHistogram("http_response_time_ms", duration, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
    });

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logWarn("Slow request detected", {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        status: res.statusCode,
        requestId: req.requestId,
      });
      incrementCounter("slow_requests_total", 1, {
        method: req.method,
        path: req.path,
      });
    }

    // Log very slow requests (> 5 seconds)
    if (duration > 5000) {
      logError("Very slow request detected", {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        status: res.statusCode,
        requestId: req.requestId,
      });
      incrementCounter("very_slow_requests_total", 1, {
        method: req.method,
        path: req.path,
      });
    }

    // Add performance header
    res.setHeader("X-Response-Time", `${duration}ms`);

    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Database query performance monitoring
 */
export const dbPerformanceMonitor = (operation, collection) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Store original exec if it exists
    const originalExec = req.dbExec;

    // Hook into database operations
    req.dbExec = async function (...args) {
      const duration = Date.now() - startTime;

      recordHistogram("db_query_duration_ms", duration, {
        operation,
        collection,
      });

      if (duration > 1000) {
        logWarn("Slow database query detected", {
          operation,
          collection,
          duration: `${duration}ms`,
          requestId: req.requestId,
        });
        incrementCounter("slow_db_queries_total", 1, {
          operation,
          collection,
        });
      }

      if (originalExec) {
        return originalExec.apply(this, args);
      }
    };

    next();
  };
};

/**
 * External API call performance monitoring
 */
export const externalApiMonitor = (serviceName) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalJson = res.json;

    res.json = function (data) {
      const duration = Date.now() - startTime;

      recordHistogram("external_api_duration_ms", duration, {
        service: serviceName,
        status: res.statusCode,
      });

      if (duration > 5000) {
        logWarn("Slow external API call detected", {
          service: serviceName,
          duration: `${duration}ms`,
          status: res.statusCode,
          requestId: req.requestId,
        });
        incrementCounter("slow_external_api_calls_total", 1, {
          service: serviceName,
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Memory usage monitoring
 */
export const memoryMonitor = () => {
  return (req, res, next) => {
    const memoryUsage = process.memoryUsage();
    const heapUsedPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    recordHistogram("memory_heap_used_mb", memoryUsage.heapUsed / 1024 / 1024);
    recordHistogram("memory_heap_total_mb", memoryUsage.heapTotal / 1024 / 1024);

    // Log high memory usage (> 80%)
    if (heapUsedPercentage > 80) {
      logWarn("High memory usage detected", {
        heapUsedPercentage: `${heapUsedPercentage.toFixed(2)}%`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      });
      incrementCounter("high_memory_usage_total", 1, {
        threshold: "80%",
      });
    }

    // Log critical memory usage (> 90%)
    if (heapUsedPercentage > 90) {
      logError("Critical memory usage detected", {
        heapUsedPercentage: `${heapUsedPercentage.toFixed(2)}%`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      });
      incrementCounter("critical_memory_usage_total", 1, {
        threshold: "90%",
      });
    }

    next();
  };
};

/**
 * CPU usage monitoring
 */
export const cpuMonitor = () => {
  return (req, res, next) => {
    const cpuUsage = process.cpuUsage();
    const totalCpuTime = cpuUsage.user + cpuUsage.system;

    recordHistogram("cpu_user_time_ms", cpuUsage.user);
    recordHistogram("cpu_system_time_ms", cpuUsage.system);
    recordHistogram("cpu_total_time_ms", totalCpuTime);

    next();
  };
};

export default {
  performanceMonitor,
  dbPerformanceMonitor,
  externalApiMonitor,
  memoryMonitor,
  cpuMonitor,
};
