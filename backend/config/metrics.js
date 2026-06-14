// backend/config/metrics.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Metrics collection configuration
// Provides custom metrics for monitoring and alerting
// ─────────────────────────────────────────────────────────────

// =============================
// 📊 METRICS STORAGE
// =============================

const metrics = {
  counters: {},
  gauges: {},
  histograms: {},
  timers: {},
};

// =============================
// 🔢 COUNTER METRICS
// =============================

export const incrementCounter = (name, value = 1, tags = {}) => {
  const key = `${name}:${JSON.stringify(tags)}`;
  metrics.counters[key] = (metrics.counters[key] || 0) + value;
};

export const getCounter = (name, tags = {}) => {
  const key = `${name}:${JSON.stringify(tags)}`;
  return metrics.counters[key] || 0;
};

// =============================
// 📏 GAUGE METRICS
// =============================

export const setGauge = (name, value, tags = {}) => {
  const key = `${name}:${JSON.stringify(tags)}`;
  metrics.gauges[key] = value;
};

export const getGauge = (name, tags = {}) => {
  const key = `${name}:${JSON.stringify(tags)}`;
  return metrics.gauges[key] || 0;
};

// =============================
// 📊 HISTOGRAM METRICS
// =============================

export const recordHistogram = (name, value, tags = {}) => {
  const key = `${name}:${JSON.stringify(tags)}`;
  if (!metrics.histograms[key]) {
    metrics.histograms[key] = [];
  }
  metrics.histograms[key].push(value);
};

export const getHistogram = (name, tags = {}) => {
  const key = `${name}:${JSON.stringify(tags)}`;
  const values = metrics.histograms[key] || [];
  if (values.length === 0) return { count: 0, sum: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const count = values.length;
  
  return {
    count,
    sum,
    avg: sum / count,
    min: sorted[0],
    max: sorted[count - 1],
    p50: sorted[Math.floor(count * 0.5)],
    p95: sorted[Math.floor(count * 0.95)],
    p99: sorted[Math.floor(count * 0.99)],
  };
};

// =============================
// ⏱️ TIMER METRICS
// =============================

export const startTimer = (name, tags = {}) => {
  const key = `${name}:${JSON.stringify(tags)}`;
  metrics.timers[key] = Date.now();
};

export const stopTimer = (name, tags = {}) => {
  const key = `${name}:${JSON.stringify(tags)}`;
  if (metrics.timers[key]) {
    const duration = Date.now() - metrics.timers[key];
    recordHistogram(`${name}_duration`, duration, tags);
    delete metrics.timers[key];
    return duration;
  }
  return 0;
};

// =============================
// 📈 GET ALL METRICS
// =============================

export const getAllMetrics = () => {
  return {
    counters: metrics.counters,
    gauges: metrics.gauges,
    histograms: Object.fromEntries(
      Object.entries(metrics.histograms).map(([key, values]) => [
        key,
        getHistogram(key.split(":")[0], JSON.parse(key.split(":").slice(1).join(":"))),
      ])
    ),
  };
};

// =============================
// 🧹 RESET METRICS
// =============================

export const resetMetrics = () => {
  metrics.counters = {};
  metrics.gauges = {};
  metrics.histograms = {};
  metrics.timers = {};
};

// =============================
// 🎯 PREDEFINED METRICS
// =============================

// HTTP metrics
export const recordHttpRequest = (method, path, statusCode, duration) => {
  incrementCounter("http_requests_total", 1, { method, path, status: statusCode });
  recordHistogram("http_request_duration_ms", duration, { method, path, status: statusCode });
};

// Database metrics
export const recordDbQuery = (operation, collection, duration) => {
  incrementCounter("db_queries_total", 1, { operation, collection });
  recordHistogram("db_query_duration_ms", duration, { operation, collection });
};

// Payment metrics
export const recordPayment = (gateway, status, amount, duration) => {
  incrementCounter("payments_total", 1, { gateway, status });
  recordHistogram("payment_amount", amount, { gateway, status });
  recordHistogram("payment_duration_ms", duration, { gateway, status });
};

// Escrow metrics
export const recordEscrowOperation = (operation, status, duration) => {
  incrementCounter("escrow_operations_total", 1, { operation, status });
  recordHistogram("escrow_operation_duration_ms", duration, { operation, status });
};

// Auction metrics
export const recordAuctionEvent = (event, duration) => {
  incrementCounter("auction_events_total", 1, { event });
  recordHistogram("auction_event_duration_ms", duration, { event });
};

// Error metrics
export const recordError = (type, message) => {
  incrementCounter("errors_total", 1, { type, message });
};

export default {
  incrementCounter,
  getCounter,
  setGauge,
  getGauge,
  recordHistogram,
  getHistogram,
  startTimer,
  stopTimer,
  getAllMetrics,
  resetMetrics,
  recordHttpRequest,
  recordDbQuery,
  recordPayment,
  recordEscrowOperation,
  recordAuctionEvent,
  recordError,
};
