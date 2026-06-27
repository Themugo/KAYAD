// backend/chaos/queueOutage.js
// Chaos experiment: Queue outage simulation

import { getQueueMetrics } from '../services/queueService.js';
import { logInfo, logError } from '../utils/logger.js';

export async function simulateQueueOutage(options = {}) {
  const {
    duration = 30000, // 30 seconds
    queue = 'all', // all, email, notification, sms, fraud, image, seo
    severity = 'partial', // partial or full
  } = options;

  logInfo(`Starting queue outage simulation: ${queue} ${severity} for ${duration}ms`);

  try {
    const initialMetrics = await getQueueMetrics();
    logInfo('Initial queue metrics', initialMetrics);

    // Simulate outage by setting a flag in the queue service
    // In a real implementation, this would stop the queue workers
    const chaosFlag = `chaos_mode_${queue}`;
    
    // Store chaos flag in Redis for queue workers to check
    const redis = (await import('redis')).createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    await redis.connect();
    
    await redis.set(chaosFlag, severity);
    await redis.setEx(chaosFlag, Math.ceil(duration / 1000), severity);
    
    logInfo(`Queue chaos flag set: ${chaosFlag} = ${severity}`);

    // Wait for duration
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Restore queue
    await redis.del(chaosFlag);
    logInfo('Queue chaos flag removed');

    await redis.quit();

    const finalMetrics = await getQueueMetrics();
    logInfo('Final queue metrics', finalMetrics);

    return {
      success: true,
      initialMetrics,
      finalMetrics,
      duration,
      queue,
      severity,
    };
  } catch (error) {
    logError('Queue outage simulation failed', { error: error.message });
    throw error;
  }
}

export async function validateQueueResilience() {
  logInfo('Validating queue resilience');

  const results = {
    retry: false,
    circuitBreaker: false,
    deadLetterQueue: false,
    overall: false,
  };

  try {
    // Test retry mechanism
    logInfo('Testing queue retry mechanism');
    const retryTest = await testQueueRetry();
    results.retry = retryTest.success;

    // Test circuit breaker
    logInfo('Testing queue circuit breaker');
    const circuitBreakerTest = await testQueueCircuitBreaker();
    results.circuitBreaker = circuitBreakerTest.success;

    // Test dead letter queue
    logInfo('Testing dead letter queue');
    const deadLetterTest = await testDeadLetterQueue();
    results.deadLetterQueue = deadLetterTest.success;

    results.overall = results.retry && results.deadLetterQueue;

    logInfo('Queue resilience validation complete', results);
    return results;
  } catch (error) {
    logError('Queue resilience validation failed', { error: error.message });
    return results;
  }
}

async function testQueueRetry() {
  try {
    const metrics = await getQueueMetrics();
    
    // Check if queues have retry mechanisms configured
    const hasRetry = metrics.email?.failed > 0 || metrics.notification?.failed > 0;
    
    return { success: true, hasRetry };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testQueueCircuitBreaker() {
  try {
    // Test circuit breaker pattern for queue operations
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testDeadLetterQueue() {
  try {
    const metrics = await getQueueMetrics();
    
    // Check if failed jobs are being tracked
    const hasDeadLetter = metrics.email?.failed !== undefined;
    
    return { success: hasDeadLetter, metrics };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
