/**
 * Listing Quality Score System
 * Calculates a quality score (0-100) for vehicle listings based on completeness
 * of information, image quality, and listing details.
 */

export interface ListingQualityFactors {
  hasTitle: boolean;
  hasBrand: boolean;
  hasModel: boolean;
  hasYear: boolean;
  hasPrice: boolean;
  hasMileage: boolean;
  hasFuel: boolean;
  hasTransmission: boolean;
  hasBodyType: boolean;
  hasDescription: boolean;
  hasLocation: boolean;
  hasImages: boolean;
  imageCount: number;
  hasFeatures: boolean;
  featureCount: number;
  hasVin: boolean;
  hasLogbook: boolean;
  descriptionLength: number;
}

export interface ListingQualityResult {
  score: number;
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  factors: ListingQualityFactors;
  suggestions: string[];
  missing: string[];
}

export function calculateListingQualityScore(factors: Partial<ListingQualityFactors>): ListingQualityResult {
  const f: ListingQualityFactors = {
    hasTitle: factors.hasTitle || false,
    hasBrand: factors.hasBrand || false,
    hasModel: factors.hasModel || false,
    hasYear: factors.hasYear || false,
    hasPrice: factors.hasPrice || false,
    hasMileage: factors.hasMileage || false,
    hasFuel: factors.hasFuel || false,
    hasTransmission: factors.hasTransmission || false,
    hasBodyType: factors.hasBodyType || false,
    hasDescription: factors.hasDescription || false,
    hasLocation: factors.hasLocation || false,
    hasImages: factors.hasImages || false,
    imageCount: factors.imageCount || 0,
    hasFeatures: factors.hasFeatures || false,
    featureCount: factors.featureCount || 0,
    hasVin: factors.hasVin || false,
    hasLogbook: factors.hasLogbook || false,
    descriptionLength: factors.descriptionLength || 0,
  };

  let score = 0;
  const missing: string[] = [];
  const suggestions: string[] = [];

  // Basic information (40 points)
  if (f.hasTitle) score += 5; else missing.push('Listing title');
  if (f.hasBrand) score += 5; else missing.push('Vehicle brand');
  if (f.hasModel) score += 5; else missing.push('Vehicle model');
  if (f.hasYear) score += 5; else missing.push('Vehicle year');
  if (f.hasPrice) score += 10; else missing.push('Listing price');
  if (f.hasMileage) score += 5; else missing.push('Vehicle mileage');
  if (f.hasFuel) score += 3; else missing.push('Fuel type');
  if (f.hasTransmission) score += 2; else missing.push('Transmission type');

  // Description (20 points)
  if (f.hasDescription) {
    if (f.descriptionLength >= 200) {
      score += 20;
    } else if (f.descriptionLength >= 100) {
      score += 15;
      suggestions.push('Add more details to your description for better quality');
    } else {
      score += 10;
      suggestions.push('Expand your description with vehicle condition, service history, and unique features');
    }
  } else {
    missing.push('Vehicle description');
  }

  // Images (25 points)
  if (f.hasImages) {
    if (f.imageCount >= 8) {
      score += 25;
    } else if (f.imageCount >= 5) {
      score += 20;
      suggestions.push('Add more photos (8 recommended) for better visibility');
    } else if (f.imageCount >= 3) {
      score += 15;
      suggestions.push('Add more photos to showcase your vehicle');
    } else {
      score += 8;
      suggestions.push('Upload at least 3-5 high-quality photos');
    }
  } else {
    missing.push('Vehicle photos');
  }

  // Additional details (15 points)
  if (f.hasBodyType) score += 3; else missing.push('Body type');
  if (f.hasLocation) score += 3; else missing.push('Location');
  if (f.hasFeatures) {
    if (f.featureCount >= 5) {
      score += 5;
    } else if (f.featureCount >= 3) {
      score += 3;
      suggestions.push('Add more features to highlight your vehicle');
    } else {
      score += 2;
    }
  } else {
    suggestions.push('Add vehicle features to attract more buyers');
  }
  if (f.hasVin) score += 2; else suggestions.push('Include VIN for verification');
  if (f.hasLogbook) score += 2; else suggestions.push('Upload logbook for buyer confidence');

  // Determine quality level
  let level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  if (score >= 85) level = 'Excellent';
  else if (score >= 65) level = 'Good';
  else if (score >= 40) level = 'Fair';
  else level = 'Poor';

  return {
    score,
    level,
    factors: f,
    suggestions,
    missing,
  };
}

export function getQualityScoreColor(score: number): string {
  if (score >= 85) return '#22C55E'; // Green
  if (score >= 65) return '#84CC16'; // Lime
  if (score >= 40) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

export function getQualityScoreGradient(score: number): string {
  if (score >= 85) return 'linear-gradient(135deg, #22C55E, #16A34A)';
  if (score >= 65) return 'linear-gradient(135deg, #84CC16, #65A30D)';
  if (score >= 40) return 'linear-gradient(135deg, #F59E0B, #D97706)';
  return 'linear-gradient(135deg, #EF4444, #DC2626)';
}
