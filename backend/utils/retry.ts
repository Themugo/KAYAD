import { recordMetric, setGauge, incrementCounter } from "../config/metrics.ts";
import { logInfo, logError, logWarn } from "./logger.ts";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const circuitStore = new Map();

// Service-specific default configurations
const serviceDefaults = {
  mpesa: {
    retries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    timeoutMs: 30000,
    circuitThreshold: 3,
    circuitResetMs: 60000,
  },
  email: {
    retries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    timeoutMs: 30000,
    circuitThreshold: 3,
    circuitResetMs: 60000,
  },
  sms: {
    retries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    timeoutMs: 15000,
    circuitThreshold: 5,
    circuitResetMs: 30000,
  },
  redis: {
    retries: 3,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    timeoutMs: 5000,
    circuitThreshold: 5,
    circuitResetMs: 30000,
  },
  sentry: {
    retries: 1,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    timeoutMs: 10000,
    circuitThreshold: 3,
    circuitResetMs: 60000,
  },
  socket: {
    retries: 2,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    timeoutMs: 5000,
    circuitThreshold: 5,
    circuitResetMs: 30000,
  },
};

const defaultOptions = {
  retries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
  timeoutMs: 30000,
  circuitBreaker: false,
  circuitThreshold: 5,
  circuitResetMs: 30000,
  onRetry: null,
  onCircuitOpen: null,
  onCircuitClose: null,
  onTimeout: null,
  onFallback: null,
  fallback: null,
  serviceName: null,
  enableMetrics: true,
  enableLogging: true,
};

export async function withRetry(fn, opts = {}) {
  // Merge service defaults with provided options
  let mergedOpts = { ...defaultOptions, ...opts };

  if (opts.serviceName && serviceDefaults[opts.serviceName]) {
    mergedOpts = { ...serviceDefaults[opts.serviceName], ...mergedOpts };
  }

  const {
    retries,
    baseDelayMs,
    maxDelayMs,
    timeoutMs,
    circuitBreaker,
    circuitThreshold,
    circuitResetMs,
    onRetry,
    onCircuitOpen,
    onCircuitClose,
    onTimeout,
    onFallback,
    fallback,
    serviceName,
    enableMetrics,
    enableLogging,
  } = mergedOpts;

  const key = opts.key || fn.name || "default";
  const startTime = Date.now();

  // Circuit breaker check
  if (circuitBreaker) {
    const state = circuitStore.get(key) || { failures: 0, openUntil: 0, wasOpen: false };

    if (state.openUntil > Date.now()) {
      const timeUntilReset = Math.ceil((state.openUntil - Date.now()) / 1000);

      if (enableLogging) {
        logWarn(`Circuit breaker open for ${key} — reset in ${timeUntilReset}s`, { key, timeUntilReset });
      }

      if (enableMetrics) {
        incrementCounter("circuit_breaker_rejected", { service: serviceName || key });
      }

      // Try fallback if available
      if (fallback) {
        if (enableLogging) {
          logInfo(`Attempting fallback for ${key}`, { key });
        }
        if (enableMetrics) {
          incrementCounter("fallback_attempted", { service: serviceName || key });
        }
        if (onFallback) onFallback(key);
        return await fallback();
      }

      const error = new Error(`Circuit breaker open for ${key} — reset in ${timeUntilReset}s`);
      error.code = "CIRCUIT_BREAKER_OPEN";
      error.key = key;
      error.resetTime = timeUntilReset;
      throw error;
    }

    try {
      const result = await attemptWithTimeout(fn, retries, baseDelayMs, maxDelayMs, timeoutMs, onRetry, onTimeout, {
        serviceName,
        key,
        enableMetrics,
        enableLogging,
      });

      // Circuit was open, now closed
      if (state.wasOpen) {
        if (enableLogging) {
          logInfo(`Circuit breaker closed for ${key}`, { key });
        }
        state.wasOpen = false;
        if (onCircuitClose) onCircuitClose(key);
        if (enableMetrics) {
          incrementCounter("circuit_breaker_closed", { service: serviceName || key });
        }
      }

      state.failures = 0;
      circuitStore.set(key, state);

      // Record success metrics
      if (enableMetrics) {
        const duration = Date.now() - startTime;
        recordMetric("external_service_duration", duration, { service: serviceName || key, status: "success" });
        incrementCounter("external_service_success", { service: serviceName || key });
      }

      return result;
    } catch (err) {
      state.failures++;

      // Circuit just opened
      if (state.failures >= circuitThreshold && !state.wasOpen) {
        state.openUntil = Date.now() + circuitResetMs;
        state.wasOpen = true;

        if (enableLogging) {
          logError(`Circuit breaker OPENED for ${key} after ${state.failures} failures`, err, {
            key,
            failures: state.failures,
          });
        }

        if (onCircuitOpen) onCircuitOpen(key, state.failures, circuitResetMs);

        if (enableMetrics) {
          incrementCounter("circuit_breaker_opened", { service: serviceName || key });
          setGauge("circuit_breaker_failures", state.failures, { service: serviceName || key });
        }
      }

      circuitStore.set(key, state);

      // Record failure metrics
      if (enableMetrics) {
        const duration = Date.now() - startTime;
        recordMetric("external_service_duration", duration, { service: serviceName || key, status: "error" });
        incrementCounter("external_service_failure", {
          service: serviceName || key,
          error_type: err.code || "unknown",
        });
      }

      // Try fallback if available
      if (fallback) {
        if (enableLogging) {
          logInfo(`Attempting fallback for ${key} after failure`, { key, error: err.message });
        }
        if (enableMetrics) {
          incrementCounter("fallback_attempted", { service: serviceName || key });
        }
        if (onFallback) onFallback(key, err);
        return await fallback();
      }

      throw err;
    }
  }

  // No circuit breaker, just retry with timeout
  try {
    const result = await attemptWithTimeout(fn, retries, baseDelayMs, maxDelayMs, timeoutMs, onRetry, onTimeout, {
      serviceName,
      key,
      enableMetrics,
      enableLogging,
    });

    if (enableMetrics) {
      const duration = Date.now() - startTime;
      recordMetric("external_service_duration", duration, { service: serviceName || key, status: "success" });
      incrementCounter("external_service_success", { service: serviceName || key });
    }

    return result;
  } catch (err) {
    if (enableMetrics) {
      const duration = Date.now() - startTime;
      recordMetric("external_service_duration", duration, { service: serviceName || key, status: "error" });
      incrementCounter("external_service_failure", { service: serviceName || key, error_type: err.code || "unknown" });
    }

    // Try fallback if available
    if (fallback) {
      if (enableLogging) {
        logInfo(`Attempting fallback for ${key} after failure`, { key, error: err.message });
      }
      if (enableMetrics) {
        incrementCounter("fallback_attempted", { service: serviceName || key });
      }
      if (onFallback) onFallback(key, err);
      return await fallback();
    }

    throw err;
  }
}

async function attemptWithTimeout(fn, retries, baseDelayMs, maxDelayMs, timeoutMs, onRetry, onTimeout, context) {
  const { serviceName, key, enableMetrics, enableLogging } = context;
  let lastErr;

  for (let i = 0; i <= retries; i++) {
    try {
      // Wrap function with timeout
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => {
          setTimeout(() => {
            const timeoutError = new Error(`Operation timeout after ${timeoutMs}ms`);
            timeoutError.code = "TIMEOUT";
            timeoutError.service = serviceName || key;
            reject(timeoutError);
          }, timeoutMs);
        }),
      ]);

      return result;
    } catch (err) {
      lastErr = err;

      if (err.code === "TIMEOUT") {
        if (enableLogging) {
          logError(`Operation timeout for ${key} (attempt ${i + 1}/${retries + 1})`, err, {
            serviceName,
            key,
            timeoutMs,
            attempt: i + 1,
          });
        }

        if (enableMetrics) {
          incrementCounter("external_service_timeout", { service: serviceName || key });
        }

        if (onTimeout) onTimeout(key, i + 1, timeoutMs);
      }

      if (i < retries) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 100;
        const delay = Math.min(baseDelayMs * Math.pow(2, i) + jitter, maxDelayMs);

        if (enableLogging) {
          logInfo(`Retrying ${key} (attempt ${i + 2}/${retries + 1}) after ${delay}ms`, {
            serviceName,
            key,
            delay,
            error: err.message,
          });
        }

        if (enableMetrics) {
          incrementCounter("external_service_retry", { service: serviceName || key });
        }

        if (onRetry) onRetry(err, i + 1, retries, delay);
        await sleep(delay);
      }
    }
  }

  throw lastErr;
}

async function attempt(fn, retries, baseDelayMs, maxDelayMs, onRetry) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, i) + Math.random() * 100, maxDelayMs);
        if (onRetry) onRetry(err, i + 1, retries, delay);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

export function resetCircuit(key) {
  circuitStore.delete(key);
  logInfo(`Circuit breaker reset for ${key}`, { key });
  incrementCounter("circuit_breaker_reset", { service: key });
}

export function getCircuitState(key) {
  const state = circuitStore.get(key);
  if (!state) return { status: "closed", failures: 0 };

  if (state.openUntil > Date.now()) {
    return {
      status: "open",
      failures: state.failures,
      resetIn: Math.ceil((state.openUntil - Date.now()) / 1000),
    };
  }

  return {
    status: "closed",
    failures: state.failures,
  };
}

export function getAllCircuitStates() {
  const states = {};
  for (const [key, state] of circuitStore.entries()) {
    states[key] = getCircuitState(key);
  }
  return states;
}

// Export service defaults for external use
export { serviceDefaults };

// Helper function to create service-specific retry configuration
export function createServiceConfig(serviceName, overrides = {}) {
  const defaults = serviceDefaults[serviceName] || defaultOptions;
  return {
    ...defaults,
    ...overrides,
    serviceName,
  };
}
