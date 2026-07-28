---
title: SEARCH_INTELLIGENCE
owner: @tech-lead
team: all
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [general]
---
# Marketplace Search Intelligence

## Overview

This document outlines the upgraded marketplace search intelligence for the KAYAD platform, including typo tolerance, synonym matching, relevance tuning, dealer ranking, behavioral ranking, click-through optimization, and recommendation engine feedback loops.

## Features Implemented

### 1. Typo Tolerance (Fuzzy Search)
- **Implementation**: Levenshtein distance algorithm
- **Service**: `backend/services/searchIntelligenceService.js`
- **Features**:
  - Fuzzy matching with configurable max distance (default: 2)
  - Handles typos in brand, model, and title
  - Returns similarity score (0-1)
  - Integrated with relevance scoring

### 2. Synonym Matching
- **Implementation**: Synonym dictionary with term expansion
- **Service**: `backend/services/searchIntelligenceService.js`
- **Features**:
  - Pre-defined synonyms for common car terms
  - Query expansion with synonyms
  - Brand synonyms (e.g., Mercedes → Benz, Mercedes-Benz)
  - Body type synonyms (e.g., SUV → Sport Utility Vehicle, 4x4)
  - Transmission synonyms (e.g., Automatic → Auto, Self-shifting)

### 3. Relevance Tuning
- **Implementation**: Weighted relevance scoring
- **Service**: `backend/services/searchIntelligenceService.js`
- **Weights**:
  - Title match: 10 points
  - Brand match: 8 points
  - Model match: 7 points
  - Location match: 5 points
  - Price match: 4 points
  - Year match: 3 points
  - Dealer rank: 6 points
  - Behavior score: 5 points
  - Click-through rate: 4 points

### 4. Dealer Ranking
- **Implementation**: Dealer quality score calculation
- **Service**: `backend/services/searchIntelligenceService.js`
- **Factors**:
  - Verification status (3 points)
  - Bank-owned status (2 points)
  - Trust score (0.5 multiplier)
  - Health score (0.3 multiplier)
  - Listing quality score (0.2 multiplier)
  - Maximum score: 10 points

### 5. Behavioral Ranking
- **Implementation**: User interaction tracking
- **Service**: `backend/services/searchIntelligenceService.js`
- **Factors**:
  - View count (0.1 per view, max 2 points)
  - Click count (0.2 per click, max 3 points)
  - Favorite count (0.3 per favorite, max 3 points)
  - Inquiry count (0.5 per inquiry, max 2 points)
  - Maximum score: 10 points

### 6. Click-Through Optimization
- **Implementation**: CTR calculation and ranking
- **Service**: `backend/services/searchIntelligenceService.js`
- **Features**:
  - Impression tracking
  - Click tracking
  - CTR calculation (clicks / impressions)
  - CTR-weighted ranking
  - Real-time CTR updates

### 7. Recommendation Engine Feedback Loops
- **Implementation**: Feedback recording and weight adjustment
- **Service**: `backend/services/searchIntelligenceService.js`
- **Features**:
  - Action tracking (view, click, favorite, inquiry)
  - User-specific behavioral scoring
  - Relevance weight optimization based on feedback
  - ML-ready architecture for future enhancements

## Search Analytics Dashboards

### Dashboard Metrics
- **Total Searches**: Number of searches in time range
- **Average Results per Search**: Mean result count
- **Zero Results Rate**: Percentage of searches with no results
- **Top Queries**: Most frequent search queries
- **Zero Results Queries**: Queries returning no results
- **Daily Trends**: Search volume over time

### Dashboard Endpoints
- `GET /api/search-intelligence/dashboard` - Full dashboard data
- `GET /api/search-intelligence/metrics` - Search metrics summary
- `GET /api/search-intelligence/weights` - Current relevance weights
- `PUT /api/search-intelligence/weights` - Update relevance weights
- `GET /api/search-intelligence/synonyms` - Current synonyms
- `POST /api/search-intelligence/synonyms` - Add new synonyms

### Time Ranges
- `1d` - Last 24 hours
- `7d` - Last 7 days (default)
- `30d` - Last 30 days
- `90d` - Last 90 days

## API Endpoints

### Intelligent Search
```javascript
POST /api/search-intelligence/search
{
  "query": "Toyota SUV",
  "filters": {
    "brand": "Toyota",
    "bodyType": "SUV",
    "priceMin": 500000,
    "priceMax": 2000000,
    "yearMin": 2015,
    "yearMax": 2023
  },
  "options": {
    "page": 1,
    "limit": 20,
    "sortBy": "relevance"
  }
}
```

### Search Feedback
```javascript
POST /api/search-intelligence/feedback
{
  "carId": "car_id",
  "action": "click" // view, click, favorite, inquiry
}
```

### Search Analytics
```javascript
GET /api/search-intelligence/metrics?timeRange=7d
```

## Sorting Options

- `relevance` - Overall relevance score (default)
- `price_asc` - Price ascending
- `price_desc` - Price descending
- `year_desc` - Year descending (newest first)
- `mileage_asc` - Mileage ascending (lowest first)
- `dealer_rank` - Dealer ranking score
- `behavior` - Behavioral score
- `ctr` - Click-through rate

## Synonym Dictionary

### Car Types
- SUV → sport utility vehicle, 4x4, jeep
- Sedan → saloon, family car
- Hatchback → hatch, 5-door
- Pickup → truck, bakkie, lorry
- Van → mpv, minivan, people carrier
- Convertible → cabriolet, soft top, drop top
- Coupe → 2-door, sports car

### Transmissions
- Automatic → auto, self-shifting
- Manual → stick shift, standard

### Fuel Types
- Petrol → gasoline, gas
- Diesel → diesel
- Electric → ev, electric vehicle, hybrid

### Brands
- Toyota → toyota, lexus
- Nissan → nissan, infiniti
- Honda → honda, acura
- Mercedes → mercedes, benz, mercedes-benz
- BMW → bmw, bimmer, beamer
- Volkswagen → vw, volkswagen
- Chevrolet → chevy, chevrolet

## Performance Considerations

### Caching
- Dealer rank scores cached (TTL: 5 minutes)
- Behavioral scores cached (TTL: 1 minute)
- CTR scores cached (TTL: 5 minutes)
- Synonym dictionary in-memory

### Optimization
- Pre-fetch dealer data for ranking
- Batch score calculations
- Limit result set before ranking
- Use MongoDB text index for initial search
- Pagination to limit ranking overhead

### Monitoring
- Search latency tracking
- Zero result query monitoring
- CTR tracking
- Feedback loop effectiveness

## Future Enhancements

### Machine Learning
- Learn relevance weights from user behavior
- Personalized ranking based on user history
- Query intent classification
- Auto-suggest with ML
- Image-based search

### Advanced Features
- Voice search
- Natural language queries
- Multi-modal search (text + image)
- Real-time search suggestions
- Search result clustering

### Analytics
- Search funnel analysis
- User journey mapping
- A/B testing for ranking algorithms
- Search performance monitoring
- ROI tracking for search improvements

## Integration

### Existing Search Service
- Current `search.service.js` uses MongoDB text index
- New `searchIntelligenceService.js` adds intelligence layer
- Can be used alongside or as replacement
- Gradual migration recommended

### Search Analytics
- Integrates with existing `SearchAnalytics` model
- Extends with behavioral tracking
- Compatible with existing dashboards
- Additional metrics available

## Testing

### Unit Tests
- Fuzzy match accuracy
- Synonym expansion
- Relevance scoring
- Dealer ranking calculation
- Behavioral scoring
- CTR calculation

### Integration Tests
- End-to-end search flow
- Feedback loop
- Dashboard data accuracy
- Performance under load

### A/B Testing
- Compare old vs new search
- Measure CTR improvement
- Measure conversion rate
- Measure user satisfaction

## References

- [MongoDB Text Search](https://www.mongodb.com/docs/manual/text-search/)
- [Levenshtein Distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Search Ranking Algorithms](https://www.elastic.co/guide/en/elasticsearch/reference/current/relevance-intro.html)
- [Learning to Rank](https://en.wikipedia.org/wiki/Learning_to_rank)
