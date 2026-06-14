/**
 * Service Fallback Mechanism
 * Provides fallback behavior when third-party services fail
 */

import { logger } from '../utils/logger.js';

/**
 * Fallback configuration for services
 */
export const FALLBACK_CONFIG = {
  email: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    fallbackTo: 'queue', // queue, ignore, or alternative service
  },
  sms: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    fallbackTo: 'queue',
  },
  payment: {
    enabled: true,
    maxRetries: 2,
    retryDelay: 2000,
    fallbackTo: 'manual', // manual intervention required
  },
  cloudinary: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    fallbackTo: 'local', // local storage
  },
  analytics: {
    enabled: true,
    maxRetries: 1,
    retryDelay: 500,
    fallbackTo: 'ignore', // silently fail
  },
};

/**
 * Retry wrapper for service calls
 */
export async function withRetry(
  serviceFn,
  serviceName,
  config = FALLBACK_CONFIG[serviceName.toLowerCase()] || FALLBACK_CONFIG.analytics
) {
  if (!config.enabled) {
    return serviceFn();
  }

  let lastError;
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await serviceFn();
    } catch (error) {
      lastError = error;
      logger.warn(`${serviceName} attempt ${attempt}/${config.maxRetries} failed`, {
        error: error.message,
        attempt,
      });

      if (attempt < config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }
  }

  // All retries failed, apply fallback
  logger.error(`${serviceName} failed after ${config.maxRetries} attempts`, {
    error: lastError.message,
    fallback: config.fallbackTo,
  });

  return applyFallback(serviceName, config.fallbackTo, lastError);
}

/**
 * Apply fallback strategy
 */
function applyFallback(serviceName, fallbackStrategy, error) {
  switch (fallbackStrategy) {
    case 'queue':
      logger.info(`${serviceName} queued for retry`, { serviceName });
      return { success: false, queued: true, error: error.message };

    case 'ignore':
      logger.warn(`${serviceName} ignored due to failure`, { serviceName });
      return { success: false, ignored: true };

    case 'manual':
      logger.error(`${serviceName} requires manual intervention`, { serviceName });
      return { success: false, manualIntervention: true, error: error.message };

    case 'local':
      logger.info(`${serviceName} falling back to local storage`, { serviceName });
      return { success: false, fallback: 'local', error: error.message };

    default:
      throw error;
  }
}

/**
 * Circuit breaker pattern for service calls
 */
class CircuitBreaker {
  constructor(serviceName, threshold = 5, timeout = 60000) {
    this.serviceName = serviceName;
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'closed'; // closed, open, half-open
  }

  async execute(serviceFn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        logger.info(`${this.serviceName} circuit breaker entering half-open state`);
      } else {
        throw new Error(`${this.serviceName} circuit breaker is open`);
      }
    }

    try {
      const result = await serviceFn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      logger.info(`${this.serviceName} circuit breaker closed`);
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      logger.error(`${this.serviceName} circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Circuit breaker instances
export const circuitBreakers = {
  email: new CircuitBreaker('email', 5, 60000),
  sms: new CircuitBreaker('sms', 5, 60000),
  payment: new CircuitBreaker('payment', 3, 120000),
  cloudinary: new CircuitBreaker('cloudinary', 5, 60000),
};

/**
 * Execute service with circuit breaker and retry
 */
export async function withResilience(serviceFn, serviceName, config) {
  const breaker = circuitBreakers[serviceName.toLowerCase()];
  
  if (breaker) {
    return breaker.execute(() => withRetry(serviceFn, serviceName, config));
  }
  
  return withRetry(serviceFn, serviceName, config);
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitBreakerStatus() {
  return Object.entries(circuitBreakers).reduce((acc, [name, breaker]) => {
    acc[name] = breaker.getState();
    return acc;
  }, {});
}
