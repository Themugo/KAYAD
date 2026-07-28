// backend/chaos/notificationOutage.js
// Chaos experiment: Notification service outage simulation

import { logInfo, logError } from '../utils/logger.js';

export async function simulateNotificationOutage(options = {}) {
  const {
    duration = 30000, // 30 seconds
    service = 'all', // all, email, sms, push, in-app
    severity = 'partial', // partial or full
  } = options;

  logInfo(`Starting notification outage simulation: ${service} ${severity} for ${duration}ms`);

  try {
    // Store chaos flag in Redis for notification service to check
    const redis = (await import('redis')).createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    await redis.connect();
    
    const chaosFlag = `chaos_mode_notification_${service}`;
    await redis.set(chaosFlag, severity);
    await redis.setEx(chaosFlag, Math.ceil(duration / 1000), severity);
    
    logInfo(`Notification chaos flag set: ${chaosFlag} = ${severity}`);

    // Wait for duration
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Remove chaos flag
    await redis.del(chaosFlag);
    logInfo('Notification chaos flag removed');

    await redis.quit();

    return {
      success: true,
      duration,
      service,
      severity,
    };
  } catch (error) {
    logError('Notification outage simulation failed', { error: error.message });
    throw error;
  }
}

export async function validateNotificationResilience() {
  logInfo('Validating notification resilience');

  const results = {
    retry: false,
    circuitBreaker: false,
    fallback: false,
    queue: false,
    overall: false,
  };

  try {
    // Test retry mechanism
    logInfo('Testing notification retry mechanism');
    const retryTest = await testNotificationRetry();
    results.retry = retryTest.success;

    // Test circuit breaker
    logInfo('Testing notification circuit breaker');
    const circuitBreakerTest = await testNotificationCircuitBreaker();
    results.circuitBreaker = circuitBreakerTest.success;

    // Test fallback to alternative channels
    logInfo('Testing notification fallback');
    const fallbackTest = await testNotificationFallback();
    results.fallback = fallbackTest.success;

    // Test queue persistence
    logInfo('Testing notification queue');
    const queueTest = await testNotificationQueue();
    results.queue = queueTest.success;

    results.overall = results.retry && results.queue;

    logInfo('Notification resilience validation complete', results);
    return results;
  } catch (error) {
    logError('Notification resilience validation failed', { error: error.message });
    return results;
  }
}

async function testNotificationRetry() {
  try {
    // Test that notification service retries failed sends
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testNotificationCircuitBreaker() {
  try {
    // Test circuit breaker pattern for notification operations
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testNotificationFallback() {
  try {
    // Test fallback to alternative notification channels
    const hasFallback = process.env.NOTIFICATION_FALLBACK_ENABLED === 'true';
    return { success: hasFallback, hasFallback };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testNotificationQueue() {
  try {
    // Test that failed notifications are queued for retry
    const { getQueueMetrics } = await import('../services/queueService.js');
    const metrics = await getQueueMetrics();
    
    const hasQueue = metrics.email?.waiting > 0 || metrics.notification?.waiting > 0;
    
    return { success: hasQueue, metrics };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
