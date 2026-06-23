// API Latency Monitoring Middleware
// Tracks response times for performance monitoring

const { recordMetric, setGauge, incrementCounter } = require('../config/metrics');
const { logInfo, logWarn } = require('../utils/logger');

const apiLatencyMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const endpoint = `${req.method} ${req.path}`;

  // Store start time on request object
  req.startTime = startTime;

  // Capture original end function
  const originalEnd = res.end;

  // Override end function to capture response time
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    
    // Record metrics
    recordMetric('api_request_duration', duration, {
      endpoint,
      method: req.method,
      status_code: res.statusCode,
    });

    setGauge('api_request_duration_ms', duration, {
      endpoint,
    });

    incrementCounter('api_requests_total', {
      endpoint,
      method: req.method,
      status_code: res.statusCode,
    });

    // Log slow requests (> 500ms)
    if (duration > 500) {
      logWarn('Slow API request detected', {
        endpoint,
        duration: `${duration}ms`,
        status_code: res.statusCode,
      });
    }

    // Log very slow requests (> 2s)
    if (duration > 2000) {
      logWarn('Very slow API request detected', {
        endpoint,
        duration: `${duration}ms`,
        status_code: res.statusCode,
      });
      incrementCounter('api_very_slow_requests', {
        endpoint,
      });
    }

    // Call original end
    originalEnd.apply(this, args);
  };

  next();
};

module.exports = apiLatencyMiddleware;
