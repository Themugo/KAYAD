export const VALUATION_COEFFICIENTS = {
  priceEstimator: {
    greatThreshold: 0.8,
    goodThreshold: 0.95,
    overpricedThreshold: 1.2,
  },
  marketPosition: {
    belowThreshold: -10,
    aboveThreshold: 10,
  },
  vehicleValuation: {
    marketAdjustmentWeight: 0.3,
    maxMileageDepreciation: 0.3,
    minValueFloor: 0.5,
    priceRangePercent: 0.15,
    confidenceWeights: {
      marketPricing: 0.3,
      brandDepreciation: 0.2,
      mileageImpact: 0.2,
      demandSignals: 0.2,
      mileage: 0.1,
    },
  },
  aiPricing: {
    weights: {
      marketAverage: 0.4,
      condition: 0.2,
      mileage: 0.15,
      year: 0.1,
      location: 0.1,
      demand: 0.05,
    },
    conditionScores: {
      new: 1.2,
      excellent: 1.1,
      good: 1.0,
      fair: 0.9,
      poor: 0.8,
    },
    mileage: {
      annualKm: 15000,
      lowThreshold: 0.5,
      belowAvgThreshold: 1.0,
      aboveAvgThreshold: 1.5,
      highThreshold: 2.0,
      lowMultiplier: 1.1,
      belowAvgMultiplier: 1.05,
      aboveAvgMultiplier: 0.95,
      highMultiplier: 0.9,
    },
    yearAdjustment: {
      newMaxAge: 1,
      newMultiplier: 1.1,
      recentMaxAge: 3,
      recentMultiplier: 1.05,
      avgMaxAge: 5,
      avgMultiplier: 1.0,
      oldMaxAge: 10,
      oldMultiplier: 0.95,
      vintageMultiplier: 0.9,
    },
    priceRangePercent: 0.1,
    recommendThreshold: 10,
  },
  confidenceThresholds: {
    high: 0.8,
    medium: 0.5,
  },
};

export const ROUNDING = {
  price: (val) => Math.round(val),
  percent: (val) => Math.round(val * 100) / 100,
  money: (val) => Math.round(val),
};

export default VALUATION_COEFFICIENTS;
