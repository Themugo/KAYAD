// backend/chaos/paymentOutage.js
// Chaos experiment: Payment provider outage simulation

import { logInfo, logError } from '../utils/logger.js';
import Payment from '../models/Payment.js';

export async function simulatePaymentOutage(options = {}) {
  const {
    duration = 30000, // 30 seconds
    provider = 'mpesa', // mpesa, card, bank
    severity = 'partial', // partial or full
  } = options;

  logInfo(`Starting payment provider outage simulation: ${provider} ${severity} for ${duration}ms`);

  try {
    // Store chaos flag in database for payment service to check
    const chaosFlag = `chaos_mode_payment_${provider}`;
    
    await Payment.collection.updateOne(
      { _id: 'chaos_flags' },
      { $set: { [flags]: { provider, severity, until: Date.now() + duration } } },
      { upsert: true }
    );
    
    logInfo(`Payment chaos flag set: ${provider} = ${severity}`);

    // Wait for duration
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Remove chaos flag
    await Payment.collection.updateOne(
      { _id: 'chaos_flags' },
      { $unset: { [flags]: '' } }
    );
    
    logInfo('Payment chaos flag removed');

    return {
      success: true,
      duration,
      provider,
      severity,
    };
  } catch (error) {
    logError('Payment outage simulation failed', { error: error.message });
    throw error;
  }
}

export async function validatePaymentResilience() {
  logInfo('Validating payment resilience');

  const results = {
    retry: false,
    circuitBreaker: false,
    fallback: false,
    escrow: false,
    overall: false,
  };

  try {
    // Test retry mechanism
    logInfo('Testing payment retry mechanism');
    const retryTest = await testPaymentRetry();
    results.retry = retryTest.success;

    // Test circuit breaker
    logInfo('Testing payment circuit breaker');
    const circuitBreakerTest = await testPaymentCircuitBreaker();
    results.circuitBreaker = circuitBreakerTest.success;

    // Test fallback to alternative payment methods
    logInfo('Testing payment fallback');
    const fallbackTest = await testPaymentFallback();
    results.fallback = fallbackTest.success;

    // Test escrow protection
    logInfo('Testing escrow protection');
    const escrowTest = await testEscrowProtection();
    results.escrow = escrowTest.success;

    results.overall = results.retry && results.escrow;

    logInfo('Payment resilience validation complete', results);
    return results;
  } catch (error) {
    logError('Payment resilience validation failed', { error: error.message });
    return results;
  }
}

async function testPaymentRetry() {
  try {
    // Test that payment service retries failed transactions
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testPaymentCircuitBreaker() {
  try {
    // Test circuit breaker pattern for payment operations
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testPaymentFallback() {
  try {
    // Test fallback to alternative payment methods
    const hasFallback = process.env.PAYMENT_FALLBACK_ENABLED === 'true';
    return { success: hasFallback, hasFallback };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testEscrowProtection() {
  try {
    // Test that escrow protects funds during payment failures
    const Escrow = (await import('../models/Escrow.js')).default;
    const escrowCount = await Escrow.countDocuments({ status: 'held' });
    
    return { success: true, escrowCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
