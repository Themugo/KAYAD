// backend/config/reliability.js - SLI / SLO / Error Budget Definitions
// Defines service level indicators, objectives, and error budgets

// =============================
// 📐 SLI DEFINITIONS
// =============================
// Each SLI specifies how to measure a reliability aspect from metrics

export const SLIS = {
  availability: {
    id: "availability",
    name: "API Availability",
    description: "Percentage of valid HTTP requests that complete successfully",
    metric: {
      numerator: { counter: "http_requests_total", filter: { status: /^[^5]/ } },
      denominator: { counter: "http_requests_total" },
    },
    unit: "%",
    direction: "higher-is-better",
  },
  latency_p95: {
    id: "latency_p95",
    name: "P95 Response Time",
    description: "95th percentile of HTTP request duration in milliseconds",
    metric: {
      histogram: "http_request_duration_ms",
      quantile: 0.95,
    },
    unit: "ms",
    direction: "lower-is-better",
  },
  latency_p99: {
    id: "latency_p99",
    name: "P99 Response Time",
    description: "99th percentile of HTTP request duration in milliseconds",
    metric: {
      histogram: "http_request_duration_ms",
      quantile: 0.99,
    },
    unit: "ms",
    direction: "lower-is-better",
  },
  error_rate: {
    id: "error_rate",
    name: "Error Rate",
    description: "Percentage of HTTP requests resulting in 5xx errors",
    metric: {
      numerator: { counter: "http_requests_total", filter: { status: /^5/ } },
      denominator: { counter: "http_requests_total" },
    },
    unit: "%",
    direction: "lower-is-better",
  },
  db_query_latency_p95: {
    id: "db_query_latency_p95",
    name: "Database Query P95 Latency",
    description: "95th percentile of database query duration in milliseconds",
    metric: {
      histogram: "db_query_duration_ms",
      quantile: 0.95,
    },
    unit: "ms",
    direction: "lower-is-better",
  },
  cache_hit_rate: {
    id: "cache_hit_rate",
    name: "Cache Hit Rate",
    description: "Percentage of cache lookups that result in a hit",
    metric: {
      numerator: { counter: "cache_hits_total" },
      denominator: { counter: "cache_hits_total", op: "add", other: { counter: "cache_misses_total" } },
    },
    unit: "%",
    direction: "higher-is-better",
  },
  queue_processing_success_rate: {
    id: "queue_processing_success_rate",
    name: "Queue Processing Success Rate",
    description: "Percentage of queue jobs that complete successfully",
    metric: {
      numerator: { counter: "queue_processing_total", filter: { status: "success" } },
      denominator: { counter: "queue_processing_total" },
    },
    unit: "%",
    direction: "higher-is-better",
  },
  queue_backlog: {
    id: "queue_backlog",
    name: "Queue Backlog Depth",
    description: "Number of jobs waiting in all queues",
    metric: {
      histograms: ["queue_depth"],
      aggregation: "max",
    },
    unit: "count",
    direction: "lower-is-better",
  },
  payment_success_rate: {
    id: "payment_success_rate",
    name: "Payment Success Rate",
    description: "Percentage of payment attempts that succeed",
    metric: {
      numerator: { counter: "payments_total", filter: { status: "success" } },
      denominator: { counter: "payments_total" },
    },
    unit: "%",
    direction: "higher-is-better",
  },
  auction_event_latency_p95: {
    id: "auction_event_latency_p95",
    name: "Auction Event P95 Latency",
    description: "95th percentile of auction event processing time in milliseconds",
    metric: {
      histogram: "auction_event_duration_ms",
      quantile: 0.95,
    },
    unit: "ms",
    direction: "lower-is-better",
  },
};

// =============================
// 🎯 SLO DEFINITIONS
// =============================

export const SLOS = [
  {
    id: "slo_availability",
    name: "API Availability",
    sliId: "availability",
    target: 99.9,
    windowDays: 30,
    description: "99.9% of API requests should succeed over a 30-day rolling window",
    severity: "critical",
    tier: "T1",
  },
  {
    id: "slo_latency_p95",
    name: "P95 Response Time",
    sliId: "latency_p95",
    target: 2000,
    operator: "lte",
    windowDays: 30,
    description: "95th percentile response time should be at most 2000ms",
    severity: "high",
    tier: "T1",
  },
  {
    id: "slo_latency_p99",
    name: "P99 Response Time",
    sliId: "latency_p99",
    target: 5000,
    operator: "lte",
    windowDays: 30,
    description: "99th percentile response time should be at most 5000ms",
    severity: "medium",
    tier: "T1",
  },
  {
    id: "slo_error_rate",
    name: "Error Rate",
    sliId: "error_rate",
    target: 1,
    operator: "lte",
    windowDays: 30,
    description: "Error rate should not exceed 1% over a 30-day rolling window",
    severity: "critical",
    tier: "T1",
  },
  {
    id: "slo_db_query_latency",
    name: "Database Query P95 Latency",
    sliId: "db_query_latency_p95",
    target: 500,
    operator: "lte",
    windowDays: 30,
    description: "95th percentile database query latency should be at most 500ms",
    severity: "high",
    tier: "T1",
  },
  {
    id: "slo_cache_hit_rate",
    name: "Cache Hit Rate",
    sliId: "cache_hit_rate",
    target: 80,
    operator: "gte",
    windowDays: 30,
    description: "Cache hit rate should be at least 80%",
    severity: "medium",
    tier: "T2",
  },
  {
    id: "slo_queue_success_rate",
    name: "Queue Processing Success Rate",
    sliId: "queue_processing_success_rate",
    target: 99,
    operator: "gte",
    windowDays: 7,
    description: "Queue job success rate should be at least 99% over 7 days",
    severity: "high",
    tier: "T1",
  },
  {
    id: "slo_queue_backlog",
    name: "Queue Backlog",
    sliId: "queue_backlog",
    target: 1000,
    operator: "lte",
    windowDays: 1,
    description: "Queue backlog should not exceed 1000 jobs",
    severity: "medium",
    tier: "T2",
  },
  {
    id: "slo_payment_success_rate",
    name: "Payment Success Rate",
    sliId: "payment_success_rate",
    target: 95,
    operator: "gte",
    windowDays: 30,
    description: "Payment success rate should be at least 95%",
    severity: "critical",
    tier: "T1",
  },
];

// =============================
// 💰 ERROR BUDGET CONFIG
// =============================

export const ERROR_BUDGET_CONFIG = {
  slo_availability: {
    totalBudget: 100 - 99.9, // 0.1% = ~43 min in 30 days
    unit: "percentage",
    alertThresholds: {
      warning: 50,  // 50% consumed
      critical: 80, // 80% consumed
      exhausted: 100,
    },
  },
  slo_error_rate: {
    totalBudget: 1, // 1% of requests
    unit: "percentage",
    alertThresholds: {
      warning: 50,
      critical: 80,
      exhausted: 100,
    },
  },
  slo_latency_p95: {
    totalBudget: 200, // ms (headroom against 2000ms target)
    unit: "milliseconds",
    alertThresholds: {
      warning: 50,
      critical: 80,
      exhausted: 100,
    },
  },
  slo_queue_success_rate: {
    totalBudget: 1, // 1% of jobs
    unit: "percentage",
    alertThresholds: {
      warning: 50,
      critical: 80,
      exhausted: 100,
    },
  },
  slo_payment_success_rate: {
    totalBudget: 5, // 5% of payments
    unit: "percentage",
    alertThresholds: {
      warning: 50,
      critical: 80,
      exhausted: 100,
    },
  },
};

// =============================
// 📊 TIER DEFINITIONS
// =============================

export const SERVICE_TIERS = {
  T1: {
    name: "Critical",
    description: "Revenue-critical paths — availability, payments, escrow, auctions",
    targetAvailability: 99.9,
    maxErrorBudgetConsumptionRate: "2% per hour",
  },
  T2: {
    name: "Important",
    description: "User-facing features — caching, search, notifications",
    targetAvailability: 99.5,
    maxErrorBudgetConsumptionRate: "5% per hour",
  },
  T3: {
    name: "Best Effort",
    description: "Analytics, reporting, administrative endpoints",
    targetAvailability: 99.0,
    maxErrorBudgetConsumptionRate: "10% per hour",
  },
};

// =============================
// 🔥 BURN RATE ALERT POLICIES (by reference — actual evaluation in alertPolicies.js)
// =============================

export const BURN_RATE_POLICIES = [
  {
    id: "burn-rate-critical-fast",
    name: "Critical SLO — Fast Burn",
    sloIds: ["slo_availability", "slo_error_rate", "slo_payment_success_rate"],
    burnRate: 6,     // 6x faster than expected
    windowMinutes: 30,
    severity: "critical",
    description: "Burning through error budget 6x faster than expected over 30min",
  },
  {
    id: "burn-rate-critical-slow",
    name: "Critical SLO — Slow Burn",
    sloIds: ["slo_availability", "slo_error_rate", "slo_payment_success_rate"],
    burnRate: 3,
    windowMinutes: 120,
    severity: "high",
    description: "Burning through error budget 3x faster than expected over 2 hours",
  },
  {
    id: "burn-rate-high-fast",
    name: "High SLO — Fast Burn",
    sloIds: ["slo_latency_p95", "slo_db_query_latency", "slo_queue_success_rate"],
    burnRate: 6,
    windowMinutes: 30,
    severity: "high",
    description: "Burning through error budget 6x faster than expected over 30min",
  },
  {
    id: "burn-rate-high-slow",
    name: "High SLO — Slow Burn",
    sloIds: ["slo_latency_p95", "slo_db_query_latency", "slo_queue_success_rate"],
    burnRate: 3,
    windowMinutes: 120,
    severity: "medium",
    description: "Burning through error budget 3x faster than expected over 2 hours",
  },
];

export default { SLIS, SLOS, ERROR_BUDGET_CONFIG, SERVICE_TIERS, BURN_RATE_POLICIES };
