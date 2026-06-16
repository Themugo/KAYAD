# Idempotency Implementation Documentation

**Version:** 1.0  
**Date:** June 16, 2026  
**Platform:** KAYAD Fintech Platform

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Usage Guide](#usage-guide)
4. [API Reference](#api-reference)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Monitoring and Metrics](#monitoring-and-metrics)

---

## Overview

### What is Idempotency?

Idempotency is a property of operations that ensures the same operation can be applied multiple times without changing the result beyond the initial application. In the context of the KAYAD platform, this means:

- **Duplicate Payment Prevention:** The same payment cannot be processed twice
- **Duplicate Callback Prevention:** M-Pesa callbacks cannot be processed multiple times
- **Duplicate Escrow Release Prevention:** Escrow funds cannot be released twice
- **Duplicate Notification Prevention:** Critical notifications are not sent multiple times

### Why Idempotency Matters

In fintech applications, idempotency is critical for:

1. **Financial Integrity:** Prevents duplicate charges and payouts
2. **Data Consistency:** Ensures system state remains consistent
3. **Network Reliability:** Handles network retries gracefully
4. **User Experience:** Provides consistent responses to clients
5. **Audit Trail:** Maintains a clear record of all operations

### Implementation Scope

The idempotency implementation covers:

- **Payment Operations:** Initiation and callbacks
- **Escrow Operations:** Release, refund, delivery confirmation
- **Auction Operations:** Bid placement, bid callbacks, auction ending
- **Notification Operations:** Mark as read, delete notifications
- **Dealer Onboarding:** Verification submission, approval, rejection, suspension, reinstatement

---

## Architecture

### Components

#### 1. IdempotencyKey Model

**Location:** `backend/models/IdempotencyKey.js`

The `IdempotencyKey` model stores idempotency keys and their associated responses in MongoDB.

**Schema:**
```javascript
{
  key: String (unique, indexed),
  operationType: String (indexed),
  user: ObjectId (indexed),
  requestParams: Object,
  responseData: Object,
  responseStatus: Number,
  success: Boolean,
  errorMessage: String,
  resourceIds: Object,
  expiresAt: Date (indexed, TTL: 24 hours),
  createdAt: Date,
  updatedAt: Date
}
```

**Key Features:**
- Automatic expiration after 24 hours
- Unique constraint on key field
- Indexes for efficient lookup
- Support for multiple operation types

#### 2. Idempotency Middleware

**Location:** `backend/middleware/idempotency.js`

The middleware intercepts requests and checks for existing idempotency keys.

**Functions:**
- `idempotencyCheck`: Main middleware for checking idempotency
- `generateIdempotencyKey`: Helper for generating unique keys
- `withIdempotency`: Helper for applying idempotency to specific operations

**Flow:**
1. Extract idempotency key from request header
2. Check database for existing key
3. If found, return cached response
4. If not found, proceed with request
5. Cache response before returning

#### 3. Route Integration

Idempotency middleware is applied to critical routes:

**Payment Routes:**
- `POST /api/payments/initiate`
- `POST /api/payments/callback`

**Escrow Routes:**
- `POST /api/escrow/:id/release`
- `POST /api/escrow/:id/refund`
- `POST /api/escrow/:id/confirm-delivery`
- `POST /api/escrow/:id/request-release`

**Bid Routes:**
- `POST /api/bids/:id/bid`
- `POST /api/bids/mpesa/callback`
- `POST /api/bids/:id/end`

**Notification Routes:**
- `POST /api/notifications/read-all`
- `POST /api/notifications/:id/read`
- `DELETE /api/notifications/:id`

**Verification Routes:**
- `POST /api/verification/submit`
- `POST /api/verification/phone/request`
- `POST /api/verification/phone/verify`
- `POST /api/verification/admin/:id/approve`
- `POST /api/verification/admin/:id/reject`
- `POST /api/verification/admin/:id/suspend`
- `POST /api/verification/admin/:id/reinstate`

---

## Usage Guide

### Client-Side Implementation

#### Required Header

Clients must include the `X-Idempotency-Key` header for idempotent operations.

#### Generating Idempotency Keys

**Option 1: Client-Side Generation**
```javascript
const generateIdempotencyKey = (prefix = "idemp") => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
};

const idempotencyKey = generateIdempotencyKey("payment");
```

**Option 2: Server-Side Generation**
If no key is provided, the middleware will allow the request but log a warning. For critical operations, always generate keys client-side.

#### Example: Payment Initiation

```javascript
const idempotencyKey = `payment_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

const response = await fetch('/api/payments/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Idempotency-Key': idempotencyKey
  },
  body: JSON.stringify({
    phone: '+254700000000',
    amount: 1000,
    carId: 'car123',
    type: 'escrow'
  })
});

// Handle response
const data = await response.json();
console.log(data);
```

#### Example: Handling Duplicate Requests

```javascript
const idempotencyKey = `payment_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

async function initiatePaymentWithRetry(paymentData, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(paymentData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data;
      }
      
      lastError = new Error(data.message || 'Payment failed');
    } catch (error) {
      lastError = error;
      
      // If network error, retry with same idempotency key
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError;
}
```

### Server-Side Implementation

#### Adding Idempotency to New Routes

**Step 1: Import Middleware**
```javascript
import { idempotencyCheck } from "../middleware/idempotency.js";
```

**Step 2: Apply to Route**
```javascript
router.post(
  "/new-operation",
  protect,
  idempotencyCheck,
  asyncHandler(newOperationController)
);
```

**Step 3: Update Operation Type Mapping**

Add the new operation type to the `extractOperationType` function in `backend/middleware/idempotency.js`:

```javascript
const extractOperationType = (path) => {
  // ... existing cases ...
  if (path.includes("/new-operation")) return "new_operation";
  return "notification";
};
```

**Step 4: Update Model Enum**

Add the new operation type to the enum in `backend/models/IdempotencyKey.js`:

```javascript
operationType: {
  type: String,
  required: true,
  enum: [
    // ... existing types ...
    "new_operation",
  ],
  index: true,
}
```

---

## API Reference

### IdempotencyKey Model

#### Static Methods

**`exists(key)`**
Check if an idempotency key exists.

```javascript
const exists = await IdempotencyKey.exists("payment_123");
// Returns: true or false
```

**`getCachedResponse(key)`**
Get cached response for an idempotency key.

```javascript
const cached = await IdempotencyKey.getCachedResponse("payment_123");
// Returns: { responseData, responseStatus, success, errorMessage, resourceIds } or null
```

**`record(data)`**
Create or update an idempotency key record.

```javascript
await IdempotencyKey.record({
  key: "payment_123",
  operationType: "payment",
  user: userId,
  requestParams: { amount: 1000 },
  responseData: { success: true },
  responseStatus: 200,
  success: true,
  resourceIds: { paymentId: "payment123" },
});
```

**`cleanExpired()`**
Remove expired idempotency keys.

```javascript
const deletedCount = await IdempotencyKey.cleanExpired();
// Returns: Number of deleted keys
```

### Middleware Functions

**`idempotencyCheck(req, res, next)`**
Main idempotency middleware.

**Behavior:**
- Extracts `X-Idempotency-Key` from request header
- If key exists, returns cached response
- If key doesn't exist, proceeds with request and caches response
- If no key provided, logs warning and proceeds

**`generateIdempotencyKey(prefix)`**
Generate a unique idempotency key.

```javascript
const key = generateIdempotencyKey("payment");
// Returns: "payment_1718544000000_abc123def456"
```

**`withIdempotency(operationType)`**
Helper for applying idempotency to specific operations.

```javascript
router.post(
  "/custom-operation",
  withIdempotency("custom_operation"),
  asyncHandler(customController)
);
```

---

## Best Practices

### Key Generation

**DO:**
- Generate keys client-side for critical operations
- Include operation context in key (e.g., user ID, resource ID)
- Use timestamp and random components for uniqueness
- Store keys for retry scenarios

**DON'T:**
- Use sequential or predictable keys
- Reuse keys across different operations
- Generate keys server-side for client-initiated operations
- Use hardcoded keys

### Key Management

**Storage:**
- Store keys temporarily for retry scenarios
- Use in-memory storage or session storage
- Clear keys after successful completion
- Don't persist keys indefinitely

**Expiration:**
- Keys automatically expire after 24 hours
- No manual cleanup required
- Expired keys are automatically removed by MongoDB TTL

### Error Handling

**Network Errors:**
- Retry with same idempotency key
- Implement exponential backoff
- Set reasonable retry limits
- Log retry attempts

**Server Errors:**
- Check if error is idempotency-related
- If key exists, use cached response
- If key doesn't exist, generate new key
- Log errors for debugging

### Performance

**Database:**
- Idempotency keys are indexed for fast lookup
- TTL index automatically removes expired keys
- Monitor database performance
- Consider caching for high-volume operations

**Response Caching:**
- Full response is cached
- Includes status code and body
- Cached for 24 hours
- Automatically expires

---

## Troubleshooting

### Common Issues

#### Issue: Duplicate Operations Still Occurring

**Possible Causes:**
1. Idempotency key not included in request
2. Different keys used for same operation
3. Key expired before retry
4. Middleware not applied to route

**Solutions:**
1. Ensure `X-Idempotency-Key` header is included
2. Use same key for retry attempts
3. Check key expiration time
4. Verify middleware is applied to route

#### Issue: Cached Response Not Returned

**Possible Causes:**
1. Key expired
2. Database connection issue
3. Key format mismatch
4. Middleware error

**Solutions:**
1. Generate new key if expired
2. Check database connectivity
3. Verify key format matches
4. Check server logs for errors

#### Issue: Performance Degradation

**Possible Causes:**
1. High volume of idempotency checks
2. Database query performance
3. Large response payloads
4. Index not created

**Solutions:**
1. Monitor database performance
2. Verify indexes are created
3. Optimize response payloads
4. Consider caching layer

### Debugging

**Enable Logging:**
```javascript
// In middleware
logInfo("Idempotency check", { key: idempotencyKey, operationType });
logWarn("No idempotency key provided", { path: req.path });
logError("Idempotency check error", error, { key });
```

**Check Database:**
```javascript
// Check if key exists
const key = await IdempotencyKey.findOne({ key: "payment_123" });
console.log(key);

// Check all keys for user
const keys = await IdempotencyKey.find({ user: userId });
console.log(keys);
```

**Monitor Metrics:**
- Idempotency key hit rate
- Response time with idempotency
- Database query time
- Error rate

---

## Monitoring and Metrics

### Key Metrics

**Idempotency Metrics:**
- Idempotency key hit rate
- Idempotency key miss rate
- Cache hit rate
- Average response time with idempotency

**Database Metrics:**
- IdempotencyKey collection size
- Query performance
- TTL index efficiency
- Expired key cleanup rate

**Application Metrics:**
- Error rate on idempotent endpoints
- Duplicate operation attempts
- Retry attempts with same key
- Failed idempotency checks

### Monitoring Setup

**Prometheus Metrics:**
```javascript
import { recordMetric } from "../config/metrics.js";

// In middleware
recordMetric("idempotency_check", 1, {
  operationType,
  hit: cachedResponse ? 1 : 0,
});
```

**Alerts:**
- High idempotency miss rate (> 50%)
- High error rate on idempotent endpoints (> 5%)
- Database query time > 100ms
- IdempotencyKey collection size > 1M

### Log Analysis

**Search Patterns:**
- "Idempotency hit" - Successful cache hits
- "No idempotency key provided" - Missing keys
- "Idempotency check error" - Middleware errors
- "Failed to cache idempotency response" - Caching errors

**Log Aggregation:**
- Use centralized logging (e.g., ELK, Splunk)
- Set up alerts for error patterns
- Monitor trends over time
- Correlate with application metrics

---

## Summary

The idempotency implementation provides a robust mechanism for preventing duplicate operations across all critical write operations in the KAYAD platform. By following this documentation, developers can:

- Integrate idempotency into new operations
- Troubleshoot common issues
- Monitor performance and metrics
- Ensure system reliability and data integrity

**Key Benefits:**
- Prevents duplicate payments and callbacks
- Ensures data consistency
- Handles network retries gracefully
- Provides audit trail
- Maintains API compatibility

**Contact:**
For questions or issues, contact the Platform Team.

---

**Document Version:** 1.0  
**Last Updated:** June 16, 2026  
**Maintained By:** Platform Team
