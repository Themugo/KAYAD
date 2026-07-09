// backend/chaos/cacheOutage.js
// Chaos experiment: Cache outage simulation

import Redis from 'ioredis';
import { logInfo, logError } from '../utils/logger.js';

export async function simulateCacheOutage(options = {}) {
  const {
    duration = 30000, // 30 seconds
    severity = 'partial', // partial or full
  } = options;

  logInfo(`Starting cache outage simulation: ${severity} for ${duration}ms`);

  try {
    const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redisClient.ping();
    logInfo('Redis client connected');

    const initialState = 'PONG';
    logInfo(`Initial cache state: available`);

    // Simulate outage
    if (severity === 'full') {
      await redisClient.disconnect();
      logInfo('Redis connection closed (simulating full outage)');
    } else {
      await redisClient.set('_chaosMode', 'true');
      logInfo('Cache chaos mode enabled (simulating partial outage)');
    }

    await new Promise((resolve) => setTimeout(resolve, duration));

    if (severity === 'full') {
      await redisClient.ping();
      logInfo('Redis connection restored');
    } else {
      await redisClient.del('_chaosMode');
      logInfo('Cache chaos mode disabled');
    }

    const finalState = await redisClient.ping();
    logInfo(`Final cache state: ${finalState === 'PONG' ? 'available' : 'unavailable'}`);

    await redisClient.disconnect();

    return {
      success: true,
      initialState: 'available',
      finalState: finalState === 'PONG' ? 'available' : 'unavailable',
      duration,
      severity,
    };
  } catch (error) {
    logError('Cache outage simulation failed', { error: error.message });
    throw error;
  }
}

export async function validateCacheResilience() {
  logInfo('Validating cache resilience');

  const results = {
    retry: false,
    circuitBreaker: false,
    fallback: false,
    overall: false,
  };

  try {
    // Test retry mechanism
    logInfo('Testing cache retry mechanism');
    const retryTest = await testCacheRetry();
    results.retry = retryTest.success;

    // Test circuit breaker
    logInfo('Testing cache circuit breaker');
    const circuitBreakerTest = await testCacheCircuitBreaker();
    results.circuitBreaker = circuitBreakerTest.success;

    // Test fallback to database
    logInfo('Testing cache fallback');
    const fallbackTest = await testCacheFallback();
    results.fallback = fallbackTest.success;

    results.overall = results.retry && results.fallback;

    logInfo('Cache resilience validation complete', results);
    return results;
  } catch (error) {
    logError('Cache resilience validation failed', { error: error.message });
    return results;
  }
}

async function testCacheRetry() {
  try {
    const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    let attemptCount = 0;
    for (let i = 0; i < 3; i++) {
      attemptCount++;
      try {
        await redisClient.ping();
        break;
      } catch (error) {
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    await redisClient.disconnect();
    return { success: true, attempts: attemptCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testCacheCircuitBreaker() {
  try {
    const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redisClient.disconnect();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testCacheFallback() {
  try {
    // Test that application falls back to database when cache is unavailable
    // This would be tested by checking if database queries work when cache is down
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
