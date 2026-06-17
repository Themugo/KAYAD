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

export const recordMetric = (name, value, tags = {}) => {
  // Alias for recordHistogram for backward compatibility
  return recordHistogram(name, value, tags);
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

// Cache metrics
export const recordCacheHit = () => {
  incrementCounter("cache_hits_total", 1);
};

export const recordCacheMiss = () => {
  incrementCounter("cache_misses_total", 1);
};

export const recordCacheSet = () => {
  incrementCounter("cache_sets_total", 1);
};

export const recordCacheDelete = () => {
  incrementCounter("cache_deletes_total", 1);
};

export const recordCacheError = () => {
  incrementCounter("cache_errors_total", 1);
};

// MongoDB replica set metrics
export const recordReplicaSetStatus = (status, primary, secondaries) => {
  setGauge("replica_set_status", status === 'healthy' ? 1 : 0);
  setGauge("replica_set_primary_available", primary ? 1 : 0);
  setGauge("replica_set_secondaries_count", secondaries);
};

export const recordReplicaSetLag = (lagMs) => {
  recordHistogram("replica_set_lag_ms", lagMs);
};

// Connection pool metrics
export const recordConnectionPoolStats = (total, available, checkedOut) => {
  setGauge("connection_pool_total", total);
  setGauge("connection_pool_available", available);
  setGauge("connection_pool_checked_out", checkedOut);
};

// Load balancer metrics
export const recordLoadBalancerRequest = (server, statusCode) => {
  incrementCounter("load_balancer_requests_total", 1, { server, status: statusCode });
};

export const recordLoadBalancerHealth = (server, healthy) => {
  setGauge("load_balancer_server_healthy", healthy ? 1 : 0, { server });
};

// =============================
// 🌐 EXTERNAL SERVICE METRICS
// =============================

// M-Pesa metrics
export const recordMpesaTokenFetch = (duration, success) => {
  recordHistogram("mpesa_token_fetch_duration", duration);
  incrementCounter("mpesa_token_fetch_total", success ? 1 : 0, { status: success ? "success" : "failure" });
};

export const recordMpesaStkPush = (duration, success, errorType = null) => {
  recordHistogram("mpesa_stk_push_duration", duration);
  incrementCounter("mpesa_stk_push_total", success ? 1 : 0, { status: success ? "success" : "failure", error_type: errorType });
};

// Email metrics
export const recordEmailSend = (duration, success, errorType = null) => {
  recordHistogram("email_send_duration", duration);
  incrementCounter("email_send_total", success ? 1 : 0, { status: success ? "success" : "failure", error_type: errorType });
};

// SMS metrics
export const recordSmsSend = (duration, success, errorType = null) => {
  recordHistogram("sms_send_duration", duration);
  incrementCounter("sms_send_total", success ? 1 : 0, { status: success ? "success" : "failure", error_type: errorType });
};

// Redis metrics
export const recordRedisOperation = (operation, duration, success) => {
  recordHistogram("redis_operation_duration", duration, { operation });
  incrementCounter("redis_operations_total", success ? 1 : 0, { operation, status: success ? "success" : "failure" });
};

// Sentry metrics
export const recordSentryCapture = (duration, success, errorType = null) => {
  recordHistogram("sentry_capture_duration", duration);
  incrementCounter("sentry_capture_total", success ? 1 : 0, { status: success ? "success" : "failure", error_type: errorType });
};

// Socket.IO metrics
export const recordSocketEmit = (event, duration, success) => {
  recordHistogram("socket_emit_duration", duration, { event });
  incrementCounter("socket_emit_total", success ? 1 : 0, { event, status: success ? "success" : "failure" });
};

// Circuit breaker metrics
export const recordCircuitBreakerState = (service, state) => {
  setGauge("circuit_breaker_state", state === "open" ? 1 : 0, { service });
  incrementCounter("circuit_breaker_state_change", 1, { service, state });
};

// Fallback metrics
export const recordFallbackActivation = (service) => {
  incrementCounter("fallback_activation_total", 1, { service });
};

// Timeout metrics
export const recordTimeout = (service, operation) => {
  incrementCounter("timeout_total", 1, { service, operation });
};

// Queue metrics
export const recordQueueDepth = (queue, depth) => {
  setGauge("queue_depth", depth, { queue });
};

export const recordQueueProcessing = (queue, duration, success) => {
  recordHistogram("queue_processing_duration", duration, { queue });
  incrementCounter("queue_processing_total", success ? 1 : 0, { queue, status: success ? "success" : "failure" });
};

// =============================
// 🔐 IDEMPOTENCY METRICS
// =============================

export const recordIdempotencyCheck = (operationType, hit, duration) => {
  recordHistogram("idempotency_check_duration_ms", duration, { operation_type: operationType });
  incrementCounter("idempotency_checks_total", 1, { operation_type: operationType, hit: hit ? "hit" : "miss" });
};

export const recordIdempotencyHit = (operationType) => {
  incrementCounter("idempotency_hits_total", 1, { operation_type: operationType });
};

export const recordIdempotencyMiss = (operationType) => {
  incrementCounter("idempotency_misses_total", 1, { operation_type: operationType });
};

export const recordIdempotencyCache = (operationType, success) => {
  incrementCounter("idempotency_cache_total", success ? 1 : 0, { operation_type: operationType, status: success ? "success" : "failure" });
};

export const recordIdempotencyError = (operationType, errorType) => {
  incrementCounter("idempotency_errors_total", 1, { operation_type: operationType, error_type: errorType });
};

export const recordIdempotencyKeyExpiration = (operationType) => {
  incrementCounter("idempotency_key_expirations_total", 1, { operation_type: operationType });
};

export const recordIdempotencyKeyCleanup = (count) => {
  setGauge("idempotency_keys_cleaned", count);
  incrementCounter("idempotency_key_cleanup_total", count);
};

export default {
  incrementCounter,
  getCounter,
  setGauge,
  getGauge,
  recordHistogram,
  recordMetric,
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
  recordCacheHit,
  recordCacheMiss,
  recordCacheSet,
  recordCacheDelete,
  recordCacheError,
  recordReplicaSetStatus,
  recordReplicaSetLag,
  recordConnectionPoolStats,
  recordLoadBalancerRequest,
  recordLoadBalancerHealth,
  recordMpesaTokenFetch,
  recordMpesaStkPush,
  recordEmailSend,
  recordSmsSend,
  recordRedisOperation,
  recordSentryCapture,
  recordSocketEmit,
  recordCircuitBreakerState,
  recordFallbackActivation,
  recordTimeout,
  recordQueueDepth,
  recordQueueProcessing,
  recordIdempotencyCheck,
  recordIdempotencyHit,
  recordIdempotencyMiss,
  recordIdempotencyCache,
  recordIdempotencyError,
  recordIdempotencyKeyExpiration,
  recordIdempotencyKeyCleanup,
};
