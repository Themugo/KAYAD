// backend/infrastructure/circuitBreaker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Circuit breaker implementation for external services
// Prevents cascading failures by stopping calls to failing services
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🔌 CIRCUIT BREAKER STATES
// =============================

const CircuitState = {
  CLOSED: "closed", // Normal operation
  OPEN: "open", // Circuit is open, calls are blocked
  HALF_OPEN: "half_open", // Testing if service has recovered
};

// =============================
// 🔌 CIRCUIT BREAKER CONFIGURATION
// =============================

const defaultConfig = {
  failureThreshold: 5, // Number of failures before opening circuit
  successThreshold: 2, // Number of successes before closing circuit
  timeout: 60000, // Time (ms) before attempting half-open
  resetTimeout: 300000, // Time (ms) before resetting failure count
};

// =============================
// 🔌 CIRCUIT BREAKER CLASS
// =============================

class CircuitBreaker {
  constructor(serviceName, config = {}) {
    this.serviceName = serviceName;
    this.config = { ...defaultConfig, ...config };
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
    };
  }

  // =============================
  // 🔌 EXECUTE WITH CIRCUIT BREAKER
  // =============================

  async execute(fn) {
    this.metrics.totalCalls++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        this.metrics.rejectedCalls++;
        throw new Error(`Circuit breaker OPEN for ${this.serviceName} - calls blocked`);
      }
      // Transition to half-open
      this.state = CircuitState.HALF_OPEN;
      logInfo(`Circuit breaker HALF_OPEN for ${this.serviceName}`, { nextAttemptTime: this.nextAttemptTime });
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  // =============================
  // 🔌 HANDLE SUCCESS
  // =============================

  onSuccess() {
    this.metrics.successfulCalls++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
        logInfo(`Circuit breaker CLOSED for ${this.serviceName}`, { successCount: this.successCount });
      }
    } else {
      this.successCount = 0;
    }
  }

  // =============================
  // 🔌 HANDLE FAILURE
  // =============================

  onFailure(error) {
    this.metrics.failedCalls++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.timeout;
      logError(`Circuit breaker OPEN for ${this.serviceName}`, {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        nextAttemptTime: new Date(this.nextAttemptTime),
      });
    }
  }

  // =============================
  // 🔌 RESET CIRCUIT
  // =============================

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  // =============================
  // 🔌 GET STATE
  // =============================

  getState() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      metrics: this.metrics,
    };
  }

  // =============================
  // 🔌 FORCE OPEN
  // =============================

  forceOpen(duration = 60000) {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + duration;
    logWarn(`Circuit breaker force OPEN for ${this.serviceName}`, { duration });
  }

  // =============================
  // 🔌 FORCE CLOSE
  // =============================

  forceClose() {
    this.reset();
    logInfo(`Circuit breaker force CLOSED for ${this.serviceName}`);
  }
}

// =============================
// 🔌 CIRCUIT BREAKER REGISTRY
// =============================

const circuitBreakers = new Map();

// =============================
// 🔌 GET OR CREATE CIRCUIT BREAKER
// =============================

export const getCircuitBreaker = (serviceName, config) => {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, config));
  }
  return circuitBreakers.get(serviceName);
};

// =============================
// 🔌 GET ALL CIRCUIT BREAKER STATES
// =============================

export const getAllCircuitBreakerStates = () => {
  const states = {};
  for (const [name, breaker] of circuitBreakers) {
    states[name] = breaker.getState();
  }
  return states;
};

// =============================
// 🔌 RESET ALL CIRCUIT BREAKERS
// =============================

export const resetAllCircuitBreakers = () => {
  for (const [name, breaker] of circuitBreakers) {
    breaker.reset();
    logInfo(`Circuit breaker reset for ${name}`);
  }
};

// =============================
// 🔌 PRE-CONFIGURED CIRCUIT BREAKERS
// =============================

// Email service circuit breaker
export const emailCircuitBreaker = getCircuitBreaker("email-service", {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
  resetTimeout: 300000,
});

// SMS service circuit breaker
export const smsCircuitBreaker = getCircuitBreaker("sms-service", {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000,
  resetTimeout: 180000,
});

// Fraud detection service circuit breaker
export const fraudCircuitBreaker = getCircuitBreaker("fraud-service", {
  failureThreshold: 2,
  successThreshold: 2,
  timeout: 10000,
  resetTimeout: 60000,
});

// Cloudinary service circuit breaker
export const cloudinaryCircuitBreaker = getCircuitBreaker("cloudinary-service", {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
  resetTimeout: 300000,
});

// =============================
// 🔌 WRAPPER FUNCTIONS WITH CIRCUIT BREAKER
// =============================

export const withEmailCircuitBreaker = async (fn) => {
  return emailCircuitBreaker.execute(fn);
};

export const withSMSCircuitBreaker = async (fn) => {
  return smsCircuitBreaker.execute(fn);
};

export const withFraudCircuitBreaker = async (fn) => {
  return fraudCircuitBreaker.execute(fn);
};

export const withCloudinaryCircuitBreaker = async (fn) => {
  return cloudinaryCircuitBreaker.execute(fn);
};

export default {
  CircuitBreaker,
  getCircuitBreaker,
  getAllCircuitBreakerStates,
  resetAllCircuitBreakers,
  withEmailCircuitBreaker,
  withSMSCircuitBreaker,
  withFraudCircuitBreaker,
  withCloudinaryCircuitBreaker,
  emailCircuitBreaker,
  smsCircuitBreaker,
  fraudCircuitBreaker,
  cloudinaryCircuitBreaker,
};
