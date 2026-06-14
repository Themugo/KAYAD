# Dealer Health Score Architecture Plan

**Date:** June 15, 2026  
**Architect:** Marketplace Trust and Reputation Architect  
**Project:** KAYAD Dealer Health Score System  
**Version:** 1.0.0

---

## Executive Summary

The Dealer Health Score system provides a comprehensive, data-driven assessment of dealer trustworthiness and performance on the KAYAD marketplace. The system calculates a 0-100 score based on multiple factors including verification completeness, account age, transaction success, escrow performance, fraud flags, reviews, response speed, listing quality, and auction completion.

**Key Objectives:**
- Provide transparent trust signals to buyers
- Incentivize good dealer behavior
- Identify and mitigate high-risk dealers
- Enable data-driven platform governance
- Maintain backwards compatibility

---

## Audit Findings

### Existing Dealer Model
- **Rating System:** Basic 1-5 star rating with total reviews count
- **Performance Metrics:** totalSales, totalRevenue, totalListings
- **Verification:** approved boolean with verifiedAt timestamp
- **Suspension:** isSuspended boolean with suspensionReason
- **Methods:** updateRating, recordSale, approveDealer, suspendDealer

### Existing Dealer Verification
- **Documents:** governmentId, kraPin, businessRegistration, physicalAddress, phoneVerification
- **Status:** pending, under_review, approved, rejected, suspended
- **Verification Tracking:** Each document has verified boolean, verifiedAt, verifiedBy
- **Rejection Handling:** rejectionReason, rejectionDetails

### Existing Reviews
- **Rating:** 1-5 star rating with comment
- **Trust System:** isVerified (verified purchase), isApproved (moderation), isFlagged
- **Auto-Update:** Hooks to update dealer rating on save/delete
- **Duplicate Prevention:** Unique constraint on user+dealer+car

### Existing Transactions
- **Types:** bid_commitment, escrow_deposit, escrow_release, buy_now, refund, commission, withdrawal, deposit, referral_bonus
- **Status:** pending, success, failed, refunded, cancelled
- **M-Pesa Integration:** phone, mpesaReceipt, checkoutRequestId
- **Escrow Link:** escrowId reference

### Existing Escrow
- **Status:** pending, held, released, refunded, disputed
- **Timeline:** depositReceived, inspectionScheduled, inspectionCompleted, transferSubmitted, transferApproved, fundsReleased
- **Dispute Handling:** disputedBy, disputedAt, disputeReason
- **Auto-Release:** autoReleased boolean with releaseWindowDays

### Existing Fraud Detection
- **Fraud Types:** multiple_accounts, duplicate_phone, duplicate_email, suspicious_registration, self_bidding, bid_ring, suspicious_bid_spike, shill_bidding, repeated_disputes, chargeback, refund_abuse, duplicate_listing, vin_reuse, stolen_photos, fake_listing
- **Severity:** low, medium, high, critical
- **Status:** detected, under_review, confirmed, dismissed, action_taken
- **Confidence Score:** 0-100

### Existing Auctions
- **Status:** active, ended, pending_payment, completed, cancelled
- **Bid History:** Complete bid history with timestamps
- **Winner Assignment:** winner subdocument with userId, bid, assignedAt, attempt
- **Starting Bid:** startingBid, highestBid

### Existing Cars
- **Dealer Association:** dealer field linking to User
- **Listing Quality:** images, description, features, specs
- **Status:** isDemo flag for demo listings

---

## Architecture Design

### Score Calculation Formula

```
Health Score = (Verification Score × 15%) +
              (Account Age Score × 10%) +
              (Transaction Score × 20%) +
              (Escrow Score × 15%) +
              (Review Score × 15%) +
              (Fraud Score × -15%) +
              (Response Score × 10%) +
              (Listing Quality Score × 10%) +
              (Auction Score × 10%)
```

### Score Factors

#### 1. Verification Score (15%)
- **Government ID Verified:** 20 points
- **KRA PIN Verified:** 20 points
- **Business Registration Verified:** 20 points
- **Physical Address Verified:** 20 points
- **Phone Verified:** 20 points
- **Total:** 0-100 points

#### 2. Account Age Score (10%)
- **< 30 days:** 0 points
- **30-90 days:** 25 points
- **90-180 days:** 50 points
- **180-365 days:** 75 points
- **> 365 days:** 100 points

#### 3. Transaction Score (20%)
- **Success Rate:** (successful transactions / total transactions) × 100
- **Volume Score:** Logarithmic scale based on total revenue
- **Consistency Score:** Based on transaction frequency

#### 4. Escrow Score (15%)
- **Completion Rate:** (released escrows / total escrows) × 100
- **Dispute Rate:** (disputed escrows / total escrows) × -100
- **Auto-Release Rate:** (auto-released escrows / total escrows) × 50

#### 5. Review Score (15%)
- **Average Rating:** (average rating / 5) × 100
- **Review Count:** Logarithmic scale based on total reviews
- **Verified Reviews:** (verified reviews / total reviews) × 20 bonus

#### 6. Fraud Score (-15%)
- **Critical Flags:** -50 points each
- **High Severity:** -30 points each
- **Medium Severity:** -15 points each
- **Low Severity:** -5 points each
- **Confirmed Fraud:** -100 points per confirmed case
- **Dismissed Fraud:** 0 points (false positive)

#### 7. Response Score (10%)
- **Message Response Time:** Average response time to messages
- **Bid Response Time:** Average response time to bid inquiries
- **Support Response Time:** Average response time to support tickets

#### 8. Listing Quality Score (10%)
- **Image Quality:** Number of images, image resolution
- **Description Quality:** Description length, completeness
- **Specs Completeness:** Percentage of spec fields filled
- **Listing Accuracy:** Based on reported issues/flagged listings

#### 9. Auction Score (10%)
- **Completion Rate:** (completed auctions / total auctions) × 100
- **Winner Payment Rate:** (paid winners / total winners) × 100
- **Bid Activity:** Average number of bids per auction

### Score Categories

| Score Range | Category | Description |
|-------------|----------|-------------|
| 90-100 | Platinum | Top-tier dealers with excellent track record |
| 75-89 | Gold | Reliable dealers with good performance |
| 60-74 | Silver | Established dealers with acceptable performance |
| 40-59 | Warning | Dealers requiring monitoring and improvement |
| 0-39 | High Risk | Dealers with significant trust issues |

---

## File-by-File Implementation Plan

### 1. Database Models

#### 1.1 Create DealerHealthScore Model
**File:** `backend/models/DealerHealthScore.js`

**Schema:**
```javascript
{
  dealer: { type: ObjectId, ref: "User", required: true, unique: true, index: true },
  
  // Overall Score
  healthScore: { type: Number, default: 0, min: 0, max: 100 },
  scoreCategory: { type: String, enum: ["platinum", "gold", "silver", "warning", "high_risk"] },
  
  // Factor Scores
  verificationScore: { type: Number, default: 0, min: 0, max: 100 },
  accountAgeScore: { type: Number, default: 0, min: 0, max: 100 },
  transactionScore: { type: Number, default: 0, min: 0, max: 100 },
  escrowScore: { type: Number, default: 0, min: 0, max: 100 },
  reviewScore: { type: Number, default: 0, min: 0, max: 100 },
  fraudScore: { type: Number, default: 0, min: -100, max: 0 },
  responseScore: { type: Number, default: 0, min: 0, max: 100 },
  listingQualityScore: { type: Number, default: 0, min: 0, max: 100 },
  auctionScore: { type: Number, default: 0, min: 0, max: 100 },
  
  // Factor Details
  verificationDetails: {
    governmentIdVerified: Boolean,
    kraPinVerified: Boolean,
    businessRegistrationVerified: Boolean,
    physicalAddressVerified: Boolean,
    phoneVerified: Boolean,
    completeness: Number,
  },
  
  accountAgeDetails: {
    accountCreatedAt: Date,
    accountAgeDays: Number,
    score: Number,
  },
  
  transactionDetails: {
    totalTransactions: Number,
    successfulTransactions: Number,
    failedTransactions: Number,
    successRate: Number,
    totalRevenue: Number,
    volumeScore: Number,
    consistencyScore: Number,
  },
  
  escrowDetails: {
    totalEscrows: Number,
    releasedEscrows: Number,
    disputedEscrows: Number,
    refundedEscrows: Number,
    completionRate: Number,
    disputeRate: Number,
    autoReleaseRate: Number,
  },
  
  reviewDetails: {
    totalReviews: Number,
    averageRating: Number,
    verifiedReviews: Number,
    ratingScore: Number,
    volumeScore: Number,
    verifiedBonus: Number,
  },
  
  fraudDetails: {
    totalFlags: Number,
    criticalFlags: Number,
    highFlags: Number,
    mediumFlags: Number,
    lowFlags: Number,
    confirmedFraud: Number,
    dismissedFraud: Number,
    score: Number,
  },
  
  responseDetails: {
    messageResponseTime: Number,
    bidResponseTime: Number,
    supportResponseTime: Number,
    averageResponseTime: Number,
    score: Number,
  },
  
  listingQualityDetails: {
    totalListings: Number,
    averageImageCount: Number,
    averageDescriptionLength: Number,
    specsCompleteness: Number,
    flaggedListings: Number,
    score: Number,
  },
  
  auctionDetails: {
    totalAuctions: Number,
    completedAuctions: Number,
    totalWinners: Number,
    paidWinners: Number,
    completionRate: Number,
    paymentRate: Number,
    averageBidsPerAuction: Number,
    score: Number,
  },
  
  // Metadata
  lastCalculatedAt: Date,
  lastRecalculatedAt: Date,
  calculationVersion: { type: Number, default: 1 },
  
  // Trend
  previousScore: Number,
  scoreChange: Number,
  trend: { type: String, enum: ["up", "down", "stable"] },
  
  timestamps: true,
}
```

**Indexes:**
- dealer (unique)
- healthScore
- scoreCategory
- lastCalculatedAt

### 2. Services

#### 2.1 Create DealerHealthScore Service
**File:** `backend/services/dealerHealthScoreService.js`

**Functions:**
- `calculateHealthScore(dealerId)` - Calculate complete health score for a dealer
- `calculateVerificationScore(dealerId)` - Calculate verification score
- `calculateAccountAgeScore(dealerId)` - Calculate account age score
- `calculateTransactionScore(dealerId)` - Calculate transaction score
- `calculateEscrowScore(dealerId)` - Calculate escrow score
- `calculateReviewScore(dealerId)` - Calculate review score
- `calculateFraudScore(dealerId)` - Calculate fraud score
- `calculateResponseScore(dealerId)` - Calculate response score
- `calculateListingQualityScore(dealerId)` - Calculate listing quality score
- `calculateAuctionScore(dealerId)` - Calculate auction score
- `determineScoreCategory(score)` - Determine score category
- `recalculateAllScores()` - Recalculate all dealer scores
- `getTopDealers(limit, category)` - Get top dealers by score
- `getDealerRank(dealerId)` - Get dealer rank

#### 2.2 Create DealerHealthScore Scheduler
**File:** `backend/services/dealerHealthScoreScheduler.js`

**Functions:**
- `startScheduler()` - Start the health score calculation scheduler
- `calculateAllScores()` - Calculate scores for all dealers
- `calculateChangedScores()` - Calculate scores only for dealers with changes
- `updateScoreTrends()` - Update score trends

**Schedule:**
- Daily full recalculation at 2 AM
- Hourly incremental updates for changed dealers

### 3. Database Migrations

#### 3.1 Create Migration Script
**File:** `backend/migrations/migrate_dealer_health_score.js`

**Steps:**
1. Create DealerHealthScore collection
2. Calculate initial scores for all existing dealers
3. Add indexes
4. Backfill historical data

### 4. APIs

#### 4.1 Create DealerHealthScore Controller
**File:** `backend/controllers/dealerHealthScoreController.js`

**Endpoints:**
- `GET /api/dealer-health-score/:dealerId` - Get dealer health score
- `GET /api/dealer-health-score/:dealerId/details` - Get detailed score breakdown
- `GET /api/dealer-health-score/ranking` - Get dealer ranking
- `GET /api/dealer-health-score/top/:category` - Get top dealers by category
- `GET /api/dealer-health-score/trends/:dealerId` - Get score trends
- `POST /api/admin/dealer-health-score/recalculate/:dealerId` - Recalculate specific dealer score (admin)
- `POST /api/admin/dealer-health-score/recalculate-all` - Recalculate all scores (admin)
- `PUT /api/admin/dealer-health-score/:dealerId/override` - Override score (admin)

#### 4.2 Create DealerHealthScore Routes
**File:** `backend/routes/dealerHealthScoreRoutes.js`

**Routes:**
- Public routes for viewing scores
- Admin routes for managing scores

### 5. Admin Dashboard Widgets

#### 5.1 Create Admin Dashboard Components
**File:** `src/components/admin/DealerHealthScoreWidget.jsx`

**Components:**
- `DealerHealthScoreOverview` - Overview of all dealer scores
- `DealerHealthScoreDistribution` - Distribution chart
- `DealerHealthScoreTrends` - Score trends over time
- `DealerHealthScoreRankings` - Top and bottom dealers
- `DealerHealthScoreDetails` - Detailed score breakdown for specific dealer
- `DealerHealthScoreAlerts` - Alerts for score changes

### 6. Dealer Dashboard Widgets

#### 6.1 Create Dealer Dashboard Components
**File:** `src/components/dealer/HealthScoreWidget.jsx`

**Components:**
- `DealerHealthScoreBadge` - Display current score and category
- `DealerHealthScoreBreakdown` - Show score factor breakdown
- `DealerHealthScoreImprovement` - Suggestions for score improvement
- `DealerHealthScoreHistory` - Score history chart
- `DealerHealthScoreComparison` - Compare with industry average

### 7. Tests

#### 7.1 Create Test Suite
**File:** `backend/tests/dealerHealthScore.test.js`

**Tests:**
- Verification score calculation
- Account age score calculation
- Transaction score calculation
- Escrow score calculation
- Review score calculation
- Fraud score calculation
- Response score calculation
- Listing quality score calculation
- Auction score calculation
- Overall score calculation
- Score category determination
- Score trend calculation
- Edge cases and boundary conditions

---

## Database Schema Changes

### New Collections
1. **DealerHealthScore** - Store health score data

### No Schema Changes to Existing Collections
- Dealer model remains unchanged
- DealerVerification model remains unchanged
- Review model remains unchanged
- Transaction model remains unchanged
- Escrow model remains unchanged
- FraudDetection model remains unchanged
- Auction model remains unchanged
- Car model remains unchanged

---

## API Endpoints

### Public Endpoints
```
GET /api/dealer-health-score/:dealerId
GET /api/dealer-health-score/:dealerId/details
GET /api/dealer-health-score/ranking
GET /api/dealer-health-score/top/:category
GET /api/dealer-health-score/trends/:dealerId
```

### Admin Endpoints
```
POST /api/admin/dealer-health-score/recalculate/:dealerId
POST /api/admin/dealer-health-score/recalculate-all
PUT /api/admin/dealer-health-score/:dealerId/override
GET /api/admin/dealer-health-score/analytics
GET /api/admin/dealer-health-score/alerts
```

---

## Backwards Compatibility

### Preserved Functionality
- All existing dealer workflows remain unchanged
- Existing rating system continues to work
- Existing verification workflow remains unchanged
- No breaking changes to existing APIs

### New Functionality (Additive Only)
- New DealerHealthScore model (separate collection)
- New health score calculation service
- New health score scheduler
- New health score APIs (separate routes)
- New dashboard widgets (additive components)

### Migration Strategy
- Zero-downtime migration
- Backfill existing data
- Gradual rollout
- Feature flags for enabling/disabling

---

## Performance Considerations

### Caching Strategy
- Cache health scores in Redis with 1-hour TTL
- Cache ranking results with 15-minute TTL
- Cache top dealers with 30-minute TTL

### Batch Processing
- Process dealers in batches of 100
- Use MongoDB aggregation for efficient calculations
- Parallel processing where possible

### Index Optimization
- Index on dealer field (unique)
- Index on healthScore for ranking queries
- Index on scoreCategory for filtering
- Index on lastCalculatedAt for incremental updates

---

## Security Considerations

### Access Control
- Public endpoints for viewing scores
- Admin endpoints for managing scores
- Dealer endpoints for viewing own score
- Rate limiting on all endpoints

### Data Privacy
- No sensitive data in health score
- Aggregate data only
- No personal information exposure

### Audit Logging
- Log all score recalculations
- Log all admin overrides
- Log all score changes

---

## Monitoring and Alerting

### Metrics
- Health score calculation time
- Score distribution
- Score changes over time
- Calculation failures

### Alerts
- Alert on score drops > 20 points
- Alert on high-risk dealer creation
- Alert on calculation failures
- Alert on suspicious score patterns

---

## Success Metrics

### Platform Level
- Average dealer health score
- Score distribution across categories
- Score improvement over time
- High-risk dealer reduction

### Dealer Level
- Score improvement rate
- Category upgrade rate
- Score stability
- Response to score changes

### User Level
- Trust in platform (survey)
- Purchase confidence
- Dealer selection based on score
- Reduced fraud incidents

---

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- Create DealerHealthScore model
- Create health score service
- Create database migration
- Implement basic score calculation

### Phase 2: Integration (Week 2)
- Create health score scheduler
- Create health score APIs
- Integrate with existing systems
- Test score calculation

### Phase 3: Dashboard (Week 3)
- Create admin dashboard widgets
- Create dealer dashboard widgets
- Implement score display
- Test dashboard components

### Phase 4: Testing & Launch (Week 4)
- Comprehensive testing
- Performance optimization
- Security audit
- Gradual rollout

---

## Risk Mitigation

### Technical Risks
- **Calculation Errors:** Implement validation and testing
- **Performance Issues:** Implement caching and batch processing
- **Data Inconsistency:** Implement transactional updates

### Business Risks
- **Dealer Pushback:** Clear communication and transparency
- **Score Gaming:** Regular algorithm review and adjustment
- **False Positives:** Appeal process and manual review

### Operational Risks
- **Migration Issues:** Test migration thoroughly
- **Downtime:** Zero-downtime migration strategy
- **Support Load:** Prepare support team

---

## Next Steps

1. Review and approve architecture plan
2. Create DealerHealthScore model
3. Implement health score service
4. Create database migration
5. Implement health score scheduler
6. Create health score APIs
7. Create dashboard widgets
8. Test thoroughly
9. Deploy to production
10. Monitor and iterate

---

**Architecture Plan Completed:** June 15, 2026  
**Next Phase:** Implementation  
**Estimated Timeline:** 4 weeks
