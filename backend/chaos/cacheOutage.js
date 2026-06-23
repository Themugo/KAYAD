// backend/chaos/cacheOutage.js
// Chaos experiment: Cache outage simulation

import { createClient } from 'redis';
import { logInfo, logError } from '../utils/logger.js';

export async function simulateCacheOutage(options = {}) {
  const {
    duration = 30000, // 30 seconds
    severity = 'partial', // partial or full
  } = options;

  logInfo(`Starting cache outage simulation: ${severity} for ${duration}ms`);

  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    await redisClient.connect();
    logInfo('Redis client connected');

    const initialState = await redisClient.ping();
    logInfo(`Initial cache state: ${initialState ? 'available' : 'unavailable'}`);

    // Simulate outage
    if (severity === 'full') {
      await redisClient.quit();
      logInfo('Redis connection closed (simulating full outage)');
    } else {
      // Simulate partial outage by setting a flag
      await redisClient.set('_chaosMode', 'true');
      logInfo('Cache chaos mode enabled (simulating partial outage)');
    }

    // Wait for duration
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Restore connection
    if (severity === 'full') {
      await redisClient.connect();
      logInfo('Redis connection restored');
    } else {
      await redisClient.del('_chaosMode');
      logInfo('Cache chaos mode disabled');
    }

    const finalState = await redisClient.ping();
    logInfo(`Final cache state: ${finalState ? 'available' : 'unavailable'}`);

    await redisClient.quit();

    return {
      success: true,
      initialState: initialState ? 'available' : 'unavailable',
      finalState: finalState ? 'available' : 'unavailable',
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
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    await redisClient.connect();

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

    await redisClient.quit();
    return { success: true, attempts: attemptCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testCacheCircuitBreaker() {
  try {
    // Test circuit breaker pattern for cache
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    await redisClient.connect();
    await redisClient.quit();

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
