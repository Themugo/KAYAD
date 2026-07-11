// backend/services/vehicleApprovalAssistantService.js - Production v1.0
// ─────────────────────────────────────────────────────────────
// Vehicle Approval Assistant Service
// Automated pre-screening for pending vehicles before admin review
// Reduces manual review time by flagging issues automatically
// All decisions require human approval - this is advisory only
// ─────────────────────────────────────────────────────────────

import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, findById, update } from "../db/index.js";
import { detectDuplicates } from "./duplicateVehicleService.js";

/**
 * @typedef {Object} ApprovalCheck
 * @property {string} check - Name of the check
 * @property {string} status - 'pass' | 'warn' | 'fail'
 * @property {string} message - Human-readable message
 * @property {string} severity - 'info' | 'warning' | 'critical'
 * @property {Object} [data] - Additional data for the check
 */

/**
 * @typedef {Object} ApprovalResult
 * @property {string} carId - Vehicle ID
 * @property {string} recommendation - 'approve' | 'review' | 'reject'
 * @property {number} confidence - 0-100 confidence score
 * @property {ApprovalCheck[]} checks - Individual check results
 * @property {string[]} flags - List of flag reasons for admin
 * @property {string[]} suggestions - Improvement suggestions
 */

// Required fields for a complete listing
const REQUIRED_FIELDS = [
  'brand', 'model', 'year', 'price', 'mileage',
  'fuel', 'transmission', 'bodyType', 'description'
];

// Suspicious price thresholds (relative to market)
const PRICE_ANOMALY_THRESHOLD = {
  tooLow: 0.5,    // < 50% of market avg
  tooHigh: 2.0,  // > 200% of market avg
};

// Minimum quality standards
const MINIMUM_STANDARDS = {
  minImages: 3,
  minDescriptionLength: 50,
  minSpecFields: 6,
};

/**
 * Run all approval checks on a vehicle
 * @param {string} carId - Vehicle ID to check
 * @returns {Promise<ApprovalResult>} Complete approval assessment
 */
export const assessVehicle = async (carId) => {
  try {
    const car = await findById("cars", carId);
    if (!car) {
      throw new Error("Vehicle not found");
    }

    const checks = [];
    const flags = [];
    const suggestions = [];

    // Run all checks in parallel for efficiency
    const [
      completenessResult,
      qualityResult,
      duplicateResult,
      priceResult,
      imageResult,
      fraudResult
    ] = await Promise.all([
      checkCompleteness(car),
      checkQuality(car),
      checkDuplicates(car),
      checkPrice(car),
      checkImages(car),
      checkFraudIndicators(car)
    ]);

    checks.push(completenessResult, qualityResult, duplicateResult, priceResult, imageResult, fraudResult);

    // Aggregate flags and suggestions
    checks.forEach(check => {
      if (check.status === 'fail' || check.status === 'warn') {
        flags.push(check.message);
        if (check.suggestion) {
          suggestions.push(check.suggestion);
        }
      }
    });

    // Calculate recommendation
    const { recommendation, confidence } = calculateRecommendation(checks, flags);

    const result = {
      carId,
      carTitle: car.title,
      dealerId: car.dealer,
      recommendation,
      confidence,
      checks,
      flags,
      suggestions: [...new Set(suggestions)], // Remove duplicates
      assessedAt: new Date().toISOString(),
      requiresHumanReview: recommendation !== 'approve'
    };

    logInfo("Vehicle assessment completed", {
      carId,
      recommendation,
      confidence,
      flagsCount: flags.length
    });

    return result;
  } catch (err) {
    logError("Vehicle assessment error", err, { carId });
    throw err;
  }
};

/**
 * Check field completeness
 */
const checkCompleteness = async (car) => {
  const missing = REQUIRED_FIELDS.filter(field => {
    const value = car[field];
    return value === undefined || value === null || value === '' || value === 0;
  });

  const completeness = ((REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length) * 100;

  if (missing.length > 3) {
    return {
      check: 'completeness',
      status: 'fail',
      message: `Missing ${missing.length} required fields: ${missing.join(', ')}`,
      severity: 'critical',
      data: { missing, completeness: Math.round(completeness) },
      suggestion: `Add all required information: ${missing.join(', ')}`
    };
  }

  if (missing.length > 0) {
    return {
      check: 'completeness',
      status: 'warn',
      message: `Missing ${missing.length} fields: ${missing.join(', ')}`,
      severity: 'warning',
      data: { missing, completeness: Math.round(completeness) },
      suggestion: `Complete missing information: ${missing.join(', ')}`
    };
  }

  return {
    check: 'completeness',
    status: 'pass',
    message: 'All required fields are present',
    severity: 'info',
    data: { completeness: 100 }
  };
};

/**
 * Check listing quality (descriptions, specs)
 */
const checkQuality = async (car) => {
  const issues = [];
  
  // Description length
  const descLength = (car.description || '').trim().length;
  if (descLength < MINIMUM_STANDARDS.minDescriptionLength) {
    issues.push(`Description too short (${descLength} chars, min ${MINIMUM_STANDARDS.minDescriptionLength})`);
  }

  // Spec fields filled
  const specFields = ['brand', 'model', 'year', 'price', 'mileage', 'fuel', 'transmission', 'bodyType', 'color', 'engine', 'condition'];
  const filledSpecs = specFields.filter(f => car[f] !== undefined && car[f] !== null && car[f] !== '');
  
  if (filledSpecs.length < MINIMUM_STANDARDS.minSpecFields) {
    issues.push(`Only ${filledSpecs.length}/${specFields.length} spec fields filled`);
  }

  // Check for placeholder/vague descriptions
  const vaguePatterns = [
    /^call for more details/i,
    /contact me for info/i,
    /dm for price/i,
    /serious buyers only/i
  ];
  
  if (vaguePatterns.some(p => p.test(car.description || ''))) {
    issues.push('Description contains placeholder text');
  }

  if (issues.length > 1) {
    return {
      check: 'quality',
      status: 'fail',
      message: issues.join('; '),
      severity: 'warning',
      data: { descLength, specsFilled: filledSpecs.length },
      suggestion: 'Improve listing quality with detailed description and complete specifications'
    };
  }

  if (issues.length > 0) {
    return {
      check: 'quality',
      status: 'warn',
      message: issues[0],
      severity: 'warning',
      data: { descLength, specsFilled: filledSpecs.length },
      suggestion: 'Add more details to description or fill additional specs'
    };
  }

  return {
    check: 'quality',
    status: 'pass',
    message: 'Listing quality meets standards',
    severity: 'info',
    data: { descLength, specsFilled: filledSpecs.length }
  };
};

/**
 * Check for duplicate listings
 */
const checkDuplicates = async (car) => {
  try {
    const duplicateResult = await detectDuplicates(car, car.dealer);
    
    if (duplicateResult.hasDuplicates && duplicateResult.matchScore >= 80) {
      return {
        check: 'duplicates',
        status: 'fail',
        message: `Potential duplicate detected (${duplicateResult.matchScore}% match) - ${duplicateResult.matchType}`,
        severity: 'critical',
        data: {
          matchScore: duplicateResult.matchScore,
          matchType: duplicateResult.matchType,
          matchesCount: duplicateResult.matches.length
        },
        suggestion: 'Review for duplicate listing before approval'
      };
    }

    if (duplicateResult.hasDuplicates) {
      return {
        check: 'duplicates',
        status: 'warn',
        message: `Possible duplicate (${duplicateResult.matchScore}% match) - manual review recommended`,
        severity: 'warning',
        data: {
          matchScore: duplicateResult.matchScore,
          matchType: duplicateResult.matchType
        }
      };
    }

    return {
      check: 'duplicates',
      status: 'pass',
      message: 'No duplicates detected',
      severity: 'info'
    };
  } catch (err) {
    logWarn("Duplicate check error", err);
    return {
      check: 'duplicates',
      status: 'warn',
      message: 'Duplicate check could not be completed',
      severity: 'warning'
    };
  }
};

/**
 * Check for price anomalies
 */
const checkPrice = async (car) => {
  const price = car.price;
  if (!price || price <= 0) {
    return {
      check: 'price',
      status: 'warn',
      message: 'No price set',
      severity: 'warning',
      suggestion: 'Add a competitive price based on market value'
    };
  }

  try {
    // Get market data for similar vehicles
    const similar = await findAll("cars", {
      filters: {
        brand: car.brand,
        price: { $gt: 0 },
        status: 'active',
        _id: { $ne: car.id }
      },
      select: "price",
      limit: 20
    });

    if (similar.length < 3) {
      return {
        check: 'price',
        status: 'pass',
        message: 'Insufficient market data for comparison',
        severity: 'info',
        data: { sampleSize: similar.length }
      };
    }

    const prices = similar.map(c => c.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Check for anomalies
    if (price < avgPrice * PRICE_ANOMALY_THRESHOLD.tooLow) {
      return {
        check: 'price',
        status: 'warn',
        message: `Price (KES ${price.toLocaleString()}) is ${Math.round((1 - price/avgPrice) * 100)}% below market average (KES ${Math.round(avgPrice).toLocaleString()})`,
        severity: 'warning',
        data: { price, avgPrice, minPrice, maxPrice, sampleSize: similar.length },
        suggestion: 'Verify price is competitive - unusually low prices may indicate issues'
      };
    }

    if (price > avgPrice * PRICE_ANOMALY_THRESHOLD.tooHigh) {
      return {
        check: 'price',
        status: 'warn',
        message: `Price (KES ${price.toLocaleString()}) is ${Math.round((price/avgPrice - 1) * 100)}% above market average (KES ${Math.round(avgPrice).toLocaleString()})`,
        severity: 'warning',
        data: { price, avgPrice, minPrice, maxPrice, sampleSize: similar.length },
        suggestion: 'Consider lowering price to improve competitiveness'
      };
    }

    return {
      check: 'price',
      status: 'pass',
      message: `Price is within market range`,
      severity: 'info',
      data: { price, avgPrice, minPrice, maxPrice, sampleSize: similar.length }
    };
  } catch (err) {
    logWarn("Price check error", err);
    return {
      check: 'price',
      status: 'pass',
      message: 'Price check could not be completed',
      severity: 'info'
    };
  }
};

/**
 * Check image quality indicators
 */
const checkImages = async (car) => {
  const images = car.images || [];
  const imageCount = Array.isArray(images) ? images.length : 0;

  if (imageCount === 0) {
    return {
      check: 'images',
      status: 'fail',
      message: 'No images uploaded',
      severity: 'critical',
      data: { imageCount: 0 },
      suggestion: 'Upload at least 3 clear images of the vehicle'
    };
  }

  if (imageCount < MINIMUM_STANDARDS.minImages) {
    return {
      check: 'images',
      status: 'warn',
      message: `Only ${imageCount} image(s) - minimum ${MINIMUM_STANDARDS.minImages} recommended`,
      severity: 'warning',
      data: { imageCount },
      suggestion: 'Add more images to attract buyers'
    };
  }

  return {
    check: 'images',
    status: 'pass',
    message: `Good image count (${imageCount})`,
    severity: 'info',
    data: { imageCount }
  };
};

/**
 * Check for fraud indicators
 */
const checkFraudIndicators = async (car) => {
  const indicators = [];
  
  // Check for placeholder images
  const placeholderPatterns = [
    /placeholder/i,
    /sample/i,
    /example/i,
    /test/i
  ];
  
  const images = car.images || [];
  const hasPlaceholder = images.some(img => 
    placeholderPatterns.some(p => p.test(img.toString()))
  );
  
  if (hasPlaceholder) {
    indicators.push('Possible placeholder image detected');
  }

  // Check for stock/generic images
  if (images.length > 0 && images[0] && images[0].includes('stock')) {
    indicators.push('Stock image may be used');
  }

  // Check description for suspicious patterns
  const suspiciousPatterns = [
    /cash only/i,
    /no inspection/i,
    /as is/i,
    /no questions/i
  ];
  
  const desc = car.description || '';
  const hasSuspiciousPatterns = suspiciousPatterns.some(p => p.test(desc));
  
  if (hasSuspiciousPatterns) {
    indicators.push('Description contains potentially concerning phrases');
  }

  // Check for contact info in description (against best practices)
  const contactPatterns = [
    /07\d{8}/,
    /\+254/,
    /whatsapp/i
  ];
  
  const hasContactInfo = contactPatterns.some(p => p.test(desc));
  if (hasContactInfo) {
    indicators.push('Contact information in description - buyers should use in-app messaging');
  }

  if (indicators.length > 1) {
    return {
      check: 'fraud',
      status: 'fail',
      message: indicators.join('; '),
      severity: 'critical',
      data: { indicators },
      suggestion: 'Review for potential fraud or policy violations'
    };
  }

  if (indicators.length > 0) {
    return {
      check: 'fraud',
      status: 'warn',
      message: indicators[0],
      severity: 'warning',
      data: { indicators }
    };
  }

  return {
    check: 'fraud',
    status: 'pass',
    message: 'No fraud indicators detected',
    severity: 'info'
  };
};

/**
 * Calculate overall recommendation based on checks
 */
const calculateRecommendation = (checks, flags) => {
  const criticalFlags = checks.filter(c => c.severity === 'critical' && c.status !== 'pass');
  const warningFlags = checks.filter(c => c.severity === 'warning' && c.status !== 'pass');
  
  // Must reject if critical issues
  if (criticalFlags.length > 0) {
    return { recommendation: 'reject', confidence: 95 };
  }
  
  // Review if many warnings
  if (warningFlags.length >= 3) {
    return { recommendation: 'review', confidence: 70 };
  }
  
  // Review if any warnings
  if (warningFlags.length > 0) {
    return { recommendation: 'review', confidence: 85 };
  }
  
  // Approve if all pass
  return { recommendation: 'approve', confidence: 90 };
};

/**
 * Batch assess multiple vehicles
 * @param {string[]} carIds - Array of vehicle IDs
 * @returns {Promise<ApprovalResult[]>} Assessment results for all vehicles
 */
export const batchAssess = async (carIds) => {
  const results = [];
  
  for (const carId of carIds) {
    try {
      const result = await assessVehicle(carId);
      results.push(result);
    } catch (err) {
      logError("Batch assessment error", err, { carId });
      results.push({
        carId,
        recommendation: 'error',
        error: err.message
      });
    }
  }
  
  return results;
};

/**
 * Get summary statistics for pending vehicles
 * @returns {Promise<Object>} Summary statistics
 */
export const getPendingSummary = async () => {
  const pending = await findAll("cars", {
    filters: { status: 'pending' },
    select: "_id"
  });
  
  const assessed = pending.map(car => assessVehicle(car.id));
  const results = await Promise.all(assessed);
  
  const stats = {
    total: results.length,
    recommendApprove: results.filter(r => r.recommendation === 'approve').length,
    recommendReview: results.filter(r => r.recommendation === 'review').length,
    recommendReject: results.filter(r => r.recommendation === 'reject').length,
    avgConfidence: Math.round(results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length)
  };
  
  return {
    ...stats,
    summary: `${stats.recommendApprove} ready to approve, ${stats.recommendReview} need review, ${stats.recommendReject} should reject`,
    generatedAt: new Date().toISOString()
  };
};

export default {
  assessVehicle,
  batchAssess,
  getPendingSummary
};
