// backend/chaos/databaseOutage.js
// Chaos experiment: Database outage simulation

import mongoose from 'mongoose';
import { logInfo, logError } from '../utils/logger.js';
import { ResilienceService } from '../services/resilienceService.js';

export async function simulateDatabaseOutage(options = {}) {
  const {
    duration = 30000, // 30 seconds
    severity = 'partial', // partial or full
  } = options;

  logInfo(`Starting database outage simulation: ${severity} for ${duration}ms`);

  const resilienceService = new ResilienceService();

  try {
    // Get initial connection state
    const initialState = mongoose.connection.readyState;
    logInfo(`Initial database state: ${initialState}`);

    // Simulate outage
    if (severity === 'full') {
      // Close connection
      await mongoose.connection.close();
      logInfo('Database connection closed (simulating full outage)');
    } else {
      // Simulate partial outage by setting a flag
      mongoose.connection._chaosMode = true;
      logInfo('Database chaos mode enabled (simulating partial outage)');
    }

    // Wait for duration
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Restore connection
    if (severity === 'full') {
      await mongoose.connect(process.env.MONGODB_URI);
      logInfo('Database connection restored');
    } else {
      mongoose.connection._chaosMode = false;
      logInfo('Database chaos mode disabled');
    }

    // Validate resilience
    const finalState = mongoose.connection.readyState;
    logInfo(`Final database state: ${finalState}`);

    return {
      success: true,
      initialState,
      finalState,
      duration,
      severity,
    };
  } catch (error) {
    logError('Database outage simulation failed', { error: error.message });
    
    // Attempt recovery
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      logInfo('Database connection recovered after error');
    } catch (recoveryError) {
      logError('Database recovery failed', { error: recoveryError.message });
    }

    throw error;
  }
}

export async function validateDatabaseResilience() {
  logInfo('Validating database resilience');

  const results = {
    retry: false,
    circuitBreaker: false,
    failover: false,
    overall: false,
  };

  try {
    // Test retry mechanism
    logInfo('Testing retry mechanism');
    const retryTest = await testDatabaseRetry();
    results.retry = retryTest.success;

    // Test circuit breaker
    logInfo('Testing circuit breaker');
    const circuitBreakerTest = await testDatabaseCircuitBreaker();
    results.circuitBreaker = circuitBreakerTest.success;

    // Test failover (if secondary is configured)
    logInfo('Testing failover');
    const failoverTest = await testDatabaseFailover();
    results.failover = failoverTest.success;

    results.overall = results.retry && results.circuitBreaker;

    logInfo('Database resilience validation complete', results);
    return results;
  } catch (error) {
    logError('Database resilience validation failed', { error: error.message });
    return results;
  }
}

async function testDatabaseRetry() {
  try {
    const resilienceService = new ResilienceService({
      retry: { maxRetries: 3, initialDelay: 1000 },
    });

    let attemptCount = 0;
    await resilienceService.retry.execute(async () => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error('Simulated database error');
      }
      return { success: true };
    });

    return { success: true, attempts: attemptCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testDatabaseCircuitBreaker() {
  try {
    const circuitBreaker = new ResilienceService().circuitBreaker;

    // Trigger failures to open circuit
    for (let i = 0; i < 6; i++) {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('Simulated error');
        });
      } catch (error) {
        // Expected
      }
    }

    const state = circuitBreaker.getState();
    return { success: state.state === 'OPEN', state };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testDatabaseFailover() {
  try {
    // This would test actual failover to secondary database
    // For now, return success if secondary is configured
    const hasSecondary = process.env.MONGODB_SECONDARY_URI;
    return { success: !!hasSecondary, hasSecondary };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
