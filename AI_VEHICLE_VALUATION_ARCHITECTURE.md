# AI Vehicle Valuation Architecture Plan

**Date:** June 15, 2026  
**Architect:** Automotive AI Platform Architect  
**Project:** KAYAD AI Vehicle Valuation System  
**Version:** 1.0.0

---

## Executive Summary

The AI Vehicle Valuation system provides intelligent vehicle pricing predictions based on historical data, market trends, and real-time demand signals. This architecture establishes the platform foundation for future ML model integration without building the actual ML models yet.

**Key Objectives:**
- Collect and structure historical pricing data from multiple sources
- Track market demand signals from search analytics
- Build comprehensive feature engineering pipeline
- Create training data architecture for future ML models
- Design prediction API architecture for real-time valuations
- Track county-level pricing variations
- Monitor brand depreciation patterns
- Analyze mileage effects on pricing

---

## Audit Findings

### Current Vehicle Listings System
**Model:** Car.js
- Comprehensive vehicle data: brand, model, year, price, mileage, condition
- Location data: city, coordinates
- Vehicle specs: fuel, transmission, bodyType, color
- Dealer information and pricing
- **Gap:** No historical price tracking
- **Gap:** No valuation history
- **Gap:** No market demand correlation

### Current Historical Sales System
**Model:** Transaction.js, Payment.js
- Transaction records with amounts
- Payment processing data
- **Gap:** No structured sales history
- **Gap:** No sale price vs listing price tracking
- **Gap:** No time-to-sale metrics
- **Gap:** No vehicle-specific sales data

### Current Auction Results System
**Model:** Auction.js
- Auction bids and final sale prices
- Bid history and timing
- **Gap:** No auction price analysis
- **Gap:** No auction vs market price comparison
- **Gap:** No bid intensity metrics

### Current Escrow Transactions System
**Model:** Escrow.js
- Escrow transactions with amounts
- Transaction timeline and status
- **Gap:** No escrow price analysis
- **Gap:** No escrow vs listing price tracking
- **Gap:** No transaction value metrics

### Current Search Demand System
**Model:** SearchAnalytics.js
- Search terms and filters
- Result counts and user behavior
- County-level search data
- **Gap:** No demand-to-price correlation
- **Gap:** No search volume impact on pricing
- **Gap:** No trending demand signals

---

## Architecture Design

### Data Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                              │
├─────────────────────────────────────────────────────────────┤
│  Vehicle Listings  │  Auction Results  │  Escrow Sales     │
│  (Car.js)          │  (Auction.js)     │  (Escrow.js)      │
│                    │                   │                   │
│  Search Analytics  │  Transactions     │  External APIs    │
│  (SearchAnalytics) │  (Transaction.js) │  (KRA, etc.)      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              DATA INGESTION PIPELINE                          │
├─────────────────────────────────────────────────────────────┤
│  • Real-time listing price capture                          │
│  • Auction result ingestion                                  │
│  • Escrow transaction capture                                │
│  • Search demand aggregation                                │
│  • External data integration                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            FEATURE ENGINEERING PIPELINE                       │
├─────────────────────────────────────────────────────────────┤
│  • Vehicle Features: brand, model, year, mileage, condition  │
│  • Location Features: county, city, coordinates              │
│  • Time Features: seasonality, market trends                 │
│  • Demand Features: search volume, competition               │
│  • Historical Features: price history, depreciation           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              VALUATION DATA STORAGE                          │
├─────────────────────────────────────────────────────────────┤
│  VehicleValuation (historical prices)                        │
│  MarketPricing (county-level pricing)                        │
│  BrandDepreciation (brand-specific trends)                   │
│  MileageImpact (mileage effects)                            │
│  DemandSignals (market demand metrics)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            TRAINING DATA ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│  • Feature Store (structured features)                       │
│  • Label Store (actual sale prices)                         │
│  • Training Dataset (feature-label pairs)                    │
│  • Validation Dataset (model validation)                    │
│  • Test Dataset (model evaluation)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            PREDICTION API ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│  • Valuation Request API                                     │
│  • Feature Extraction Service                                │
│  • Model Inference Service (future)                          │
│  • Confidence Calculation                                   │
│  • Price Range Prediction                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### VehicleValuation Model
```javascript
{
  // =============================
  // 🔗 VEHICLE REFERENCE
  // =============================
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Car",
    index: true,
  },

  // =============================
  // 🚗 VEHICLE FEATURES
  // =============================
  vehicle: {
    brand: String,
    model: String,
    year: Number,
    bodyType: String,
    fuelType: String,
    transmission: String,
    color: String,
    condition: String,
  },

  // =============================
  // 📍 LOCATION
  // =============================
  location: {
    city: String,
    county: String,
    coordinates: {
      type: { type: String },
      coordinates: [Number],
    },
  },

  // =============================
  // 💰 PRICING DATA
  // =============================
  pricing: {
    listingPrice: Number,
    salePrice: Number,
    auctionPrice: Number,
    escrowPrice: Number,
    priceDifference: Number,
    priceChangePercent: Number,
  },

  // =============================
  // 📊 VALUATION METRICS
  // =============================
  valuation: {
    estimatedValue: Number,
    confidence: Number,
    priceRange: {
      low: Number,
      high: Number,
    },
    marketPosition: {
      type: String, // "below_market", "fair_market", "above_market"
      percent: Number,
    },
  },

  // =============================
  // 📈 HISTORICAL DATA
  // =============================
  historical: {
    previousPrices: [{
      price: Number,
      date: Date,
      source: String, // "listing", "auction", "escrow"
    }],
    priceHistory: [{
      date: Date,
      price: Number,
      source: String,
    }],
  },

  // =============================
  // 📊 MARKET DATA
  // =============================
  market: {
    demandScore: Number,
    competitionLevel: Number,
    daysOnMarket: Number,
    viewCount: Number,
    inquiryCount: Number,
  },

  // =============================
  // 🔍 SOURCE
  // =============================
  source: {
    type: String,
    enum: ["listing", "auction", "escrow", "external"],
  },

  // =============================
  // 📅 TIMESTAMPS
  // =============================
  valuationDate: Date,
  saleDate: Date,

  timestamps: true,
}
```

### MarketPricing Model
```javascript
{
  // =============================
  // 📍 LOCATION
  // =============================
  county: {
    type: String,
    required: true,
    index: true,
  },

  // =============================
  // 🚗 VEHICLE CATEGORY
  // =============================
  vehicle: {
    brand: String,
    bodyType: String,
    fuelType: String,
  },

  // =============================
  // 💰 PRICING DATA
  // =============================
  pricing: {
    averagePrice: Number,
    medianPrice: Number,
    priceRange: {
      low: Number,
      high: Number,
    },
    pricePerMile: Number,
  },

  // =============================
  // 📊 MARKET METRICS
  // =============================
  metrics: {
    totalListings: Number,
    totalSales: Number,
    averageDaysOnMarket: Number,
    demandScore: Number,
  },

  // =============================
  // 📅 TIME PERIOD
  // =============================
  period: {
    startDate: Date,
    endDate: Date,
  },

  // =============================
  // 📊 TREND DATA
  // =============================
  trend: {
    direction: String, // "increasing", "decreasing", "stable"
    percentChange: Number,
  },

  timestamps: true,
}
```

### BrandDepreciation Model
```javascript
{
  // =============================
  // 🚗 BRAND
  // =============================
  brand: {
    type: String,
    required: true,
    index: true,
  },

  // =============================
  // 📊 DEPRECIATION DATA
  // =============================
  depreciation: {
    annualRate: Number,
    fiveYearRate: Number,
    tenYearRate: Number,
    resaleValue: {
      after1Year: Number,
      after3Years: Number,
      after5Years: Number,
      after10Years: Number,
    },
  },

  // =============================
  // 📈 MARKET POSITION
  // =============================
  market: {
    reliabilityScore: Number,
    popularityScore: Number,
    maintenanceCost: Number,
  },

  // =============================
  // 📊 HISTORICAL DATA
  // =============================
  historical: [{
    year: Number,
    averagePrice: Number,
    depreciationRate: Number,
  }],

  timestamps: true,
}
```

### MileageImpact Model
```javascript
{
  // =============================
  // 🚗 VEHICLE TYPE
  // =============================
  vehicle: {
    brand: String,
    bodyType: String,
    fuelType: String,
  },

  // =============================
  // 📊 MILEAGE RANGES
  // =============================
  mileageRanges: [{
    minMileage: Number,
    maxMileage: Number,
    averagePrice: Number,
    pricePerMile: Number,
    depreciationFactor: Number,
  }],

  // =============================
  // 💰 IMPACT METRICS
  // =============================
  impact: {
    pricePer1000Miles: Number,
    criticalMileage: Number,
    severeDepreciationThreshold: Number,
  },

  timestamps: true,
}
```

### DemandSignals Model
```javascript
{
  // =============================
  // 🔍 SEARCH DATA
  // =============================
  search: {
    searchTerm: String,
    normalizedTerm: String,
    filters: {
      brand: String,
      model: String,
      year: { min: Number, max: Number },
      price: { min: Number, max: Number },
      location: String,
      county: String,
      bodyType: String,
    },
  },

  // =============================
  // 📊 DEMAND METRICS
  // =============================
  demand: {
    searchVolume: Number,
    trend: String, // "increasing", "decreasing", "stable"
    trendPercent: Number,
    competitionLevel: Number,
    urgencyScore: Number,
  },

  // =============================
  // 💰 PRICE IMPACT
  // =============================
  priceImpact: {
    averagePrice: Number,
    pricePremium: Number,
    priceDiscount: Number,
    demandMultiplier: Number,
  },

  // =============================
  // 📅 TIME PERIOD
  // =============================
  period: {
    startDate: Date,
    endDate: Date,
  },

  timestamps: true,
}
```

---

## File-by-File Implementation Plan

### 1. Database Models

#### 1.1 Create VehicleValuation Model
**File:** `backend/models/VehicleValuation.js`

**Schema:** As defined above

**Indexes:**
- car
- county
- brand, model, year
- valuationDate
- source

**Methods:**
- `calculatePriceDifference()` - Calculate price difference
- `updateMarketPosition()` - Update market position
- `addHistoricalPrice()` - Add historical price
- `calculateConfidence()` - Calculate confidence score

#### 1.2 Create MarketPricing Model
**File:** `backend/models/MarketPricing.js`

**Schema:** As defined above

**Indexes:**
- county
- brand, bodyType
- period

**Methods:**
- `calculateAveragePrice()` - Calculate average price
- `calculatePriceRange()` - Calculate price range
- `updateTrend()` - Update trend data
- `getMarketPosition()` - Get market position

#### 1.3 Create BrandDepreciation Model
**File:** `backend/models/BrandDepreciation.js`

**Schema:** As defined above

**Indexes:**
- brand
- market.reliabilityScore

**Methods:**
- `calculateDepreciationRate()` - Calculate depreciation rate
- `predictResaleValue()` - Predict resale value
- `updateHistoricalData()` - Update historical data

#### 1.4 Create MileageImpact Model
**File:** `backend/models/MileageImpact.js`

**Schema:** As defined above

**Indexes:**
- brand, bodyType
- fuelType

**Methods:**
- `calculateMileageImpact()` - Calculate mileage impact
- `getPricePerMile()` - Get price per mile
- `predictMileageDepreciation()` - Predict mileage depreciation

#### 1.5 Create DemandSignals Model
**File:** `backend/models/DemandSignals.js`

**Schema:** As defined above

**Indexes:**
- searchTerm
- county
- period

**Methods:**
- `calculateDemandScore()` - Calculate demand score
- `updateTrend()` - Update trend data
- `calculatePriceImpact()` - Calculate price impact

### 2. Services

#### 2.1 Create Valuation Service
**File:** `backend/services/vehicleValuationService.js`

**Functions:**
- `captureListingPrice(carId, price)` - Capture listing price
- `captureAuctionPrice(auctionId, price)` - Capture auction price
- `captureEscrowPrice(escrowId, price)` - Capture escrow price
- `calculateVehicleValue(carId)` - Calculate vehicle value
- `getHistoricalPrices(carId)` - Get historical prices
- `getMarketPosition(carId)` - Get market position
- `updateValuation(carId)` - Update valuation

#### 2.2 Create Market Pricing Service
**File:** `backend/services/marketPricingService.js`

**Functions:**
- `calculateCountyPricing(county)` - Calculate county pricing
- `getMarketPricing(filters)` - Get market pricing
- `updateMarketPricing()` - Update market pricing
- `compareMarketPrices(carId)` - Compare market prices

#### 2.3 Create Brand Depreciation Service
**File:** `backend/services/brandDepreciationService.js`

**Functions:**
- `calculateBrandDepreciation(brand)` - Calculate brand depreciation
- `getBrandDepreciation(brand)` - Get brand depreciation
- `predictResaleValue(brand, year)` - Predict resale value
- `updateBrandDepreciation()` - Update brand depreciation

#### 2.4 Create Mileage Impact Service
**File:** `backend/services/mileageImpactService.js`

**Functions:**
- `calculateMileageImpact(vehicleType, mileage)` - Calculate mileage impact
- `getMileageImpact(vehicleType)` - Get mileage impact
- `predictMileageDepreciation(vehicleType, mileage)` - Predict mileage depreciation
- `updateMileageImpact()` - Update mileage impact

#### 2.5 Create Demand Signals Service
**File:** `backend/services/demandSignalsService.js`

**Functions:**
- `calculateDemandScore(searchTerm)` - Calculate demand score
- `getDemandSignals(filters)` - Get demand signals
- `updateDemandSignals()` - Update demand signals
- `correlateDemandToPrice(searchTerm)` - Correlate demand to price

### 3. Analytics Pipeline

#### 3.1 Create Valuation Analytics Pipeline
**File:** `backend/pipelines/valuationAnalyticsPipeline.js`

**Functions:**
- `processListings()` - Process new listings
- `processAuctions()` - Process auction results
- `processEscrows()` - Process escrow transactions
- `processSearchData()` - Process search analytics
- `calculateMarketMetrics()` - Calculate market metrics
- `updateDepreciationData()` - Update depreciation data
- `generateTrainingData()` - Generate training data

### 4. Controllers

#### 4.1 Create Valuation Controller
**File:** `backend/controllers/vehicleValuationController.js`

**Endpoints:**
- `POST /api/vehicle-valuation/capture` - Capture price data
- `GET /api/vehicle-valuation/:carId` - Get vehicle valuation
- `POST /api/vehicle-valuation/calculate` - Calculate vehicle value
- `GET /api/vehicle-valuation/:carId/history` - Get price history
- `GET /api/vehicle-valuation/market/:county` - Get market pricing
- `GET /api/vehicle-valuation/depreciation/:brand` - Get brand depreciation
- `GET /api/vehicle-valuation/mileage-impact` - Get mileage impact
- `GET /api/vehicle-valuation/demand-signals` - Get demand signals

### 5. Routes

#### 5.1 Create Valuation Routes
**File:** `backend/routes/vehicleValuationRoutes.js`

**Routes:**
- Admin routes for valuation management
- Public routes for valuation queries
- API routes for data capture

### 6. Database Migrations

#### 6.1 Create Migration Script
**File:** `backend/migrations/migrate_vehicle_valuation.js`

**Steps:**
1. Create VehicleValuation, MarketPricing, BrandDepreciation, MileageImpact, DemandSignals collections
2. Add indexes
3. Backfill historical data from existing listings
4. Backfill auction results
5. Backfill escrow transactions
6. Backfill search analytics

---

## Data Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                              │
├─────────────────────────────────────────────────────────────┤
│  • Car listings (price, vehicle specs, location)            │
│  • Auction results (final sale price, bids)                 │
│  • Escrow transactions (transaction amount)                 │
│  • Search analytics (demand signals, filters)               │
│  • External APIs (KRA vehicle data, market data)            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              DATA INGESTION LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  • Real-time event listeners                                │
│  • Batch data processors                                    │
│  • Data validation and cleaning                            │
│  • Data transformation                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            FEATURE STORE LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  • Vehicle features (brand, model, year, mileage, etc.)    │
│  • Location features (county, city, coordinates)           │
│  • Time features (seasonality, market trends)               │
│  • Demand features (search volume, competition)             │
│  • Historical features (price history, depreciation)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            LABEL STORE LAYER                                │
├─────────────────────────────────────────────────────────────┤
│  • Actual sale prices                                       │
│  • Auction final prices                                    │
│  • Escrow transaction amounts                              │
│  • Time-to-sale metrics                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            TRAINING DATA LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  • Feature-label pairs                                      │
│  • Training dataset                                        │
│  • Validation dataset                                      │
│  • Test dataset                                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Storage Strategy

**MongoDB Collections:**
- `vehiclevaluations` - Historical price data
- `marketpricings` - County-level pricing
- `branddepreciations` - Brand depreciation data
- `mileageimpacts` - Mileage impact data
- `demandsignals` - Demand signal data

**External Storage (Future):**
- Feature Store (Redis/PostgreSQL)
- Training Data (S3/Cloud Storage)
- Model Artifacts (MLflow/S3)

---

## Training Data Architecture

### Feature Engineering

**Vehicle Features:**
- Brand (categorical)
- Model (categorical)
- Year (numerical)
- Mileage (numerical)
- Body type (categorical)
- Fuel type (categorical)
- Transmission (categorical)
- Color (categorical)
- Condition (categorical)
- Age (numerical, derived from year)

**Location Features:**
- County (categorical)
- City (categorical)
- Coordinates (numerical, lat/lng)
- Region (categorical, derived)

**Time Features:**
- Season (categorical)
- Month (categorical)
- Day of week (categorical)
- Market trend (numerical)

**Demand Features:**
- Search volume (numerical)
- Competition level (numerical)
- Days on market (numerical)
- View count (numerical)
- Inquiry count (numerical)

**Historical Features:**
- Previous prices (numerical array)
- Price history (numerical array)
- Price change rate (numerical)
- Depreciation rate (numerical)

### Label Engineering

**Primary Label:**
- Sale price (numerical)

**Secondary Labels:**
- Time to sale (numerical)
- Price difference (numerical)
- Market position (categorical)

### Training Dataset Structure

```javascript
{
  features: {
    vehicle: { brand, model, year, mileage, bodyType, fuelType, transmission, color, condition, age },
    location: { county, city, coordinates, region },
    time: { season, month, dayOfWeek, marketTrend },
    demand: { searchVolume, competitionLevel, daysOnMarket, viewCount, inquiryCount },
    historical: { previousPrices, priceHistory, priceChangeRate, depreciationRate },
  },
  labels: {
    salePrice: Number,
    timeToSale: Number,
    priceDifference: Number,
    marketPosition: String,
  },
  metadata: {
    carId: ObjectId,
    source: String,
    timestamp: Date,
  },
}
```

---

## Prediction API Architecture

### API Endpoints

**Valuation Request:**
```
POST /api/vehicle-valuation/predict
{
  vehicle: {
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    mileage: 50000,
    bodyType: "Sedan",
    fuelType: "Petrol",
    transmission: "Automatic",
    color: "White",
    condition: "Used",
  },
  location: {
    county: "Nairobi",
    city: "Nairobi",
  },
}

Response:
{
  valuation: {
    estimatedValue: 1500000,
    confidence: 0.85,
    priceRange: {
      low: 1300000,
      high: 1700000,
    },
    marketPosition: {
      type: "fair_market",
      percent: 5,
    },
  },
  marketData: {
    averagePrice: 1450000,
    medianPrice: 1400000,
    demandScore: 0.75,
  },
  factors: {
    mileageImpact: -50000,
    locationPremium: 100000,
    demandMultiplier: 1.05,
  },
}
```

**Market Pricing Query:**
```
GET /api/vehicle-valuation/market/:county?brand=Toyota&model=Corolla

Response:
{
  market: {
    averagePrice: 1450000,
    medianPrice: 1400000,
    priceRange: {
      low: 1200000,
      high: 1700000,
    },
  },
  metrics: {
    totalListings: 150,
    totalSales: 75,
    averageDaysOnMarket: 30,
    demandScore: 0.75,
  },
  trend: {
    direction: "increasing",
    percentChange: 5.2,
  },
}
```

### API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY                               │
├─────────────────────────────────────────────────────────────┤
│  • Request validation                                       │
│  • Authentication/Authorization                            │
│  • Rate limiting                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            FEATURE EXTRACTION SERVICE                        │
├─────────────────────────────────────────────────────────────┤
│  • Extract vehicle features                                  │
│  • Extract location features                                │
│  • Extract time features                                     │
│  • Extract demand features                                   │
│  • Extract historical features                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            MODEL INFERENCE SERVICE (Future)                   │
├─────────────────────────────────────────────────────────────┤
│  • Load trained model                                        │
│  • Run prediction                                            │
│  • Calculate confidence                                      │
│  • Generate price range                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            RESPONSE ENRICHMENT                               │
├─────────────────────────────────────────────────────────────┤
│  • Add market data                                           │
│  • Add factor breakdown                                      │
│  • Add confidence intervals                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            RESPONSE                                          │
├─────────────────────────────────────────────────────────────┤
│  • Valuation with confidence                                 │
│  • Market data                                              │
│  • Factor breakdown                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1)
- Create all valuation models
- Create valuation services
- Test model validation and relationships
- Ensure data integrity

### Phase 2: Data Ingestion (Week 2)
- Create data ingestion pipeline
- Backfill historical data from existing sources
- Validate data quality
- Create data quality metrics

### Phase 3: Analytics Pipeline (Week 3)
- Create valuation analytics pipeline
- Implement feature engineering
- Generate training data structure
- Test data pipeline

### Phase 4: API Development (Week 4)
- Create valuation API endpoints
- Implement feature extraction
- Create prediction API structure
- Test API endpoints

---

## Success Metrics

### Platform Level
- Data ingestion success rate > 99.9%
- Feature extraction accuracy > 99.9%
- API response time < 500ms
- Data quality score > 95%

### Business Level
- Historical data coverage > 80%
- County pricing coverage > 90%
- Brand depreciation coverage > 100%
- Demand signal accuracy > 85%

---

## Next Steps

1. Review and approve architecture plan
2. Create VehicleValuation model
3. Create MarketPricing model
4. Create BrandDepreciation model
5. Create MileageImpact model
6. Create DemandSignals model
7. Create valuation service
8. Create market pricing service
9. Create brand depreciation service
10. Create mileage impact service
11. Create demand signals service
12. Create valuation analytics pipeline
13. Create controllers and routes
14. Create migration script
15. Test thoroughly
16. Deploy to production
17. Monitor and iterate

---

**Architecture Plan Completed:** June 15, 2026  
**Next Phase:** Implementation  
**Estimated Timeline:** 4 weeks
