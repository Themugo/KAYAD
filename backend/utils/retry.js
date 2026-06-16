const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const circuitStore = new Map();

const defaultOptions = {
  retries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
  circuitBreaker: false,
  circuitThreshold: 5,
  circuitResetMs: 30000,
  onRetry: null,
  onCircuitOpen: null,
  onCircuitClose: null,
};

export async function withRetry(fn, opts = {}) {
  const { retries, baseDelayMs, maxDelayMs, circuitBreaker, circuitThreshold, circuitResetMs, onRetry, onCircuitOpen, onCircuitClose } = {
    ...defaultOptions,
    ...opts,
  };

  if (circuitBreaker) {
    const key = opts.key || fn.name || "default";
    const state = circuitStore.get(key) || { failures: 0, openUntil: 0, wasOpen: false };

    if (state.openUntil > Date.now()) {
      const timeUntilReset = Math.ceil((state.openUntil - Date.now()) / 1000);
      const error = new Error(
        `Circuit breaker open for ${key} — reset in ${timeUntilReset}s`,
      );
      error.code = "CIRCUIT_BREAKER_OPEN";
      error.key = key;
      error.resetTime = timeUntilReset;
      throw error;
    }

    try {
      const result = await attempt(fn, retries, baseDelayMs, maxDelayMs, onRetry);
      
      // Circuit was open, now closed
      if (state.wasOpen) {
        console.log(`✅ Circuit breaker closed for ${key}`);
        state.wasOpen = false;
        if (onCircuitClose) onCircuitClose(key);
      }
      
      state.failures = 0;
      circuitStore.set(key, state);
      return result;
    } catch (err) {
      state.failures++;
      
      // Circuit just opened
      if (state.failures >= circuitThreshold && !state.wasOpen) {
        state.openUntil = Date.now() + circuitResetMs;
        state.wasOpen = true;
        console.error(`🚨 Circuit breaker OPENED for ${key} after ${state.failures} failures`);
        if (onCircuitOpen) onCircuitOpen(key, state.failures, circuitResetMs);
      }
      
      circuitStore.set(key, state);
      throw err;
    }
  }

  return attempt(fn, retries, baseDelayMs, maxDelayMs, onRetry);
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
  console.log(`🔄 Circuit breaker reset for ${key}`);
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
