---
title: RESILIENCE
owner: @tech-lead
team: all
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [general]
---
# Production Resilience Guide

## Overview

This guide provides comprehensive documentation for the resilience patterns implemented in the KAYAD backend application, including usage instructions, configuration, and best practices.

## Table of Contents

1. [Resilience Patterns Overview](#resilience-patterns-overview)
2. [Circuit Breakers](#circuit-breakers)
3. [Retry Policies](#retry-policies)
4. [Dead Letter Queues](#dead-letter-queues)
5. [Request Timeouts](#request-timeouts)
6. [Bulkhead Isolation](#bulkhead-isolation)
7. [Fallback Mechanisms](#fallback-mechanisms)
8. [Graceful Shutdown](#graceful-shutdown)
9. [Idempotency Keys](#idempotency-keys)
10. [Rate Limiting](#rate-limiting)
11. [Monitoring and Observability](#monitoring-and-observability)
12. [Testing Resilience](#testing-resilience)
13. [Troubleshooting](#troubleshooting)

---

## Resilience Patterns Overview

The KAYAD backend implements the following resilience patterns:

| Pattern | Implementation | Status |
|---------|---------------|--------|
| Circuit Breakers | `infrastructure/circuitBreaker.js` | ✅ Implemented |
| Retry Policies | `utils/retry.js` | ✅ Implemented |
| Dead Letter Queues | `infrastructure/queues/deadLetterQueue.js` | ✅ Implemented |
| Request Timeouts | `middleware/timeout.js` | ✅ Implemented |
| Bulkhead Isolation | `middleware/bulkhead.js` | ✅ Implemented |
| Fallback Mechanisms | `services/serviceFallback.js` | ✅ Implemented |
| Graceful Shutdown | `server.js` | ✅ Implemented |
| Idempotency Keys | `middleware/idempotency.js` | ✅ Implemented |
| Rate Limiting | `middleware/rateLimiter.js` | ✅ Implemented |

---

## Circuit Breakers

### Overview

Circuit breakers prevent cascading failures by stopping calls to failing services. When a service fails repeatedly, the circuit breaker "opens" and blocks calls for a configured timeout period.

### Implementation

**File**: `infrastructure/circuitBreaker.js`

### Usage

```javascript
import { withEmailCircuitBreaker, withSMSCircuitBreaker } from "../infrastructure/circuitBreaker.js";

// Use pre-configured circuit breaker
const result = await withEmailCircuitBreaker(async () => {
  return await emailService.send(email);
});

// Create custom circuit breaker
import { getCircuitBreaker } from "../infrastructure/circuitBreaker.js";

const customBreaker = getCircuitBreaker("my-service", {
  failureThreshold: 10,
  successThreshold: 3,
  timeout: 120000,
  resetTimeout: 600000,
});

const result = await customBreaker.execute(async () => {
  return await myService.call();
});
```

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `failureThreshold` | 5 | Number of failures before opening circuit |
| `successThreshold` | 2 | Number of successes before closing circuit |
| `timeout` | 60000 | Time (ms) before attempting half-open |
| `resetTimeout` | 300000 | Time (ms) before resetting failure count |

### Pre-configured Circuit Breakers

- **Email Service**: 5 failures, 60s timeout
- **SMS Service**: 3 failures, 30s timeout
- **Fraud Detection**: 2 failures, 10s timeout
- **Cloudinary**: 5 failures, 60s timeout

### Monitoring

```javascript
import { getAllCircuitBreakerStates } from "../infrastructure/circuitBreaker.js";

const states = getAllCircuitBreakerStates();
console.log(states);
```

### Best Practices

- Use circuit breakers for all external service calls
- Configure thresholds based on service criticality
- Monitor circuit breaker states via health endpoint
- Set up alerts for circuit breaker openings
- Test circuit breaker behavior in staging

---

## Retry Policies

### Overview

Retry policies automatically retry failed operations with exponential backoff and jitter to prevent thundering herd problems.

### Implementation

**File**: `utils/retry.js`

### Usage

```javascript
import { withRetry } from "../utils/retry.js";

// Use service-specific defaults
const result = await withRetry(
  async () => {
    return await mpesaService.initiatePayment(payment);
  },
  { serviceName: "mpesa" }
);

// Custom configuration
const result = await withRetry(
  async () => {
    return await externalService.call();
  },
  {
    retries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    timeoutMs: 30000,
    circuitBreaker: true,
    circuitThreshold: 3,
    circuitResetMs: 60000,
    fallback: async () => {
      return await alternativeService.call();
    },
  }
);
```

### Service-Specific Defaults

| Service | Retries | Base Delay | Max Delay | Timeout | Circuit Threshold |
|---------|---------|------------|-----------|---------|-------------------|
| M-Pesa | 2 | 1000ms | 30000ms | 30000ms | 3 |
| Email | 2 | 1000ms | 10000ms | 30000ms | 3 |
| SMS | 2 | 1000ms | 10000ms | 15000ms | 5 |
| Redis | 3 | 100ms | 5000ms | 5000ms | 5 |
| Sentry | 1 | 1000ms | 5000ms | 10000ms | 3 |
| Socket | 2 | 500ms | 5000ms | 5000ms | 5 |

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `retries` | 3 | Number of retry attempts |
| `baseDelayMs` | 500 | Base delay for exponential backoff |
| `maxDelayMs` | 10000 | Maximum delay between retries |
| `timeoutMs` | 30000 | Timeout per attempt |
| `circuitBreaker` | false | Enable circuit breaker |
| `circuitThreshold` | 5 | Failures before opening circuit |
| `circuitResetMs` | 30000 | Time before circuit reset |

### Monitoring

```javascript
import { getAllCircuitStates } from "../utils/retry.js";

const states = getAllCircuitStates();
console.log(states);
```

### Best Practices

- Use service-specific defaults when available
- Configure retries based on operation idempotency
- Enable circuit breakers for critical services
- Monitor retry metrics
- Set up alerts for high retry rates

---

## Dead Letter Queues

### Overview

Dead letter queues (DLQ) handle failed jobs that have exceeded max retry attempts, providing job recovery and analysis capabilities.

### Implementation

**File**: `infrastructure/queues/deadLetterQueue.js`

### Usage

```javascript
import { sendToDeadLetterQueue, retryFailedJob, deleteFailedJob } from "../infrastructure/queues/deadLetterQueue.js";

// Send job to DLQ (automatically called by queue processor)
await sendToDeadLetterQueue(job, error);

// Retry failed job
await retryFailedJob(dlqJobId);

// Delete failed job
await deleteFailedJob(dlqJobId, "admin", "Resolved manually");

// Get DLQ statistics
import { getDLQStatistics } from "../infrastructure/queues/deadLetterQueue.js";

const stats = await getDLQStatistics();
console.log(stats);

// Get DLQ jobs
import { getDLQJobs } from "../infrastructure/queues/deadLetterQueue.js";

const { jobs, total } = await getDLQJobs({ limit: 50, skip: 0, state: "waiting" });
```

### Error Classification

The DLQ automatically classifies errors into:
- **timeout**: Operation timeout
- **network**: Network connectivity issues
- **validation**: Input validation failures
- **service**: Service unavailability
- **unknown**: Unclassified errors

### Monitoring

Monitor DLQ size and set up alerts when:
- DLQ size > 50 jobs (warning)
- DLQ size > 100 jobs (critical)

### Best Practices

- Review DLQ regularly
- Implement automatic retry scheduling
- Set up DLQ size alerts
- Analyze error patterns
- Clean up resolved jobs

---

## Request Timeouts

### Overview

Request timeouts prevent operations from running indefinitely by enforcing time limits on different operation types.

### Implementation

**File**: `middleware/timeout.js`

### Usage

```javascript
import { fastTimeout, mediumTimeout, slowTimeout, externalTimeout, uploadTimeout } from "../middleware/timeout.js";

// Apply to routes
router.get("/api/cars", fastTimeout, carController.list);
router.post("/api/payments", mediumTimeout, paymentController.create);
router.post("/api/escrow/release", slowTimeout, escrowController.release);
router.post("/api/mpesa/callback", externalTimeout, mpesaController.callback);
router.post("/api/uploads", uploadTimeout, uploadController.upload);

// Custom timeout
import { createTimeoutMiddleware } from "../middleware/timeout.js";

const customTimeout = createTimeoutMiddleware(45000);
router.get("/api/complex", customTimeout, complexController.process);
```

### Pre-configured Timeouts

| Timeout | Duration | Use Case |
|---------|----------|----------|
| `fastTimeout` | 5s | Simple queries |
| `mediumTimeout` | 10s | Standard operations |
| `slowTimeout` | 30s | Complex operations |
| `externalTimeout` | 15s | External API calls |
| `uploadTimeout` | 120s | File uploads |

### Best Practices

- Use appropriate timeout for operation type
- Monitor timeout occurrences
- Set up alerts for high timeout rates
- Implement timeout recovery strategies
- Test timeout behavior in staging

---

## Bulkhead Isolation

### Overview

Bulkhead isolation limits concurrent operations to prevent resource exhaustion by using semaphore-based concurrency control.

### Implementation

**File**: `middleware/bulkhead.js`

### Usage

```javascript
import { dbBulkhead, externalApiBulkhead, uploadBulkhead, paymentBulkhead } from "../middleware/bulkhead.js";

// Apply to routes
router.get("/api/cars", dbBulkhead, carController.list);
router.post("/api/external", externalApiBulkhead, externalController.call);
router.post("/api/uploads", uploadBulkhead, uploadController.upload);
router.post("/api/payments", paymentBulkhead, paymentController.create);

// Create custom bulkhead
import { createBulkheadMiddleware } from "../middleware/bulkhead.js";

const customBulkhead = createBulkheadMiddleware("custom", 50, 30000);
router.get("/api/custom", customBulkhead, customController.process);
```

### Pre-configured Bulkheads

| Bulkhead | Max Concurrent | Timeout | Use Case |
|----------|---------------|---------|----------|
| `dbBulkhead` | 100 | 30s | Database operations |
| `externalApiBulkhead` | 50 | 30s | External API calls |
| `uploadBulkhead` | 10 | 30s | File uploads |
| `paymentBulkhead` | 20 | 30s | Payment processing |
| `emailBulkhead` | 30 | 30s | Email sending |
| `smsBulkhead` | 20 | 30s | SMS sending |
| `websocketBulkhead` | 1000 | 30s | WebSocket connections |

### Monitoring

```javascript
import { getAllBulkheadStates } from "../middleware/bulkhead.js";

const states = getAllBulkheadStates();
console.log(states);
```

### Best Practices

- Apply bulkheads to resource-intensive operations
- Monitor concurrent operation counts
- Set up alerts for queue length
- Adjust concurrency limits based on load
- Test bulkhead behavior under load

---

## Fallback Mechanisms

### Overview

Fallback mechanisms provide alternative behavior when primary services fail, ensuring system availability.

### Implementation

**File**: `services/serviceFallback.js`

### Usage

```javascript
import { withResilience, FALLBACK_CONFIG } from "../services/serviceFallback.js";

// Use with resilience wrapper
const result = await withResilience(
  async () => {
    return await emailService.send(email);
  },
  "email",
  FALLBACK_CONFIG.email
);

// Custom fallback configuration
const result = await withResilience(
  async () => {
    return await customService.call();
  },
  "custom",
  {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    fallbackTo: "queue",
  }
);
```

### Fallback Strategies

| Strategy | Description |
|----------|-------------|
| `queue` | Queue operation for retry |
| `ignore` | Silently fail |
| `manual` | Require manual intervention |
| `local` | Use local storage |

### Pre-configured Fallbacks

| Service | Max Retries | Retry Delay | Fallback |
|---------|-------------|-------------|----------|
| Email | 3 | 1000ms | Queue |
| SMS | 3 | 1000ms | Queue |
| Payment | 2 | 2000ms | Manual |
| Cloudinary | 3 | 1000ms | Local |
| Analytics | 1 | 500ms | Ignore |

### Best Practices

- Choose appropriate fallback strategy
- Implement fallback logic for each strategy
- Monitor fallback usage
- Set up alerts for manual intervention
- Test fallback behavior

---

## Graceful Shutdown

### Overview

Graceful shutdown ensures the application terminates cleanly by completing in-flight operations and releasing resources.

### Implementation

**File**: `server.js`

### Shutdown Process

1. Receive termination signal (SIGTERM, SIGINT)
2. Stop accepting new requests
3. Complete in-flight requests
4. Close HTTP server
5. Close WebSocket connections
6. Stop queue workers
7. Close database connection
8. Exit process

### Configuration

```javascript
// Shutdown timeout (30 seconds)
const SHUTDOWN_TIMEOUT = 30_000;

// Graceful period can be adjusted in server.js
```

### Monitoring

Shutdown events are logged and sent to Sentry if configured.

### Best Practices

- Test shutdown behavior regularly
- Ensure all resources are released
- Monitor shutdown duration
- Set up alerts for forced shutdowns
- Implement connection draining

---

## Idempotency Keys

### Overview

Idempotency keys prevent duplicate operations by caching responses and returning cached results for repeated requests with the same key.

### Implementation

**File**: `middleware/idempotency.js`

### Usage

```javascript
import { idempotencyCheck, generateIdempotencyKey, withIdempotency } from "../middleware/idempotency.js";

// Apply middleware to routes
router.post("/api/payments", idempotencyCheck, paymentController.create);

// Generate idempotency key for client
const key = generateIdempotencyKey("payment");

// Use with specific operation type
router.post("/api/escrow/release", withIdempotency("escrow_release"), escrowController.release);
```

### Client Usage

```javascript
// Client should include idempotency key header
const response = await fetch("/api/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Idempotency-Key": "idemp_payment_1234567890_abc123",
  },
  body: JSON.stringify(paymentData),
});
```

### Configuration

- **TTL**: 24 hours
- **Storage**: Database with in-memory fallback
- **Fail Strategy**: Fail-open (allow request if check fails)

### Operation Types

- `payment`
- `payment_callback`
- `escrow_release`
- `escrow_refund`
- `escrow_confirm_delivery`
- `bid`
- `auction_end`
- `verification_approve`
- `verification_reject`
- `verification_suspend`
- `verification_reinstate`
- `verification_submit`
- `notification`

### Best Practices

- Use idempotency keys for all write operations
- Generate unique keys per operation
- Include operation type in key generation
- Monitor idempotency hit/miss rates
- Clean up expired keys regularly

---

## Rate Limiting

### Overview

Rate limiting prevents abuse and ensures fair resource allocation by limiting request rates per user or IP.

### Implementation

**File**: `middleware/rateLimiter.js`

### Usage

```javascript
import {
  globalLimiter,
  authLimiter,
  bidLimiter,
  paymentLimiter,
  chatLimiter,
  reviewLimiter,
  otpLimiter,
  webhookLimiter,
  createLimiter,
  uploadLimiter,
  adminLimiter,
} from "../middleware/rateLimiter.js";

// Apply to routes
app.use(globalLimiter);
router.post("/api/auth/login", authLimiter, authController.login);
router.post("/api/bids", bidLimiter, bidController.create);
router.post("/api/payments", paymentLimiter, paymentController.create);
router.post("/api/chat", chatLimiter, chatController.send);
router.post("/api/reviews", reviewLimiter, reviewController.create);
router.post("/api/otp", otpLimiter, otpController.send);
router.post("/api/webhooks", webhookLimiter, webhookController.handle);
router.post("/api/uploads", uploadLimiter, uploadController.upload);
router.use("/api/admin", adminLimiter, adminRoutes);
```

### Pre-configured Rate Limits

| Limiter | Limit | Window | Key |
|---------|-------|--------|-----|
| `globalLimiter` | 500 | 15min | User ID or IP |
| `authLimiter` | 20 | 15min | IP only |
| `bidLimiter` | 10 | 1min | User ID or IP |
| `paymentLimiter` | 5 | 1min | User ID or IP |
| `chatLimiter` | 30 | 1min | User ID or IP |
| `reviewLimiter` | 5 | 1min | User ID or IP |
| `otpLimiter` | 3 | 1min | IP only |
| `webhookLimiter` | 10 | 1min | IP only |
| `createLimiter` | 10 | 1min | User ID or IP |
| `uploadLimiter` | 30 | 15min | User ID or IP |
| `adminLimiter` | 200 | 15min | User ID or IP |

### Configuration

Rate limits can be configured via environment variables:

```bash
RATE_LIMIT_MAX=500
AUTH_RATE_LIMIT_MAX=20
ADMIN_RATE_LIMIT_MAX=200
```

### Socket Rate Limiting

```javascript
import { socketRateLimit } from "../middleware/rateLimiter.js";

if (!socketRateLimit(userId)) {
  socket.emit("error", { message: "Rate limit exceeded" });
  socket.disconnect();
}
```

### Best Practices

- Use appropriate rate limits for each operation
- Monitor rate limit violations
- Set up alerts for abuse patterns
- Consider distributed rate limiting for multi-instance deployments
- Test rate limiting behavior

---

## Monitoring and Observability

### Health Endpoints

```bash
# General health check
GET /health

# Database health check
GET /health/db

# Redis health check
GET /health/redis

# Circuit breaker states
GET /health/circuit-breakers

# Bulkhead states
GET /health/bulkheads
```

### Metrics

Resilience metrics are tracked via the metrics system:

- `circuit_breaker_opened`: Circuit breaker opened
- `circuit_breaker_closed`: Circuit breaker closed
- `circuit_breaker_rejected`: Requests rejected by circuit breaker
- `external_service_retry`: Retry attempts
- `external_service_success`: Successful external service calls
- `external_service_failure`: Failed external service calls
- `external_service_timeout`: External service timeouts
- `fallback_attempted`: Fallback attempts
- `bulkhead_queued`: Requests queued by bulkhead
- `bulkhead_timeout`: Bulkhead timeouts
- `bulkhead_concurrent`: Concurrent operations
- `idempotency_check`: Idempotency checks
- `idempotency_hit`: Idempotency cache hits
- `idempotency_miss`: Idempotency cache misses

### Prometheus Metrics

Metrics are exposed at `/metrics` endpoint in Prometheus format.

### Alerting

Set up alerts for:

1. **Critical Alerts**
   - Circuit breaker open for >5 minutes
   - DLQ size >100 jobs
   - Memory usage >90%
   - Error rate >5%

2. **Warning Alerts**
   - Circuit breaker open for >1 minute
   - DLQ size >50 jobs
   - Memory usage >80%
   - Error rate >1%

---

## Testing Resilience

### Unit Tests

Test individual resilience patterns:

```javascript
// Test circuit breaker
import { getCircuitBreaker } from "../infrastructure/circuitBreaker.js";

const breaker = getCircuitBreaker("test-service", {
  failureThreshold: 2,
  timeout: 1000,
});

// Test retry
import { withRetry } from "../utils/retry.js";

await withRetry(
  async () => {
    throw new Error("Test error");
  },
  { retries: 2, serviceName: "test" }
);
```

### Integration Tests

Test resilience patterns in context:

```javascript
// Test payment workflow with resilience
describe("Payment Workflow Resilience", () => {
  it("should retry on M-Pesa failure", async () => {
    // Test implementation
  });

  it("should use fallback when circuit breaker open", async () => {
    // Test implementation
  });
});
```

### Chaos Testing

Simulate failures to test resilience:

```javascript
// Simulate database failure
await simulateDatabaseFailure();

// Simulate Redis failure
await simulateRedisFailure();

// Simulate external API failure
await simulateExternalAPIFailure();
```

---

## Troubleshooting

### Circuit Breaker Issues

**Problem**: Circuit breaker stuck open

**Solution**:
```javascript
import { resetAllCircuitBreakers } from "../infrastructure/circuitBreaker.js";

await resetAllCircuitBreakers();
```

### Dead Letter Queue Issues

**Problem**: DLQ growing too large

**Solution**:
```javascript
// Review and retry jobs
import { getDLQJobs, retryFailedJob } from "../infrastructure/queues/deadLetterQueue.js";

const { jobs } = await getDLQJobs({ limit: 100 });
for (const job of jobs) {
  await retryFailedJob(job.id);
}
```

### Bulkhead Issues

**Problem**: Requests queued too long

**Solution**:
```javascript
// Increase concurrency limit
import { resetBulkhead } from "../middleware/bulkhead.js";

resetBulkhead("database"); // Reset to clear queue
```

### Timeout Issues

**Problem**: Frequent timeouts

**Solution**:
- Increase timeout for slow operations
- Optimize slow operations
- Check for resource contention
- Review bulkhead settings

### Idempotency Issues

**Problem**: Idempotency check failing

**Solution**:
- Check database connectivity
- Verify idempotency key format
- Review idempotency middleware logs

---

## Additional Resources

- [Resilience Scorecard](./RESILIENCE_SCORECARD.md)
- [Failure Mode Analysis](./FAILURE_MODE_ANALYSIS.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Release Checklist](./RELEASE_CHECKLIST.md)

---

## Conclusion

The KAYAD backend implements comprehensive resilience patterns to ensure production reliability. Follow this guide to understand, configure, and monitor resilience features effectively.

For questions or issues, refer to the troubleshooting section or consult the additional resources.
