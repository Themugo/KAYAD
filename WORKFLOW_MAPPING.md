---
title: WORKFLOW_MAPPING
owner: @cto
team: leadership
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [planning]
---
# KAYAD Business Workflow Mapping & QA Test Strategy

**Phase:** QA Automation Architecture  
**Date:** June 16, 2026  
**Architect:** QA Automation Architect  
**Scope:** Critical Business Workflows E2E Testing

---

## Executive Summary

This document maps all critical business workflows for the KAYAD car marketplace platform, identifying entry points, dependencies, failure scenarios, and rollback strategies. It serves as the foundation for comprehensive Playwright end-to-end test automation.

**Workflows Covered:**
1. Dealer Onboarding
2. Vehicle Listing
3. Buyer Inquiry
4. Chat
5. Auction Bidding
6. Escrow Creation
7. M-Pesa Payment
8. Escrow Release
9. Reviews
10. Disputes

---

## 1. Dealer Onboarding Workflow

### Entry Points
- **Primary:** Registration form (`/register` → dealer role selection)
- **Secondary:** Admin dashboard (manual dealer creation)
- **API:** `POST /api/auth/register` with role: "dealer"

### Dependencies
- **External:** NTSA verification API (Kenya)
- **Internal:** User authentication, email service, SMS service
- **Database:** User collection, Dealer collection, Verification collection
- **Queue:** Verification queue, notification queue

### Workflow Steps
1. User submits registration with dealer role
2. System validates input (email, phone, business details)
3. NTSA verification triggered (if enabled)
4. Email verification sent
5. SMS verification sent
6. Admin approval (if manual approval enabled)
7. Dealer profile created
8. Welcome notification sent

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| NTSA API timeout | High | API timeout error | Retry with exponential backoff, fallback to manual verification |
| Email delivery failure | Medium | SMTP error | Queue for retry, manual admin notification |
| SMS delivery failure | Medium | SMS gateway error | Queue for retry, fallback to email verification |
| Duplicate registration | Low | Database constraint | Return user-friendly error, suggest login |
| Invalid business documents | Medium | Validation error | Request resubmission with clear error messages |

### Rollback Strategies
- **Partial completion:** Delete user record if verification fails
- **Verification failure:** Mark as pending, allow retry
- **Payment failure:** Refund if payment was made
- **System error:** Retry operation with circuit breaker

### Test Coverage Requirements
- **Happy Path:** Complete dealer onboarding with all verifications
- **Edge Cases:** Invalid phone format, duplicate email, expired verification codes
- **Failure Cases:** NTSA API failure, email service down, SMS service down, network timeout

---

## 2. Vehicle Listing Workflow

### Entry Points
- **Primary:** Dealer dashboard → "Add Vehicle" form
- **Secondary:** Bulk upload API
- **API:** `POST /api/cars` with dealer authentication

### Dependencies
- **Internal:** Dealer authentication, image service, SEO service
- **Database:** Car collection, Dealer collection, Image collection
- **Queue:** Image processing queue, SEO generation queue
- **External:** Cloud storage (images), NTSA verification (optional)

### Workflow Steps
1. Dealer authenticates
2. Dealer submits vehicle details (make, model, year, price, etc.)
3. System validates input
4. Images uploaded and processed
5. NTSA verification triggered (if enabled)
6. SEO metadata generated
7. Listing saved to database
8. Listing published (or set to draft)
9. Notification sent to dealer

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| Image upload failure | High | Storage API error | Retry upload, delete partial records |
| Invalid vehicle data | Low | Validation error | Return detailed error messages |
| NTSA verification failure | Medium | API error | Mark as pending, allow manual verification |
| Duplicate listing | Low | Database constraint | Return error, suggest edit existing |
| SEO generation failure | Low | Queue error | Continue without SEO, retry in background |

### Rollback Strategies
- **Image upload failure:** Delete uploaded images, clear database record
- **Validation failure:** No rollback needed, return error to user
- **System error:** Retry with circuit breaker, notify admin

### Test Coverage Requirements
- **Happy Path:** Complete vehicle listing with images
- **Edge Cases:** Maximum image count, invalid image formats, missing required fields
- **Failure Cases:** Image service down, validation errors, network timeout

---

## 3. Buyer Inquiry Workflow

### Entry Points
- **Primary:** Vehicle detail page → "Contact Dealer" button
- **Secondary:** Saved search alerts
- **API:** `POST /api/leads` with buyer authentication

### Dependencies
- **Internal:** Buyer authentication, lead service, notification service
- **Database:** Lead collection, Car collection, User collection
- **Queue:** Notification queue, email queue

### Workflow Steps
1. Buyer authenticates (optional for initial inquiry)
2. Buyer submits inquiry (message, contact info)
3. System validates input
4. Lead created in database
5. Notification sent to dealer (email, SMS, in-app)
6. Lead assigned to dealer
7. Buyer confirmation sent

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| Notification failure | Medium | Email/SMS error | Queue for retry, in-app notification fallback |
| Invalid contact info | Low | Validation error | Return error, request valid input |
| Duplicate inquiry | Low | Database constraint | Return error, suggest follow-up |
| Dealer inactive | Medium | Database check | Notify buyer, suggest similar dealers |
| Rate limit exceeded | Low | Rate limiter | Return error, suggest wait time |

### Rollback Strategies
- **Notification failure:** Queue for retry, in-app notification fallback
- **Validation failure:** No rollback needed
- **System error:** Retry with circuit breaker

### Test Coverage Requirements
- **Happy Path:** Complete buyer inquiry with notifications
- **Edge Cases:** Anonymous inquiry, rate limit, dealer inactive
- **Failure Cases:** Notification service down, validation errors

---

## 4. Chat Workflow

### Entry Points
- **Primary:** Lead detail → "Start Chat" button
- **Secondary:** Direct message from dealer
- **API:** WebSocket connection via Socket.IO

### Dependencies
- **Internal:** User authentication, Socket.IO service, message queue
- **Database:** Message collection, Chat collection, User collection
- **Real-time:** Socket.IO server, Redis pub/sub

### Workflow Steps
1. User authenticates
2. WebSocket connection established
3. Chat room created/retrieved
4. Message sent
5. Message persisted to database
6. Message delivered to recipient (real-time)
7. Notification sent if recipient offline
8. Message read receipt updated

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| WebSocket disconnect | Medium | Connection error | Auto-reconnect, queue undelivered messages |
| Message persistence failure | High | Database error | Retry persistence, notify user of failure |
| Notification failure | Low | Notification error | Queue for retry |
| Rate limit exceeded | Low | Rate limiter | Return error, suggest wait time |
| Invalid message content | Low | Validation error | Return error, filter content |

### Rollback Strategies
- **WebSocket disconnect:** Auto-reconnect, deliver queued messages
- **Persistence failure:** Retry with exponential backoff
- **System error:** Circuit breaker, notify admin

### Test Coverage Requirements
- **Happy Path:** Real-time chat with message delivery
- **Edge Cases:** Offline recipient, rate limit, message history
- **Failure Cases:** WebSocket disconnect, database failure, notification failure

---

## 5. Auction Bidding Workflow

### Entry Points
- **Primary:** Auction detail page → "Place Bid" button
- **Secondary:** SMS bidding (if enabled)
- **API:** `POST /api/bids` with buyer authentication

### Dependencies
- **Internal:** Buyer authentication, auction engine, fraud detection
- **Database:** Bid collection, Car collection, User collection
- **Real-time:** Socket.IO server, Redis locks
- **Queue:** Fraud detection queue, notification queue

### Workflow Steps
1. Buyer authenticates
2. System validates auction status (active, not ended)
3. System validates bid amount (above current, above minimum)
4. Fraud detection checks (bid patterns, user behavior)
5. Redis lock acquired for auction
6. Bid saved to database
7. Current bid updated
8. Real-time notification sent to all participants
9. Outbid notification sent to previous bidder
10. Lock released

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| Auction ended | Medium | Database check | Return error, show final price |
| Bid too low | Low | Validation error | Return error with minimum bid |
| Fraud detection trigger | High | Fraud service | Block bid, notify admin, flag user |
| Lock acquisition failure | Medium | Redis error | Retry with backoff, return error |
| Duplicate bid | Low | Database constraint | Return error, suggest higher bid |
| Network timeout | Medium | Timeout error | Retry operation, check bid status |

### Rollback Strategies
- **Lock failure:** Retry with exponential backoff
- **Fraud detection:** Block bid, notify admin
- **System error:** Circuit breaker, notify admin

### Test Coverage Requirements
- **Happy Path:** Successful bid with real-time updates
- **Edge Cases:** Minimum bid, maximum bid, concurrent bids
- **Failure Cases:** Auction ended, fraud detection, lock failure, network timeout

---

## 6. Escrow Creation Workflow

### Entry Points
- **Primary:** Successful auction → Auto-create escrow
- **Secondary:** Manual escrow creation (admin)
- **API:** `POST /api/escrow` with authentication

### Dependencies
- **Internal:** Payment service, escrow service, notification service
- **Database:** Escrow collection, Car collection, User collection
- **Queue:** Escrow queue, notification queue
- **External:** M-Pesa API

### Workflow Steps
1. Auction ends (winner determined)
2. Escrow automatically created
3. Buyer notified to make payment
4. Payment initiated via M-Pesa
5. Payment confirmed
6. Escrow marked as funded
7. Seller notified of funding
8. Delivery timeline started

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| Payment initiation failure | High | M-Pesa error | Retry payment, notify buyer |
| Payment confirmation timeout | High | Timeout error | Check M-Pesa status, retry confirmation |
| Escrow creation failure | Critical | Database error | Retry creation, notify admin |
| Notification failure | Medium | Notification error | Queue for retry |
| Invalid auction state | Medium | Database check | Return error, check auction status |

### Rollback Strategies
- **Payment failure:** Retry with exponential backoff, cancel escrow if retries exhausted
- **Escrow creation failure:** Retry with circuit breaker
- **System error:** Notify admin, manual intervention

### Test Coverage Requirements
- **Happy Path:** Automatic escrow creation after auction
- **Edge Cases:** Manual escrow creation, payment timeout
- **Failure Cases:** Payment failure, escrow creation failure, notification failure

---

## 7. M-Pesa Payment Workflow

### Entry Points
- **Primary:** Escrow payment → "Pay Now" button
- **Secondary:** Direct payment link
- **API:** `POST /api/payments/initiate` with authentication

### Dependencies
- **Internal:** Payment service, escrow service, notification service
- **External:** M-Pesa API (Safaricom)
- **Database:** Payment collection, Escrow collection, User collection
- **Queue:** Payment queue, notification queue

### Workflow Steps
1. Buyer initiates payment
2. System validates payment amount and escrow status
3. M-Pesa STK push initiated
4. Buyer receives prompt on phone
5. Buyer enters M-Pesa PIN
6. M-Pesa processes payment
7. Callback received from M-Pesa
8. Payment status updated
9. Escrow marked as funded
10. Notifications sent (buyer, seller)

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| M-Pesa API timeout | High | API timeout | Retry with circuit breaker, notify buyer |
| Invalid phone number | Low | Validation error | Return error, request valid number |
| Insufficient funds | Medium | M-Pesa error | Notify buyer, suggest retry |
| Payment timeout | High | Timeout error | Check M-Pesa status, retry callback |
| Callback failure | High | Callback error | Poll M-Pesa status, manual reconciliation |
| Duplicate payment | Medium | Idempotency check | Return original payment status |

### Rollback Strategies
- **M-Pesa failure:** Retry with circuit breaker, fallback to manual payment
- **Callback failure:** Poll M-Pesa API for status
- **System error:** Circuit breaker, notify admin

### Test Coverage Requirements
- **Happy Path:** Successful M-Pesa payment with callback
- **Edge Cases:** Invalid phone, insufficient funds, payment timeout
- **Failure Cases:** M-Pesa API failure, callback failure, duplicate payment

---

## 8. Escrow Release Workflow

### Entry Points
- **Primary:** Buyer confirms delivery → "Release Funds" button
- **Secondary:** Auto-release after N days (cron job)
- **API:** `POST /api/escrow/:id/release` with authentication

### Dependencies
- **Internal:** Escrow service, payment service, notification service
- **Database:** Escrow collection, Payment collection, User collection
- **Queue:** Escrow queue, notification queue
- **External:** M-Pesa API (for seller payout)

### Workflow Steps
1. Buyer confirms delivery
2. System validates escrow status (funded, not released)
3. Escrow marked as releasing
4. Seller payout initiated via M-Pesa
5. Payout confirmed
6. Escrow marked as released
7. Transaction recorded
8. Notifications sent (buyer, seller)
9. Review request sent to buyer

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| Payout initiation failure | High | M-Pesa error | Retry payout, notify seller |
| Payout confirmation timeout | High | Timeout error | Check M-Pesa status, retry confirmation |
| Invalid escrow state | Medium | Database check | Return error, check escrow status |
| Notification failure | Medium | Notification error | Queue for retry |
| Auto-release failure | Critical | Cron error | Manual admin intervention, notify support |

### Rollback Strategies
- **Payout failure:** Retry with exponential backoff, manual payout if exhausted
- **Auto-release failure:** Manual admin intervention
- **System error:** Circuit breaker, notify admin

### Test Coverage Requirements
- **Happy Path:** Manual escrow release with seller payout
- **Edge Cases:** Auto-release, partial release
- **Failure Cases:** Payout failure, invalid escrow state, notification failure

---

## 9. Reviews Workflow

### Entry Points
- **Primary:** Post-escrow → "Write Review" button
- **Secondary:** Direct review link
- **API:** `POST /api/reviews` with authentication

### Dependencies
- **Internal:** Review service, notification service, fraud detection
- **Database:** Review collection, User collection, Car collection
- **Queue:** Review queue, notification queue

### Workflow Steps
1. Buyer authenticates
2. System validates eligibility (completed escrow)
3. Buyer submits review (rating, comments)
4. Fraud detection checks (spam patterns, fake reviews)
5. Review saved to database
6. Seller rating updated
7. Notification sent to seller
8. Review published

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| Invalid eligibility | Low | Database check | Return error, check escrow status |
| Fraud detection trigger | Medium | Fraud service | Flag review, notify admin |
| Duplicate review | Low | Database constraint | Return error, suggest edit existing |
| Notification failure | Low | Notification error | Queue for retry |
| Rating calculation error | Medium | Calculation error | Recalculate, notify admin |

### Rollback Strategies
- **Fraud detection:** Flag review, require admin approval
- **Calculation error:** Recalculate ratings
- **System error:** Retry with circuit breaker

### Test Coverage Requirements
- **Happy Path:** Successful review submission
- **Edge Cases:** Minimum rating, maximum rating, long comments
- **Failure Cases:** Invalid eligibility, fraud detection, duplicate review

---

## 10. Disputes Workflow

### Entry Points
- **Primary:** Escrow detail → "Open Dispute" button
- **Secondary:** Admin dashboard (manual dispute creation)
- **API:** `POST /api/disputes` with authentication

### Dependencies
- **Internal:** Dispute service, notification service, escrow service
- **Database:** Dispute collection, Escrow collection, User collection
- **Queue:** Dispute queue, notification queue

### Workflow Steps
1. User (buyer or seller) initiates dispute
2. System validates escrow status (funded, not released)
3. Dispute created in database
4. Escrow marked as disputed
5. Notifications sent (buyer, seller, admin)
6. Evidence collection phase
7. Admin review
8. Resolution decision
9. Funds released per decision
10. Notifications sent (all parties)

### Failure Scenarios
| Scenario | Impact | Detection | Rollback Strategy |
|----------|--------|-----------|-------------------|
| Invalid escrow state | Medium | Database check | Return error, check escrow status |
| Duplicate dispute | Low | Database constraint | Return error, suggest follow-up |
| Notification failure | Medium | Notification error | Queue for retry |
| Resolution failure | Critical | Admin error | Manual intervention, escalate to support |
| Fund release failure | Critical | Payment error | Retry payout, manual intervention |

### Rollback Strategies
- **Invalid state:** Return error, no rollback needed
- **Resolution failure:** Manual admin intervention
- **Fund release failure:** Retry with exponential backoff, manual payout

### Test Coverage Requirements
- **Happy Path:** Complete dispute resolution
- **Edge Cases:** Multiple disputes, evidence upload
- **Failure Cases:** Invalid escrow state, resolution failure, fund release failure

---

## Workflow Matrix

| Workflow | Entry Points | Dependencies | Critical Path | Failure Impact | Rollback Complexity |
|----------|--------------|-------------|---------------|----------------|---------------------|
| Dealer Onboarding | Register form, Admin API | NTSA, Email, SMS | NTSA verification | High | Medium |
| Vehicle Listing | Dashboard form, Bulk API | Image service, SEO | Image upload | High | Low |
| Buyer Inquiry | Contact form, API | Notification service | Lead creation | Medium | Low |
| Chat | WebSocket, API | Socket.IO, Redis | Message delivery | Medium | Medium |
| Auction Bidding | Bid form, SMS API | Fraud detection, Redis locks | Bid placement | High | Medium |
| Escrow Creation | Auto-create, Manual API | Payment service | Escrow creation | Critical | High |
| M-Pesa Payment | Pay button, API | M-Pesa API | Payment confirmation | Critical | High |
| Escrow Release | Release button, Cron | M-Pesa API | Payout confirmation | Critical | High |
| Reviews | Review form, API | Fraud detection | Review submission | Low | Low |
| Disputes | Dispute form, Admin API | Escrow service | Resolution | Critical | High |

---

## Test Strategy Summary

### Test Pyramid
- **E2E Tests (Playwright):** 10% - Critical user journeys
- **Integration Tests:** 30% - API and service interactions
- **Unit Tests:** 60% - Individual functions and components

### Test Categories
1. **Happy Path Tests:** Verify complete workflow execution
2. **Edge Case Tests:** Boundary conditions and unusual inputs
3. **Failure Case Tests:** Error handling and recovery
4. **Performance Tests:** Load and stress testing
5. **Security Tests:** Authentication, authorization, data protection

### Test Environment
- **Development:** Local testing with mock services
- **Staging:** Pre-production with real services
- **Production:** Smoke tests only (read-only)

### CI/CD Integration
- **On Pull Request:** Run E2E tests on staging
- **On Merge:** Run full test suite
- **On Deploy:** Run smoke tests
- **Scheduled:** Nightly regression tests

---

**Next Steps:**
1. Create Playwright test configuration
2. Implement E2E tests for each workflow
3. Set up test data fixtures
4. Configure CI/CD pipeline integration
5. Document test execution procedures
