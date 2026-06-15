# Marketplace Health Monitoring Architecture Plan

**Date:** June 15, 2026  
**Architect:** Marketplace Operations Architect  
**Project:** KAYAD Marketplace Health Monitoring  
**Version:** 1.0.0

---

## Executive Summary

The Marketplace Health Monitoring system provides comprehensive visibility into platform health, performance, and operational metrics. It tracks key indicators across dealers, buyers, vehicles, transactions, and revenue, enabling proactive issue detection and data-driven decision making. The system calculates a unified health score and generates automated alerts for critical issues.

**Key Objectives:**
- Monitor platform health in real-time
- Detect and alert on operational issues
- Calculate unified marketplace health score
- Enable proactive issue resolution
- Support data-driven operational decisions

---

## Audit Findings

### User Model
**Model:** User.js
- Basic info: name, email, role, isBanned, deactivatedAt
- Activity tracking: lastLogin, loginCount
- Verification status: emailVerified, phoneVerified
- Role-based access: admin, dealer, buyer, superadmin

**Integration Points:**
- Active dealers count (role: dealer, not banned, not deactivated)
- Active buyers count (role: buyer, not banned, not deactivated)
- User activity metrics for inactivity detection

### Dealer Model
**Model:** Dealer.js
- Linked user reference
- Business info: businessName, location, phone
- Verification status: approved
- Sales metrics: totalSales, totalRevenue
- Account control: isSuspended, isRestricted

**Integration Points:**
- Dealer activity tracking
- Dealer inactivity detection
- Dealer performance metrics

### Fraud Detection Model
**Model:** FraudDetection.js
- Target user reference
- Fraud type classification
- Severity and confidence scores
- Status tracking: pending, confirmed, false_positive
- Evidence management

**Integration Points:**
- Fraud incident tracking
- Fraud rate calculation
- Alert generation for high fraud rates

### Escrow Model
**Model:** Escrow.js
- Car, buyer, seller references
- Amount and commission tracking
- Status: pending, held, released, refunded, disputed
- Timeline stages with timestamps
- Dispute tracking

**Integration Points:**
- Escrow conversion rate calculation
- Dispute tracking
- Revenue tracking
- Payment failure detection

### Lead Model
**Model:** Lead.js
- Buyer and dealer references
- Vehicle reference
- Stage tracking: new, contacted, negotiating, test_drive, escrow_started, sold, lost
- Source tracking: chat, auction, contact_form, direct_listing, referral
- Metrics: response time, conversion rate

**Integration Points:**
- Lead conversion rate calculation
- Lead stage distribution
- Response time metrics

### Car Model
**Model:** Car.js
- Basic info: title, brand, model, year, price
- Dealer reference
- Status: active, sold, pending, rejected
- Auction fields: auctionStatus, currentBid, bidsCount
- Analytics: views, clicks, favoritesCount

**Integration Points:**
- Vehicles listed count
- Vehicles sold count
- Inventory tracking
- Auction conversion tracking

### Auction Model
**Model:** Auction.js
- Car reference
- Status: active, ended, pending_payment, completed, cancelled
- Winner and bid history
- Payment status tracking

**Integration Points:**
- Auction conversion rate calculation
- Auction volume tracking

### Transaction Model
**Model:** Transaction.js
- User and car references
- Amount and currency
- Transaction types: bid_commitment, escrow_deposit, escrow_release, buy_now, refund
- Status: pending, success, failed, refunded, cancelled

**Integration Points:**
- Revenue tracking
- Payment failure detection
- Transaction volume metrics

---

## Architecture Design

### Metrics Tracked

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Active Dealers | Verified, non-banned, non-suspended dealers | User, Dealer |
| Active Buyers | Non-banned, non-deactivated buyers | User |
| Vehicles Listed | Active vehicle listings | Car |
| Vehicles Sold | Sold vehicles | Car |
| Escrow Conversion | Escrow to sale conversion rate | Escrow |
| Auction Conversion | Auction to sale conversion rate | Auction |
| Lead Conversion | Lead to sale conversion rate | Lead |
| Fraud Incidents | Confirmed fraud cases | FraudDetection |
| Disputes | Escrow disputes | Escrow |
| Revenue | Total platform revenue | Transaction |

### Health Score Calculation

**Score Components (0-100):**
- **Inventory Health (20%):** Active listings, listing velocity
- **Conversion Health (25%):** Escrow, auction, lead conversion rates
- **User Activity (20%):** Active dealers, active buyers, user engagement
- **Financial Health (20%):** Revenue, payment success rate
- **Trust & Safety (15%):** Fraud rate, dispute rate

**Score Calculation:**
```
Health Score = (Inventory Health × 0.20) + 
               (Conversion Health × 0.25) + 
               (User Activity × 0.20) + 
               (Financial Health × 0.20) + 
               (Trust & Safety × 0.15)
```

**Score Interpretation:**
- 90-100: Excellent
- 75-89: Good
- 60-74: Fair
- 40-59: Poor
- 0-39: Critical

### Alert Thresholds

| Alert Type | Trigger Condition | Severity |
|------------|-------------------|----------|
| Low Inventory | Active listings < 100 | High |
| Low Conversion | Overall conversion < 15% | High |
| High Fraud Rate | Fraud rate > 5% | Critical |
| Dealer Inactivity | 30+ days inactive dealer | Medium |
| Payment Failures | Payment failure rate > 10% | High |
| High Dispute Rate | Dispute rate > 3% | Medium |
| Revenue Decline | Revenue drop > 20% week-over-week | High |

### Data Model

#### MarketplaceHealth Model
```javascript
{
  // =============================
  // 📊 METADATA
  // =============================
  period: {
    type: String,
    enum: ["hourly", "daily", "weekly", "monthly"],
    required: true,
    index: true,
  },
  
  timestamp: {
    type: Date,
    required: true,
    index: true,
  },
  
  // =============================
  // 👥 USER METRICS
  // =============================
  activeDealers: {
    type: Number,
    default: 0,
  },
  
  activeBuyers: {
    type: Number,
    default: 0,
  },
  
  newDealers: {
    type: Number,
    default: 0,
  },
  
  newBuyers: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 🚗 VEHICLE METRICS
  // =============================
  vehiclesListed: {
    type: Number,
    default: 0,
  },
  
  vehiclesSold: {
    type: Number,
    default: 0,
  },
  
  newListings: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 💰 CONVERSION METRICS
  // =============================
  escrowConversionRate: {
    type: Number,
    default: 0,
  },
  
  auctionConversionRate: {
    type: Number,
    default: 0,
  },
  
  leadConversionRate: {
    type: Number,
    default: 0,
  },
  
  overallConversionRate: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 🚨 TRUST & SAFETY METRICS
  // =============================
  fraudIncidents: {
    type: Number,
    default: 0,
  },
  
  fraudRate: {
    type: Number,
    default: 0,
  },
  
  disputes: {
    type: Number,
    default: 0,
  },
  
  disputeRate: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 💵 FINANCIAL METRICS
  // =============================
  revenue: {
    type: Number,
    default: 0,
  },
  
  paymentSuccessRate: {
    type: Number,
    default: 0,
  },
  
  paymentFailures: {
    type: Number,
    default: 0,
  },
  
  // =============================
  // 📈 HEALTH SCORE
  // =============================
  healthScore: {
    type: Number,
    default: 100,
  },
  
  healthScoreBreakdown: {
    inventoryHealth: Number,
    conversionHealth: Number,
    userActivity: Number,
    financialHealth: Number,
    trustSafety: Number,
  },
  
  // =============================
  // 🚨 ALERTS
  // =============================
  alerts: [
    {
      type: {
        type: String,
        enum: ["low_inventory", "low_conversion", "high_fraud", "dealer_inactivity", "payment_failures", "high_disputes", "revenue_decline"],
      },
      severity: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
      },
      message: String,
      value: Number,
      threshold: Number,
      triggeredAt: {
        type: Date,
        default: Date.now,
      },
      resolvedAt: Date,
      status: {
        type: String,
        enum: ["active", "resolved", "acknowledged"],
        default: "active",
      },
    },
  ],
  
  // =============================
  // 📊 TREND DATA
  // =============================
  trends: {
    revenueTrend: [Number],
    conversionTrend: [Number],
    listingTrend: [Number],
    userActivityTrend: [Number],
  },
  
  timestamps: true,
}
```

---

## File-by-File Implementation Plan

### 1. Database Models

#### 1.1 Create MarketplaceHealth Model
**File:** `backend/models/MarketplaceHealth.js`

**Schema:** As defined above

**Indexes:**
- period, timestamp (composite)
- timestamp (for time-based queries)

**Methods:**
- `calculateHealthScore()` - Calculate unified health score
- `generateAlerts()` - Generate alerts based on thresholds
- `resolveAlert(alertId)` - Mark alert as resolved

### 2. Services

#### 2.1 Create MarketplaceHealth Service
**File:** `backend/services/marketplaceHealthService.js`

**Functions:**
- `calculateActiveDealers()` - Count active dealers
- `calculateActiveBuyers()` - Count active buyers
- `calculateVehicleMetrics()` - Calculate vehicle metrics
- `calculateConversionRates()` - Calculate conversion rates
- `calculateFraudMetrics()` - Calculate fraud metrics
- `calculateFinancialMetrics()` - Calculate revenue and payment metrics
- `calculateHealthScore(metrics)` - Calculate unified health score
- `generateAlerts(metrics)` - Generate alerts based on thresholds
- `generateMarketplaceHealth(period)` - Generate complete marketplace health snapshot
- `getHealthTrend(startDate, endDate)` - Get health trend over time

#### 2.2 Create MarketplaceHealth Scheduler
**File:** `backend/services/marketplaceHealthScheduler.js`

**Functions:**
- `startScheduler()` - Start cron jobs for health monitoring
- `stopScheduler()` - Stop scheduler
- `generateHourlyHealth()` - Generate hourly health snapshot
- `generateDailyHealth()` - Generate daily health snapshot
- `generateWeeklyHealth()` - Generate weekly health snapshot
- `triggerHealthGeneration(period)` - Manual trigger

### 3. Controllers

#### 3.1 Create MarketplaceHealth Controller
**File:** `backend/controllers/marketplaceHealthController.js`

**Endpoints:**
- `GET /api/marketplace-health/summary` - Get health summary
- `GET /api/marketplace-health/trends` - Get health trends
- `GET /api/marketplace-health/alerts` - Get active alerts
- `POST /api/marketplace-health/alerts/:alertId/resolve` - Resolve alert
- `GET /api/marketplace-health/metrics` - Get detailed metrics
- `POST /api/marketplace-health/regenerate` - Regenerate health snapshot (admin)

### 4. Routes

#### 4.1 Create MarketplaceHealth Routes
**File:** `backend/routes/marketplaceHealthRoutes.js`

**Routes:**
- Public routes for health summary
- Admin routes for alert management and regeneration

### 5. Database Migrations

#### 5.1 Create Migration Script
**File:** `backend/migrations/migrate_marketplace_health.js`

**Steps:**
1. Create MarketplaceHealth collection
2. Add indexes
3. Backfill historical health data (last 7 days hourly, last 30 days daily)
4. Generate initial health snapshot

### 6. Dashboard Components

#### 6.1 Admin Health Dashboard
**File:** `src/components/admin/MarketplaceHealthDashboard.jsx`

**Components:**
- `HealthScoreCard` - Overall health score display
- `MetricsGrid` - Key metrics overview
- `AlertsPanel` - Active alerts list
- `TrendCharts` - Health trend visualizations
- `ConversionMetrics` - Conversion rate breakdown
- `TrustSafetyMetrics` - Fraud and dispute metrics

---

## Database Schema Changes

### New Collections
1. **MarketplaceHealth** - Store marketplace health snapshots

### No Schema Changes to Existing Collections
- User model remains unchanged
- Dealer model remains unchanged
- Car model remains unchanged
- Escrow model remains unchanged
- Lead model remains unchanged
- Auction model remains unchanged
- Transaction model remains unchanged
- FraudDetection model remains unchanged

---

## API Endpoints

### Public Endpoints
```
GET /api/marketplace-health/summary - Get health summary
GET /api/marketplace-health/trends - Get health trends
```

### Admin Endpoints
```
GET /api/marketplace-health/alerts - Get active alerts
POST /api/marketplace-health/alerts/:alertId/resolve - Resolve alert
GET /api/marketplace-health/metrics - Get detailed metrics
POST /api/marketplace-health/regenerate - Regenerate health snapshot
GET /api/marketplace-health/admin/all - Get all health records
```

---

## Backwards Compatibility

### Preserved Functionality
- All existing user workflows remain unchanged
- All existing dealer workflows remain unchanged
- All existing vehicle workflows remain unchanged
- All existing transaction workflows remain unchanged
- No breaking changes to existing APIs

### New Functionality (Additive Only)
- New MarketplaceHealth model (separate collection)
- New marketplace health service (separate module)
- New marketplace health scheduler (separate module)
- New health monitoring APIs (separate routes)
- New admin dashboard component (additive component)

### Migration Strategy
- Zero-downtime migration
- Backfill historical data
- Gradual rollout
- Feature flags for enabling/disabling

---

## Performance Considerations

### Caching Strategy
- Cache health summary data with 5-minute TTL
- Cache trend data with 15-minute TTL
- Cache alerts with 1-minute TTL
- Use Redis for distributed caching

### Batch Processing
- Process health calculations in batches
- Use MongoDB aggregation for calculations
- Parallel processing where possible
- Background job scheduling

### Index Optimization
- Index on period, timestamp for time-based queries
- Index on alerts.status for alert queries
- Compound indexes for common filter combinations

---

## Security Considerations

### Access Control
- Public endpoints for aggregated health data
- Admin endpoints require admin role
- Rate limiting on all endpoints
- Audit logging for alert resolution

### Data Privacy
- No personal information in health metrics
- Aggregate data only
- No individual transaction details exposed

### Audit Logging
- Log all health snapshot generation
- Log all alert generation
- Log all alert resolution
- Log data access patterns

---

## Monitoring and Alerting

### Metrics
- Health score generation time
- Alert generation frequency
- API response times
- Cache hit rates

### Alerts
- Alert on health score below 60
- Alert on critical alerts
- Alert on stale data
- Alert on slow API responses

---

## Success Metrics

### Platform Level
- Health score stability
- Alert response time
- Data freshness
- Dashboard engagement

### Operational Level
- Issue detection speed
- Issue resolution time
- False positive rate
- System reliability

---

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- Create MarketplaceHealth model
- Create marketplace health service
- Implement core calculation functions
- Create marketplace health scheduler

### Phase 2: APIs & Integration (Week 2)
- Create marketplace health controller
- Create marketplace health routes
- Implement API endpoints
- Test API functionality

### Phase 3: Dashboard (Week 3)
- Create admin health dashboard
- Implement health score visualization
- Implement alerts panel
- Test dashboard functionality

### Phase 4: Testing & Launch (Week 4)
- Comprehensive testing
- Performance optimization
- Security audit
- Gradual rollout

---

## Risk Mitigation

### Technical Risks
- **Data Inconsistency:** Implement transactional updates
- **Performance Issues:** Implement caching and batch processing
- **Calculation Errors:** Implement validation and testing

### Business Risks
- **Alert Fatigue:** Implement alert prioritization and throttling
- **False Positives:** Implement threshold tuning and learning
- **Data Accuracy:** Regular validation against source data

### Operational Risks
- **Migration Issues:** Test migration thoroughly
- **Downtime:** Zero-downtime migration strategy
- **Support Load:** Prepare support team

---

## Next Steps

1. Review and approve architecture plan
2. Create MarketplaceHealth model
3. Create marketplace health service
4. Create marketplace health scheduler
5. Implement API endpoints
6. Create admin dashboard
7. Test thoroughly
8. Deploy to production
9. Monitor and iterate

---

**Architecture Plan Completed:** June 15, 2026  
**Next Phase:** Implementation  
**Estimated Timeline:** 4 weeks
