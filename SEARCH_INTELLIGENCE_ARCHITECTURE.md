# Search Intelligence Architecture Plan

**Date:** June 15, 2026  
**Architect:** Search Platform Architect  
**Project:** KAYAD Search Intelligence  
**Version:** 1.0.0

---

## Executive Summary

The Search Intelligence system provides comprehensive analytics and insights into user search behavior, enabling data-driven inventory decisions and improved user experience. It tracks search terms, frequency, filter usage, and identifies gaps between search demand and available inventory. The system generates actionable insights for both administrators and dealers.

**Key Objectives:**
- Track and analyze user search behavior
- Identify trending searches and popular filters
- Detect gaps between search demand and inventory
- Provide actionable insights for inventory acquisition
- Enable data-driven pricing and marketing decisions

---

## Audit Findings

### SavedSearch Model
**Model:** SavedSearch.js
- Stores user's saved search filters
- Tracks user, name, filters, notification preferences
- No search analytics or tracking
- No search frequency data
- No result count tracking

**Integration Points:**
- Can be extended to track search frequency
- Can be used to identify popular search patterns
- Filters field contains search criteria (brand, model, price range, location)

### Car Search Routes
**Routes:** carRoutes.js, carController.js
- Car listing search with filters
- Filter parameters: brand, model, year, price range, location, body type, fuel type
- No search analytics tracking
- No search result count tracking
- No no-result search tracking

**Integration Points:**
- Add search tracking middleware to car search endpoints
- Track search parameters and result counts
- Identify searches with zero results
- Track filter usage patterns

---

## Architecture Design

### Metrics Tracked

| Metric | Description | Data Source |
|--------|-------------|-------------|
| Search Terms | Individual search queries | Search parameters |
| Search Frequency | How often searches are performed | Search logs |
| No-Result Searches | Searches with zero results | Search result counts |
| Filter Usage | Which filters are used most | Search parameters |
| County Searches | Searches by location/county | Location filter |
| Price Range Searches | Searches by price range | Price filter |
| Brand/Model Searches | Searches by brand and model | Brand/model filters |

### Data Model

#### SearchAnalytics Model
```javascript
{
  // =============================
  // 🔍 SEARCH INFO
  // =============================
  searchTerm: {
    type: String,
    index: true,
  },
  
  normalizedTerm: {
    type: String,
    index: true,
  },
  
  // =============================
  // 📊 FILTERS USED
  // =============================
  filters: {
    brand: String,
    model: String,
    year: { min: Number, max: Number },
    price: { min: Number, max: Number },
    location: String,
    county: String,
    bodyType: String,
    fuelType: String,
    transmission: String,
    mileage: { max: Number },
  },
  
  // =============================
  // 📈 RESULTS
  // =============================
  resultCount: {
    type: Number,
    default: 0,
  },
  
  hasResults: {
    type: Boolean,
    default: false,
  },
  
  // =============================
  // 👤 USER CONTEXT
  // =============================
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  
  userRole: {
    type: String,
    enum: ["admin", "dealer", "buyer", "superadmin"],
  },
  
  // =============================
  // 🌍 LOCATION CONTEXT
  // =============================
  ipAddress: String,
  userAgent: String,
  
  // =============================
  // 📋 METADATA
  // =============================
  searchType: {
    type: String,
    enum: ["quick_search", "advanced_search", "saved_search"],
    default: "quick_search",
  },
  
  category: {
    type: String,
    enum: ["auctions", "listings", "all"],
    default: "all",
  },
  
  // =============================
  // 📊 AGGREGATION DATA
  // =============================
  searchCount: {
    type: Number,
    default: 1,
  },
  
  lastSearchedAt: {
    type: Date,
    default: Date.now,
  },
  
  trendingScore: {
    type: Number,
    default: 0,
  },
  
  timestamps: true,
}
```

---

## File-by-File Implementation Plan

### 1. Database Models

#### 1.1 Create SearchAnalytics Model
**File:** `backend/models/SearchAnalytics.js`

**Schema:** As defined above

**Indexes:**
- searchTerm, normalizedTerm (composite)
- userId
- filters.brand
- filters.county
- searchCount (for trending)
- lastSearchedAt (for time-based queries)

**Methods:**
- `incrementCount()` - Increment search count
- `updateResultCount(count)` - Update result count
- `calculateTrendingScore()` - Calculate trending score
- `isNoResultSearch()` - Check if search has no results

### 2. Services

#### 2.1 Create SearchInsights Service
**File:** `backend/services/searchInsightsService.js`

**Functions:**
- `trackSearch(searchData)` - Track a search event
- `getTrendingSearches(limit, period)` - Get trending searches
- `getNoResultSearches(limit, period)` - Get searches with no results
- `getPopularFilters(period)` - Get most used filters
- `getCountySearchStats(period)` - Get search statistics by county
- `getPriceRangeSearchStats(period)` - Get price range search statistics
- `getBrandModelSearchStats(period)` - Get brand/model search statistics
- `getMissingInventoryReport()` - Generate missing inventory report
- `getSearchDemandReport(period)` - Generate search demand report
- `getSearchInsights(period)` - Get comprehensive search insights

### 3. Middleware

#### 3.1 Create Search Tracking Middleware
**File:** `backend/middleware/searchTracking.js`

**Functions:**
- `trackSearch()` - Express middleware to track searches
- `extractSearchFilters(req)` - Extract search filters from request
- `normalizeSearchTerm(term)` - Normalize search term
- `calculateSearchHash(filters)` - Calculate hash for search identification

### 4. Controllers

#### 4.1 Create SearchAnalytics Controller
**File:** `backend/controllers/searchAnalyticsController.js`

**Endpoints:**
- `GET /api/search-analytics/trending` - Get trending searches
- `GET /api/search-analytics/no-results` - Get no-result searches
- `GET /api/search-analytics/filters` - Get popular filters
- `GET /api/search-analytics/counties` - Get county search stats
- `GET /api/search-analytics/price-ranges` - Get price range stats
- `GET /api/search-analytics/brands` - Get brand/model stats
- `GET /api/search-analytics/missing-inventory` - Get missing inventory report
- `GET /api/search-analytics/demand-report` - Get search demand report
- `GET /api/search-analytics/insights` - Get comprehensive insights

### 5. Routes

#### 5.1 Create SearchAnalytics Routes
**File:** `backend/routes/searchAnalyticsRoutes.js`

**Routes:**
- Public routes for basic analytics
- Admin routes for detailed analytics
- Dealer routes for demand reports

### 6. Database Migrations

#### 6.1 Create Migration Script
**File:** `backend/migrations/migrate_search_analytics.js`

**Steps:**
1. Create SearchAnalytics collection
2. Add indexes
3. Backfill historical search data from SavedSearch
4. Aggregate existing search patterns

### 7. Dashboard Components

#### 7.1 Create Admin Search Dashboard
**File:** `src/components/admin/SearchAnalyticsDashboard.jsx`

**Components:**
- `TrendingSearches` - Display trending search terms
- `NoResultSearches` - Display searches with no results
- `PopularFilters` - Display most used filters
- `CountyHeatmap` - Display search distribution by county
- `PriceRangeDistribution` - Display price range search distribution
- `MissingInventoryReport` - Display gaps between demand and inventory

#### 7.2 Create Dealer Search Demand Dashboard
**File:** `src/components/dealer/SearchDemandDashboard.jsx`

**Components:**
- `DemandByBrand` - Display demand by brand
- `DemandByModel` - Display demand by model
- `DemandByPriceRange` - Display demand by price range
- `DemandByLocation` - Display demand by location
- `InventoryRecommendations` - Suggest inventory based on demand
- `PricingInsights` - Suggest pricing based on search patterns

---

## Migration Strategy

### Phase 1: Foundation (Week 1)
- Create SearchAnalytics model
- Create search tracking middleware
- Create search insights service
- Integrate tracking into existing search endpoints

### Phase 2: Analytics & Insights (Week 2)
- Implement analytics calculation functions
- Create search analytics APIs
- Test tracking functionality
- Validate data collection

### Phase 3: Dashboards (Week 3)
- Create admin search dashboard
- Create dealer search demand dashboard
- Implement trending searches
- Implement missing inventory reports

### Phase 4: Rollout (Week 4)
- Deploy tracking to production
- Monitor data collection
- Validate insights accuracy
- Train users on dashboards

---

## Backwards Compatibility Strategy

### Default Behavior
- All existing search functionality remains unchanged
- Search tracking is additive (non-blocking)
- No performance impact on existing searches
- No changes to search API responses

### Migration Path
1. **Phase 1:** Deploy search tracking without changing search behavior
2. **Phase 2:** Add tracking middleware to search endpoints
3. **Phase 3:** Enable analytics dashboards
4. **Phase 4:** Use insights for inventory decisions

### Rollback Plan
- If tracking fails, disable middleware via environment variable
- Emergency disable of tracking system
- Database rollback to remove tracking data
- Revert middleware changes

---

## Performance Considerations

### Caching Strategy
- Cache trending searches with 5-minute TTL
- Cache popular filters with 15-minute TTL
- Cache county stats with 30-minute TTL
- Use Redis for distributed caching

### Batch Processing
- Batch search tracking writes
- Aggregate analytics in background jobs
- Use MongoDB aggregation for calculations
- Parallel processing where possible

### Index Optimization
- Index on searchTerm, normalizedTerm
- Index on filters fields
- Index on searchCount for trending
- Compound indexes for common filter combinations

---

## Security Considerations

### Data Privacy
- Anonymize search data where possible
- No personal information in search logs
- Aggregate data for dashboards
- Role-based access to analytics

### Access Control
- Admin-only access to detailed analytics
- Dealer access to demand reports
- Public access to trending searches
- Rate limiting on analytics endpoints

### Audit Logging
- Log search tracking events
- Log analytics access
- Log data exports
- Log configuration changes

---

## Testing Strategy

### Unit Tests
- Test search analytics model validation
- Test search tracking middleware
- Test insights calculation functions
- Test trending score calculation

### Integration Tests
- Test tracking integration with search endpoints
- Test analytics API endpoints
- Test cache invalidation
- Test aggregation queries

### E2E Tests
- Test search tracking in real scenarios
- Test dashboard functionality
- Test report generation
- Test data accuracy

---

## Success Metrics

### Platform Level
- Search tracking success rate > 99.9%
- Analytics calculation latency < 5s
- Cache hit rate > 90%
- Zero impact on search performance

### Business Level
- Inventory gap identification accuracy > 80%
- Trending search prediction accuracy > 70%
- Dealer satisfaction with insights > 85%
- Search-to-purchase conversion improvement > 10%

---

## Next Steps

1. Review and approve architecture plan
2. Create SearchAnalytics model
3. Create search tracking middleware
4. Create search insights service
5. Integrate tracking into search endpoints
6. Create analytics APIs
7. Create admin dashboard
8. Create dealer dashboard
9. Test thoroughly
10. Deploy to production
11. Monitor and iterate

---

**Architecture Plan Completed:** June 15, 2026  
**Next Phase:** Implementation  
**Estimated Timeline:** 4 weeks
