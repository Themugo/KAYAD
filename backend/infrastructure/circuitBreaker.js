// Circuit breaker state registry
// Provides global visibility into circuit breaker states across services

const circuitBreakers = new Map();

export function registerCircuitBreaker(name, instance) {
  circuitBreakers.set(name, instance);
}

export function getAllCircuitBreakerStates() {
  const states = {};
  for (const [name, cb] of circuitBreakers) {
    states[name] = typeof cb.getState === "function" ? cb.getState() : { status: "closed" };
  }
  return states;
}

export function getCircuitBreakerState(name) {
  const cb = circuitBreakers.get(name);
  return cb ? (typeof cb.getState === "function" ? cb.getState() : { status: "closed" }) : null;
}

export default { registerCircuitBreaker, getAllCircuitBreakerStates, getCircuitBreakerState };
