const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const circuitStore = new Map();

const defaultOptions = {
  retries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
  circuitBreaker: false,
  circuitThreshold: 5,
  circuitResetMs: 30000,
  onRetry: null,
};

export async function withRetry(fn, opts = {}) {
  const { retries, baseDelayMs, maxDelayMs, circuitBreaker, circuitThreshold, circuitResetMs, onRetry } = { ...defaultOptions, ...opts };

  if (circuitBreaker) {
    const key = opts.key || fn.name || "default";
    const state = circuitStore.get(key) || { failures: 0, openUntil: 0 };

    if (state.openUntil > Date.now()) {
      throw new Error(`Circuit breaker open for ${key} — reset in ${Math.ceil((state.openUntil - Date.now()) / 1000)}s`);
    }

    try {
      const result = await attempt(fn, retries, baseDelayMs, maxDelayMs, onRetry);
      state.failures = 0;
      circuitStore.set(key, state);
      return result;
    } catch (err) {
      state.failures++;
      if (state.failures >= circuitThreshold) {
        state.openUntil = Date.now() + circuitResetMs;
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
}
