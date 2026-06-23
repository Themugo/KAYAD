---
title: IDEMPOTENCY_MIGRATION_PLAN
owner: @product-lead
team: product
last-reviewed: 2026-06-23
review-frequency: as-needed
status: active
tags: [features]
---
# Idempotency Implementation Migration Plan

**Version:** 1.0  
**Date:** June 16, 2026  
**Scope:** Fintech Idempotency Implementation for KAYAD Platform

---

## Table of Contents

1. [Overview](#overview)
2. [Database Migration](#database-migration)
3. [API Changes](#api-changes)
4. [Rollback Plan](#rollback-plan)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Steps](#deployment-steps)

---

## Overview

This migration plan outlines the steps required to implement idempotency across all critical write operations in the KAYAD platform. The implementation ensures that duplicate operations are prevented, protecting against:
- Duplicate payments
- Duplicate callbacks
- Duplicate escrow releases
- Duplicate notifications
- Duplicate verification submissions

### Key Components

1. **IdempotencyKey Model:** Database model for tracking idempotency keys
2. **Idempotency Middleware:** Middleware for checking and caching idempotency keys
3. **Route Updates:** Application of middleware to critical endpoints

---

## Database Migration

### New Collection: IdempotencyKey

**Collection Name:** `idempotencykeys`

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

**Indexes:**
- `key` (unique)
- `operationType`
- `user` + `operationType` + `createdAt` (compound)
- `expiresAt` (TTL index)

### Migration Script

**File:** `backend/migrations/add_idempotency_keys.js`

```javascript
import mongoose from "mongoose";
import IdempotencyKey from "../models/IdempotencyKey.js";

export const up = async () => {
  console.log("Creating IdempotencyKey collection...");
  
  // Create the collection with TTL index
  await mongoose.connection.createCollection("idempotencykeys");
  
  // Create indexes
  await IdempotencyKey.createIndexes();
  
  console.log("IdempotencyKey collection created successfully");
};

export const down = async () => {
  console.log("Dropping IdempotencyKey collection...");
  
  await mongoose.connection.dropCollection("idempotencykeys");
  
  console.log("IdempotencyKey collection dropped successfully");
};
```

### Execution Steps

**Step 1: Backup Database**
```bash
# MongoDB backup
mongodump --host localhost --port 27017 --db kayad --out /backup/$(date +%Y%m%d_%H%M%S)
```

**Step 2: Run Migration**
```bash
cd backend
node migrations/add_idempotency_keys.js
```

**Step 3: Verify Migration**
```bash
# Check collection exists
mongo kayad --eval "db.getCollectionNames()"

# Verify indexes
mongo kayad --eval "db.idempotencykeys.getIndexes()"
```

---

## API Changes

### Modified Routes

**Payment Routes (`backend/routes/paymentRoutes.js`)**
- `POST /api/payments/initiate` - Added idempotencyCheck middleware
- `POST /api/payments/callback` - Added idempotencyCheck middleware

**Escrow Routes (`backend/routes/escrowRoutes.js`)**
- `POST /api/escrow/:id/release` - Added idempotencyCheck middleware
- `POST /api/escrow/:id/refund` - Added idempotencyCheck middleware
- `POST /api/escrow/:id/confirm-delivery` - Added idempotencyCheck middleware
- `POST /api/escrow/:id/request-release` - Added idempotencyCheck middleware

**Bid Routes (`backend/routes/bidRoutes.js`)**
- `POST /api/bids/:id/bid` - Added idempotencyCheck middleware
- `POST /api/bids/mpesa/callback` - Added idempotencyCheck middleware
- `POST /api/bids/:id/end` - Added idempotencyCheck middleware

**Notification Routes (`backend/routes/notificationRoutes.js`)**
- `POST /api/notifications/read-all` - Added idempotencyCheck middleware
- `POST /api/notifications/:id/read` - Added idempotencyCheck middleware
- `DELETE /api/notifications/:id` - Added idempotencyCheck middleware

**Verification Routes (`backend/routes/verificationRoutes.js`)**
- `POST /api/verification/submit` - Added idempotencyCheck middleware
- `POST /api/verification/phone/request` - Added idempotencyCheck middleware
- `POST /api/verification/phone/verify` - Added idempotencyCheck middleware
- `POST /api/verification/admin/:id/approve` - Added idempotencyCheck middleware
- `POST /api/verification/admin/:id/reject` - Added idempotencyCheck middleware
- `POST /api/verification/admin/:id/suspend` - Added idempotencyCheck middleware
- `POST /api/verification/admin/:id/reinstate` - Added idempotencyCheck middleware

### Client-Side Changes

**Required Header:**
Clients must include the `X-Idempotency-Key` header for idempotent operations.

**Example:**
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
```

**Response Behavior:**
- **First Request:** Executes operation and caches response
- **Duplicate Request:** Returns cached response without re-executing
- **Expired Key:** Executes new operation and caches new response

---

## Rollback Plan

### Rollback Steps

**Step 1: Remove Middleware from Routes**
```bash
# Revert route changes by removing idempotencyCheck middleware
git revert <commit-hash>
```

**Step 2: Drop IdempotencyKey Collection**
```bash
mongo kayad --eval "db.idempotencykeys.drop()"
```

**Step 3: Restart Application**
```bash
# Restart backend service
pm2 restart backend
```

### Rollback Verification

**Step 1: Verify Collection Dropped**
```bash
mongo kayad --eval "db.getCollectionNames()"
```

**Step 2: Verify API Functionality**
```bash
# Test payment initiation without idempotency key
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+254700000000","amount":1000,"carId":"car123","type":"escrow"}'
```

---

## Testing Strategy

### Unit Tests

**File:** `backend/tests/idempotency.test.js`

**Test Cases:**
1. IdempotencyKey model creation
2. IdempotencyKey model retrieval
3. IdempotencyKey model expiration
4. IdempotencyKey model cleanup

### Integration Tests

**Test Cases:**
1. Payment initiation with idempotency key
2. Payment callback with duplicate idempotency key
3. Escrow release with idempotency key
4. Escrow refund with duplicate idempotency key
5. Bid placement with idempotency key
6. Bid callback with duplicate idempotency key
7. Verification submission with idempotency key
8. Verification approval with duplicate idempotency key

### End-to-End Tests

**Test Scenarios:**
1. Complete payment flow with idempotency
2. Complete escrow flow with idempotency
3. Complete auction flow with idempotency
4. Complete verification flow with idempotency

### Performance Tests

**Metrics to Monitor:**
- Response time with idempotency check
- Database query performance
- Memory usage
- Cache hit rate

---

## Deployment Steps

### Pre-Deployment Checklist

- [ ] Database backup completed
- [ ] Migration script tested in staging
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] End-to-end tests passing
- [ ] Performance tests completed
- [ ] Rollback plan documented
- [ ] Team notified of deployment

### Deployment Steps

**Step 1: Deploy to Staging**
```bash
# Deploy to staging environment
git checkout staging
git pull origin staging
git merge main
# Deploy to staging server
```

**Step 2: Run Migration in Staging**
```bash
cd backend
node migrations/add_idempotency_keys.js
```

**Step 3: Test in Staging**
```bash
# Run test suite
npm test

# Manual testing
# Test payment initiation with idempotency key
# Test escrow release with idempotency key
# Test bid placement with idempotency key
```

**Step 4: Deploy to Production**
```bash
# Deploy to production environment
git checkout main
git pull origin main
# Deploy to production server
```

**Step 5: Run Migration in Production**
```bash
cd backend
node migrations/add_idempotency_keys.js
```

**Step 6: Verify Production Deployment**
```bash
# Check application health
curl http://api.kayad.space/health

# Check collection exists
mongo kayad --eval "db.getCollectionNames()"

# Monitor logs
pm2 logs backend
```

### Post-Deployment Monitoring

**Metrics to Monitor:**
- Error rates
- Response times
- Idempotency key cache hit rate
- Database performance
- Application logs for idempotency-related errors

**Alerts to Configure:**
- High idempotency key miss rate
- High database query time
- High error rate on idempotent endpoints

---

## Summary

This migration plan provides a comprehensive approach to implementing idempotency across all critical write operations in the KAYAD platform. The implementation ensures data integrity and prevents duplicate operations while maintaining backward compatibility with existing APIs.

**Key Benefits:**
- Prevents duplicate payments
- Prevents duplicate callbacks
- Prevents duplicate escrow releases
- Prevents duplicate notifications
- Maintains audit trail
- Provides rollback capability

**Estimated Downtime:** 0 minutes (zero-downtime deployment)

**Estimated Deployment Time:** 30 minutes

---

**Document Version:** 1.0  
**Last Updated:** June 16, 2026  
**Maintained By:** Platform Team
