---
title: QUEUE_ARCHITECTURE_PLAN
owner: @tech-lead
team: architecture
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [architecture]
---
# Queue Architecture Plan - KAYAD Platform

**Phase:** Phase 8 - Distributed Systems Architecture  
**Engineer:** Distributed Systems Architect  
**Date:** June 14, 2026  
**Scope:** Move heavy tasks to queues using BullMQ and Redis

---

## 📋 AUDIT FINDINGS

### Current Background Jobs

**Cron Jobs (Synchronous):**
- `escrowCron.js` - Runs hourly, auto-releases escrows, sends notifications
- `auctionReminderCron.js` - Runs every 5 minutes, sends auction reminders via email/notifications
- `reconciliationCron.js` - Runs every 15 minutes, payment reconciliation
- `savedSearchCron.js` - Sends saved search notifications
- `priceAlertCron.js` - Sends price drop alerts

**Synchronous Services:**
- `email.service.js` - Email sending (nodemailer, SendGrid)
- `sms.service.js` - SMS sending (Twilio)
- `notificationService.js` - In-app notifications with multi-channel support
- `fraudDetectionService.js` - Fraud checks
- `fraud.service.js` - Fraud management
- Cloudinary image uploads - Image processing

### Current Issues

**Performance:**
- Synchronous email/SMS sending blocks request/response
- Cron jobs run in-process, no horizontal scaling
- No retry mechanism for failed tasks
- No dead letter queue for failed jobs
- No job prioritization
- No rate limiting per queue
- No job monitoring/alerting
- Image processing blocks uploads

**Reliability:**
- Single point of failure (in-process jobs)
- No job persistence on failure
- No backpressure handling
- No circuit breakers
- No job deduplication

**Observability:**
- No job metrics
- No job tracking
- No failure analysis
- No performance monitoring

---

## 🎯 REQUIREMENTS

### Queue Requirements

**Move to Queues:**
- Notifications (in-app, email, SMS, WhatsApp)
- Emails (transactional, marketing)
- SMS (transactional, bidding)
- Fraud checks (real-time, batch)
- Image processing (uploads, optimization)
- SEO generation (sitemap, metadata)

**Non-Functional Requirements:**
- Do not break synchronous workflows
- Preserve current functionality
- Maintain API compatibility
- Zero downtime migration
- Graceful degradation

### Queue Features

**BullMQ Features:**
- Redis-backed job queues
- Job prioritization
- Retry strategy with exponential backoff
- Dead letter queue
- Job scheduling (delayed jobs)
- Job deduplication
- Rate limiting
- Backpressure handling
- Job metrics
- Worker scaling

---

## 📐 ARCHITECTURE DESIGN

### Queue Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│  (Express API, Socket.io, Cron Jobs)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Queue Producers                             │
│  - Add jobs to queues                                       │
│  - Set job options (priority, delay, attempts)              │
│  - Handle job responses                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Redis (BullMQ)                            │
│  - Job queues                                               │
│  - Job state                                                │
│  - Dead letter queues                                       │
│  - Rate limiting                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Queue Consumers                            │
│  - Process jobs from queues                                 │
│  - Implement retry logic                                    │
│  - Handle failures                                         │
│  - Send to DLQ on max retries                              │
└─────────────────────────────────────────────────────────────┘
```

### Queue Definitions

**1. Notification Queue**
- **Priority:** High
- **Concurrency:** 10
- **Retry:** 3 attempts, exponential backoff
- **Jobs:** In-app notifications, push notifications

**2. Email Queue**
- **Priority:** Medium
- **Concurrency:** 5
- **Retry:** 5 attempts, exponential backoff
- **Jobs:** Transactional emails, marketing emails

**3. SMS Queue**
- **Priority:** High
- **Concurrency:** 3
- **Retry:** 3 attempts, exponential backoff
- **Jobs:** Transactional SMS, bidding SMS

**4. Fraud Check Queue**
- **Priority:** Critical
- **Concurrency:** 20
- **Retry:** 2 attempts, immediate
- **Jobs:** Real-time fraud checks, batch fraud analysis

**5. Image Processing Queue**
- **Priority:** Medium
- **Concurrency:** 5
- **Retry:** 3 attempts, exponential backoff
- **Jobs:** Image uploads, optimization, thumbnails

**6. SEO Generation Queue**
- **Priority:** Low
- **Concurrency:** 2
- **Retry:** 3 attempts, exponential backoff
- **Jobs:** Sitemap generation, metadata updates

---

## 📁 FILE-BY-FILE IMPLEMENTATION PLAN

### Phase 1: Infrastructure Setup

**File:** `backend/config/redis.js`
- Create Redis connection configuration
- Handle Redis connection errors
- Implement reconnection logic

**File:** `backend/config/queue.js`
- Create BullMQ queue configuration
- Define queue options (connection, default job options)
- Create queue factory function

**File:** `backend/infrastructure/queues/index.js`
- Create queue registry
- Export all queues
- Initialize queues on startup

### Phase 2: Queue Producers

**File:** `backend/queues/notificationQueue.js`
- Create notification queue producer
- Define job data structure
- Implement job options (priority, delay)

**File:** `backend/queues/emailQueue.js`
- Create email queue producer
- Define job data structure
- Implement job options

**File:** `backend/queues/smsQueue.js`
- Create SMS queue producer
- Define job data structure
- Implement job options

**File:** `backend/queues/fraudQueue.js`
- Create fraud check queue producer
- Define job data structure
- Implement job options

**File:** `backend/queues/imageQueue.js`
- Create image processing queue producer
- Define job data structure
- Implement job options

**File:** `backend/queues/seoQueue.js`
- Create SEO generation queue producer
- Define job data structure
- Implement job options

### Phase 3: Queue Workers

**File:** `backend/workers/notificationWorker.js`
- Create notification worker
- Process notification jobs
- Handle failures and retries
- Send to DLQ on max retries

**File:** `backend/workers/emailWorker.js`
- Create email worker
- Process email jobs
- Handle failures and retries
- Send to DLQ on max retries

**File:** `backend/workers/smsWorker.js`
- Create SMS worker
- Process SMS jobs
- Handle failures and retries
- Send to DLQ on max retries

**File:** `backend/workers/fraudWorker.js`
- Create fraud check worker
- Process fraud check jobs
- Handle failures and retries
- Send to DLQ on max retries

**File:** `backend/workers/imageWorker.js`
- Create image processing worker
- Process image jobs
- Handle failures and retries
- Send to DLQ on max retries

**File:** `backend/workers/seoWorker.js`
- Create SEO generation worker
- Process SEO jobs
- Handle failures and retries
- Send to DLQ on max retries

### Phase 4: Worker Manager

**File:** `backend/infrastructure/queues/workerManager.js`
- Create worker manager
- Start/stop all workers
- Handle worker errors
- Implement graceful shutdown

**File:** `backend/scripts/startWorkers.js`
- Create worker startup script
- Initialize all workers
- Handle process signals

### Phase 5: Migration

**File:** `backend/services/notificationService.js`
- Migrate to use notification queue
- Keep synchronous fallback
- Add queue option

**File:** `backend/services/email.service.js`
- Migrate to use email queue
- Keep synchronous fallback
- Add queue option

**File:** `backend/services/sms.service.js`
- Migrate to use SMS queue
- Keep synchronous fallback
- Add queue option

**File:** `backend/services/fraudDetectionService.js`
- Migrate to use fraud queue
- Keep synchronous fallback
- Add queue option

**File:** `backend/middleware/upload.js`
- Migrate image uploads to image queue
- Keep synchronous fallback
- Add queue option

**File:** `backend/controllers/seoController.js`
- Migrate sitemap generation to SEO queue
- Keep synchronous fallback
- Add queue option

**File:** `backend/services/escrowCron.js`
- Migrate to use notification queue
- Keep synchronous fallback
- Add queue option

**File:** `backend/services/auctionReminderCron.js`
- Migrate to use email/notification queues
- Keep synchronous fallback
- Add queue option

### Phase 6: Monitoring

**File:** `backend/infrastructure/queues/queueMonitor.js`
- Create queue monitoring service
- Track job metrics
- Alert on failures
- Export metrics

**File:** `backend/controllers/queueController.js`
- Create queue monitoring API
- Queue statistics
- Job history
- DLQ management

**File:** `backend/routes/queueRoutes.js`
- Create queue monitoring routes
- Admin-only access
- Queue management endpoints

---

## 🔄 MIGRATION STRATEGY

### Step 1: Infrastructure Setup
- Install BullMQ and Redis dependencies
- Create Redis configuration
- Create queue configuration
- Test Redis connection

### Step 2: Queue Infrastructure
- Create queue producers
- Create queue workers
- Create worker manager
- Test queue functionality

### Step 3: Gradual Migration
- Migrate low-risk services first (SEO)
- Migrate medium-risk services (Email, SMS)
- Migrate high-risk services (Notifications, Fraud)
- Keep synchronous fallbacks

### Step 4: Testing
- Test queue functionality
- Test retry logic
- Test DLQ handling
- Test worker scaling
- Test graceful shutdown

### Step 5: Deployment
- Deploy to staging
- Monitor queue metrics
- Test under load
- Deploy to production

---

## 🔒 BACKWARD COMPATIBILITY

### API Compatibility
- All existing APIs remain synchronous by default
- Queue mode opt-in via environment variable
- No breaking changes to function signatures
- Fallback to synchronous on queue failure

### Service Compatibility
- Existing service functions preserved
- New queue functions added
- Gradual migration strategy
- Feature flags for queue enablement

### Cron Compatibility
- Existing cron jobs preserved
- Migrate to queue-based jobs
- Keep cron as fallback
- Zero downtime migration

---

## 📊 SUCCESS METRICS

1. **Queue Throughput:** 1000+ jobs/second per queue
2. **Latency:** <100ms for high-priority queues
3. **Retry Rate:** <5% for most queues
4. **DLQ Rate:** <1% for most queues
5. **Worker Scaling:** Horizontal scaling supported
6. **Backpressure:** Graceful handling under load
7. **Monitoring:** Real-time job metrics
8. **Reliability:** 99.9% job success rate

---

## ⚠️ RISKS & MITIGATIONS

### Risk: Queue Failure
**Mitigation:** 
- Synchronous fallback
- Circuit breakers
- Health checks
- Auto-restart workers

### Risk: Redis Failure
**Mitigation:** 
- Redis Sentinel for HA
- Redis persistence (AOF + RDB)
- Connection pooling
- Reconnection logic

### Risk: Worker Bottleneck
**Mitigation:** 
- Horizontal scaling
- Job prioritization
- Rate limiting
- Backpressure handling

### Risk: Job Loss
**Mitigation:** 
- Job persistence in Redis
- Dead letter queue
- Job deduplication
- Monitoring/alerting

### Risk: Performance Degradation
**Mitigation:** 
- Benchmark before/after
- Gradual rollout
- Feature flags
- Rollback plan

---

## 📝 NEXT STEPS

1. ✅ Audit complete
2. ⏳ Generate architecture plan (this document)
3. ⏳ Install BullMQ and Redis dependencies
4. ⏳ Create Redis configuration
5. ⏳ Create queue configuration
6. ⏳ Create queue producers
7. ⏳ Create queue workers
8. ⏳ Create worker manager
9. ⏳ Migrate services to queues
10. ⏳ Implement retry strategy
11. ⏳ Implement dead letter handling
12. ⏳ Create monitoring
13. ⏳ Test implementation
14. ⏳ Deploy to staging
15. ⏳ Deploy to production
