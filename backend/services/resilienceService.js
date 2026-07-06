// backend/services/resilienceService.js
// Resilience patterns: Retry, Circuit Breaker, Failover

import { logInfo, logError } from '../utils/logger.js';

/**
 * Retry mechanism with exponential backoff
 */
export class RetryMechanism {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
  }

  async execute(fn, context = {}) {
    let lastError;
    let delay = this.initialDelay;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        
        if (attempt > 0) {
          logInfo(`Retry succeeded after ${attempt} attempts`, context);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          logInfo(`Retry attempt ${attempt + 1}/${this.maxRetries} after ${delay}ms`, {
            ...context,
            error: error.message,
          });
          
          await this.sleep(delay);
          delay = Math.min(delay * this.backoffMultiplier, this.maxDelay);
        }
      }
    }

    logError(`All ${this.maxRetries} retry attempts failed`, {
      ...context,
      error: lastError.message,
    });

    throw lastError;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker pattern
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(fn, context = {}) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        logInfo('Circuit breaker transitioning to HALF_OPEN', context);
      } else {
        const error = new Error('Circuit breaker is OPEN');
        logError('Circuit breaker rejected request', context);
        throw error;
      }
    }

    try {
      const result = await fn();
      this.onSuccess(context);
      return result;
    } catch (error) {
      this.onFailure(context);
      throw error;
    }
  }

  onSuccess(context) {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.successCount = 0;
      logInfo('Circuit breaker reset to CLOSED', context);
    } else {
      this.successCount++;
    }
  }

  onFailure(context) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logError(`Circuit breaker opened after ${this.failureCount} failures`, context);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    logInfo('Circuit breaker manually reset');
  }
}

/**
 * Failover mechanism
 */
export class FailoverMechanism {
  constructor(options = {}) {
    this.primary = options.primary;
    this.secondaries = options.secondaries || [];
    this.current = 'primary';
    this.failureThreshold = options.failureThreshold || 3;
    this.failureCount = 0;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
  }

  async execute(fn, context = {}) {
    const endpoints = this.getEndpoints();
    
    for (const endpoint of endpoints) {
      try {
        logInfo(`Attempting ${endpoint}`, context);
        const result = await fn(endpoint);
        
        this.onSuccess(endpoint);
        return result;
      } catch (error) {
        logError(`Failed on ${endpoint}`, {
          ...context,
          error: error.message,
        });
        
        this.onFailure(endpoint);
      }
    }

    throw new Error('All endpoints failed');
  }

  getEndpoints() {
    if (this.current === 'primary') {
      return [this.primary, ...this.secondaries];
    } else {
      return [...this.secondaries, this.primary];
    }
  }

  onSuccess(endpoint) {
    this.failureCount = 0;
    
    if (endpoint === this.primary && this.current !== 'primary') {
      this.current = 'primary';
      logInfo('Failover: Switched back to primary endpoint');
    }
  }

  onFailure(endpoint) {
    this.failureCount++;

    if (this.failureCount >= this.failureThreshold && endpoint === this.primary) {
      this.current = 'secondary';
      logError(`Failover: Switched to secondary after ${this.failureCount} failures`);
    }
  }

  getState() {
    return {
      current: this.current,
      failureCount: this.failureCount,
      primary: this.primary,
      secondaries: this.secondaries,
    };
  }

  reset() {
    this.current = 'primary';
    this.failureCount = 0;
    logInfo('Failover mechanism reset');
  }
}

/**
 * Resilience service combining all patterns
 */
export class ResilienceService {
  constructor(options = {}) {
    this.retry = new RetryMechanism(options.retry);
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
    this.failover = new FailoverMechanism(options.failover);
  }

  async execute(fn, context = {}) {
    return this.retry.execute(async () => {
      return this.circuitBreaker.execute(async () => {
        return this.failover.execute(fn, context);
      }, context);
    }, context);
  }

  getState() {
    return {
      retry: {
        maxRetries: this.retry.maxRetries,
      },
      circuitBreaker: this.circuitBreaker.getState(),
      failover: this.failover.getState(),
    };
  }

  reset() {
    this.circuitBreaker.reset();
    this.failover.reset();
    logInfo('Resilience service reset');
  }
}

export default {
  RetryMechanism,
  CircuitBreaker,
  FailoverMechanism,
  ResilienceService,
};
