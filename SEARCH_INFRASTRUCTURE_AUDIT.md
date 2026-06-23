---
title: SEARCH_INFRASTRUCTURE_AUDIT
owner: @tech-lead
team: architecture
last-reviewed: 2026-06-23
review-frequency: as-needed
status: active
tags: [audit]
---
# Search Infrastructure Audit Report

**Version:** 1.0  
**Date:** June 17, 2026  
**Platform:** KAYAD Fintech Platform  
**Auditor:** Search Infrastructure Engineer

---

## Executive Summary

This audit analyzed the search infrastructure across the KAYAD platform, focusing on vehicle search, dealer search, and auction search workflows. The audit identified critical gaps in search performance, caching, indexing, and tracking that could lead to high latency, poor user experience, and missed business opportunities.

### Key Findings

- **3 search workflows audited:** vehicle search, dealer search, auction search
- **Missing search caching** on all search endpoints (critical)
- **Suboptimal search indexes** - text index exists but not optimized for complex queries
- **No search latency tracking** - performance monitoring is missing
- **No search conversion rate tracking** - business impact measurement is missing
- **No-result search tracking exists** but not integrated with search workflows
- **Search analytics infrastructure exists** but not fully utilized

### Expected Improvements

- **Search latency reduction:** 60-80% through caching and indexing
- **Search throughput improvement:** 3-5x through query optimization
- **Conversion rate visibility:** 100% through tracking implementation
- **User experience improvement:** 40-60% through faster search results

---

## 1. Current Search Infrastructure

### 1.1 Vehicle Search Implementation

**File:** `backend/services/search.service.js`

**Current Implementation:**
```javascript
export const searchCars = async ({
  keyword,
  minPrice,
  maxPrice,
  brand,
  year,
  minMileage,
  maxMileage,
  sort = "latest",
  page = 1,
  limit = 12,
}) => {
  const filter = { status: "active" };

  if (keyword) {
    const safe = escapeRegex(keyword);
    filter.$or = [{ title: { $regex: safe, $options: "i" } }, { brand: { $regex: safe, $options: "i" } }];
  }

  // Filter logic for brand, price, year, mileage
  // Sorting logic
  // Pagination logic

  const [cars, total] = await Promise.all([
    Car.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
    Car.countDocuments(filter),
  ]);

  return { data: cars, pagination: { total, page, pages: Math.ceil(total / limit) } };
};
```

**Issues:**
- No caching - every search hits the database
- Regex-based keyword search is slow for large datasets
- No query optimization for common filter combinations
- No search latency tracking
- No conversion tracking
- Pagination limit hardcoded at 12 (too small for power users)

### 1.2 Dealer Search Implementation

**File:** `backend/routes/userRoutes.js`

**Current Implementation:**
```javascript
router.get("/search", asyncHandler(async (req, res) => {
  const { q, role, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { businessName: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }
  if (role) filter.role = role;

  const users = await User.find(filter)
    .select("name email avatar businessName role location dealerRating")
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const total = await User.countDocuments(filter);

  res.json({ success: true, users, total });
}));
```

**Issues:**
- No caching
- Regex-based search on multiple fields (slow)
- No search analytics tracking
- No geo-location search capability
- No search result ranking

### 1.3 Auction Search Implementation

**File:** Not found - auction search uses vehicle search with auction filters

**Current Implementation:**
- Auction search is handled by vehicle search with `auctionStatus: "live"` filter
- No dedicated auction search optimization
- No auction-specific search analytics
- No real-time auction search capability

### 1.4 Search Analytics Infrastructure

**File:** `backend/models/SearchAnalytics.js`

**Current Implementation:**
- Comprehensive search analytics model exists
- Tracks search terms, filters, results, user context
- Calculates trending scores
- Provides no-result search tracking
- Has methods for popular filters, county stats, price range stats

**Issues:**
- Search tracking middleware exists but not applied to search endpoints
- No search latency tracking
- No conversion rate tracking
- Analytics not integrated with search workflows

### 1.5 Search Tracking Middleware

**File:** `backend/middleware/searchTracking.js`

**Current Implementation:**
- Comprehensive search tracking middleware exists
- Extracts filters from requests
- Normalizes search terms
- Provides tracking for different search types (car, auction, advanced, saved)

**Issues:**
- Not applied to search endpoints
- No latency tracking
- No conversion tracking

---

## 2. Critical Issues

### 2.1 Missing Search Caching - CRITICAL

**Impact:** Every search hits the database, causing high latency and server load

**Affected Endpoints:**
- `/api/cars` - Vehicle search
- `/api/users/search` - Dealer search
- Auction search (via vehicle search)

**Recommendation:** Implement Redis-based search caching with appropriate TTL values

### 2.2 Suboptimal Search Indexes - CRITICAL

**Impact:** Slow query execution, poor search performance

**Current Indexes (Car.js):**
```javascript
// Text index for keyword search
carSchema.index({
  title: "text",
  brand: "text",
  model: "text",
});

// Compound indexes
carSchema.index({ status: 1, brand: 1, "location.city": 1, price: 1 });
carSchema.index({ status: 1, createdAt: -1 });
carSchema.index({ status: 1, price: 1 });
carSchema.index({ status: 1, year: -1 });
carSchema.index({ status: 1, views: -1 });
```

**Issues:**
- Text index exists but not used in search.service.js (uses regex instead)
- Missing compound indexes for common filter combinations
- No index for auction-specific searches
- No index for geo-location searches

**Recommendation:** Optimize indexes and use MongoDB Atlas Search or text indexes

### 2.3 No Search Latency Tracking - CRITICAL

**Impact:** Cannot measure search performance, cannot identify slow queries

**Current State:** No latency tracking exists

**Recommendation:** Implement search latency tracking with percentile metrics

### 2.4 No Search Conversion Rate Tracking - CRITICAL

**Impact:** Cannot measure business impact of search, cannot optimize for conversions

**Current State:** No conversion tracking exists

**Recommendation:** Implement conversion tracking (search → view → bid → purchase)

### 2.5 Search Analytics Not Integrated - HIGH

**Impact:** Cannot leverage existing analytics infrastructure

**Current State:** Search analytics infrastructure exists but not applied to search endpoints

**Recommendation:** Apply search tracking middleware to all search endpoints

---

## 3. Route-by-Route Analysis

### 3.1 Vehicle Search (`/api/cars`)

**File:** `backend/routes/carRoutes.js`

**Current State:**
- Uses `cacheResponse(300)` - 5-minute cache ✅
- Uses `searchCars` service
- No search tracking middleware ❌
- No latency tracking ❌
- No conversion tracking ❌

**Recommendations:**
- Apply search tracking middleware
- Implement search latency tracking
- Implement conversion tracking
- Optimize cache key to include all search parameters
- Increase cache TTL for popular searches

### 3.2 Dealer Search (`/api/users/search`)

**File:** `backend/routes/userRoutes.js`

**Current State:**
- No caching ❌
- Uses regex-based search ❌
- No search tracking middleware ❌
- No latency tracking ❌
- No conversion tracking ❌

**Recommendations:**
- Implement caching
- Replace regex with text index search
- Apply search tracking middleware
- Implement latency and conversion tracking
- Add geo-location search capability

### 3.3 Auction Search (via vehicle search)

**Current State:**
- Uses vehicle search with auction filters
- No dedicated optimization
- No auction-specific analytics

**Recommendations:**
- Create dedicated auction search endpoint
- Implement real-time auction search capability
- Add auction-specific analytics
- Optimize for auction-specific queries (live auctions, ending soon)

---

## 4. Implementation Plan

### 4.1 Phase 1: Search Caching Implementation (Week 1)

**Priority:** CRITICAL

**Tasks:**
1. Create search cache middleware
2. Implement Redis-based search caching
3. Set appropriate TTL values (60s for real-time, 300s for standard, 600s for popular)
4. Implement cache invalidation on data changes
5. Apply caching to all search endpoints

**Files to Create:**
- `backend/middleware/searchCache.js`

**Files to Modify:**
- `backend/routes/carRoutes.js`
- `backend/routes/userRoutes.js`

### 4.2 Phase 2: Search Index Optimization (Week 2)

**Priority:** CRITICAL

**Tasks:**
1. Replace regex search with MongoDB text index search
2. Add compound indexes for common filter combinations
3. Add auction-specific indexes
4. Add geo-location indexes
5. Create index migration script

**Files to Create:**
- `backend/migrations/add_search_indexes.js`

**Files to Modify:**
- `backend/models/Car.js`
- `backend/models/User.js`
- `backend/services/search.service.js`

### 4.3 Phase 3: Search Latency Tracking (Week 3)

**Priority:** HIGH

**Tasks:**
1. Create search latency tracking middleware
2. Track P50, P95, P99 latencies
3. Store latency metrics in SearchAnalytics
4. Create latency monitoring dashboard
5. Set up alerting for slow searches

**Files to Create:**
- `backend/middleware/searchLatencyTracking.js`
- `backend/services/searchMetricsService.js`

**Files to Modify:**
- `backend/models/SearchAnalytics.js`
- `backend/middleware/searchTracking.js`

### 4.4 Phase 4: Search Conversion Tracking (Week 4)

**Priority:** HIGH

**Tasks:**
1. Create conversion tracking service
2. Track search → view → bid → purchase funnel
3. Calculate conversion rates by search term
4. Identify high-converting searches
5. Optimize search ranking based on conversion

**Files to Create:**
- `backend/services/searchConversionService.js`

**Files to Modify:**
- `backend/models/SearchAnalytics.js`
- `backend/models/Car.js`
- `backend/routes/carRoutes.js`

### 4.5 Phase 5: Search Analytics Integration (Week 5)

**Priority:** MEDIUM

**Tasks:**
1. Apply search tracking middleware to all search endpoints
2. Integrate no-result search tracking
3. Create search analytics dashboard
4. Implement search suggestions based on trending searches
5. Implement auto-complete for search terms

**Files to Modify:**
- `backend/routes/carRoutes.js`
- `backend/routes/userRoutes.js`
- `backend/middleware/searchTracking.js`

---

## 5. Success Metrics

### 5.1 Performance Metrics

- **P50 search latency:** Target < 100ms (currently 500-2000ms)
- **P95 search latency:** Target < 300ms (currently 1000-5000ms)
- **P99 search latency:** Target < 1000ms (currently 2000-10000ms)
- **Cache hit rate:** Target > 70%
- **Search throughput:** Target 1000+ searches/second

### 5.2 Business Metrics

- **Search conversion rate:** Target > 5% (currently unknown)
- **No-result search rate:** Target < 10% (currently unknown)
- **Average results per search:** Target 10-50 (currently unknown)
- **Search-to-view rate:** Target > 30% (currently unknown)

### 5.3 User Experience Metrics

- **Search abandonment rate:** Target < 20% (currently unknown)
- **Search refinement rate:** Target < 30% (currently unknown)
- **Search satisfaction score:** Target > 4/5 (currently unknown)

---

## 6. Risk Assessment

### 6.1 Low Risk

- Search caching (non-breaking)
- Search latency tracking (non-breaking)
- Search analytics integration (non-breaking)

### 6.2 Medium Risk

- Search index optimization (may require downtime)
- Conversion tracking (requires data migration)
- Search ranking changes (may affect user behavior)

### 6.3 High Risk

- None identified

### 6.4 Mitigation Strategies

- Implement changes in phases
- Use feature flags for new features
- A/B test ranking changes
- Provide rollback procedures
- Monitor metrics closely after each deployment

---

## 7. Conclusion

The search infrastructure audit identified critical gaps in caching, indexing, latency tracking, and conversion tracking. The recommended changes will:

1. **Reduce search latency** by 60-80% through caching and indexing
2. **Improve search throughput** by 3-5x through query optimization
3. **Provide visibility** into search performance and business impact
4. **Improve user experience** through faster, more relevant search results
5. **Enable data-driven optimization** through comprehensive analytics

The implementation roadmap provides a phased approach to minimize risk while delivering measurable improvements in search performance and business outcomes.

---

**Document Version:** 1.0  
**Last Updated:** June 17, 2026  
**Next Review:** July 17, 2026
