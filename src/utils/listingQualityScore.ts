/**
 * Listing completeness score (0-100).
 * This measures how much useful listing information is present. It is not a
 * verification, inspection, moderation or document-authentication result.
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
  /** Deprecated compatibility field. Registration numbers are not logbook evidence and this is never scored. */
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

export interface ListingCompletenessSource {
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | string | null;
  price?: number | string | null;
  mileage?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  body_type?: string | null;
  bodyType?: string | null;
  description?: string | null;
  location_city?: string | null;
  city?: string | null;
  images?: Array<string | { url?: string | null; thumb?: string | null }> | null;
  features?: string[] | null;
  vin?: string | null;
}

export function isUsableVehicleImage(value: unknown): boolean {
  const candidate = typeof value === 'string'
    ? value.trim()
    : value && typeof value === 'object'
      ? String((value as { url?: unknown }).url ?? '').trim()
      : '';
  if (!candidate) return false;
  if (/^https?:\/\//i.test(candidate)) return true;
  // Same-origin public upload paths are valid; protocol-relative and executable/data URLs are not.
  return candidate.startsWith('/') && !candidate.startsWith('//');
}

/** Map real listing fields to completeness inputs, accepting the known API aliases. */
export function getListingCompletenessFactors(listing: ListingCompletenessSource): Partial<ListingQualityFactors> {
  const description = String(listing.description ?? '').trim();
  const images = Array.isArray(listing.images) ? listing.images.filter(isUsableVehicleImage) : [];
  const features = Array.isArray(listing.features) ? listing.features.filter((feature) => String(feature ?? '').trim()) : [];
  const bodyType = String(listing.bodyType ?? listing.body_type ?? '').trim();
  const location = String(listing.city ?? listing.location_city ?? '').trim();
  const price = Number(listing.price);
  const year = Number(listing.year);
  return {
    hasTitle: Boolean(String(listing.title ?? '').trim()),
    hasBrand: Boolean(String(listing.brand ?? '').trim()),
    hasModel: Boolean(String(listing.model ?? '').trim()),
    hasYear: Number.isFinite(year) && year >= 1886,
    hasPrice: Number.isFinite(price) && price > 0,
    hasMileage: listing.mileage != null && Number.isFinite(Number(listing.mileage)) && Number(listing.mileage) >= 0,
    hasFuel: Boolean(String(listing.fuel ?? '').trim()),
    hasTransmission: Boolean(String(listing.transmission ?? '').trim()),
    hasBodyType: Boolean(bodyType),
    hasDescription: Boolean(description),
    hasLocation: Boolean(location),
    hasImages: images.length > 0,
    imageCount: images.length,
    hasFeatures: features.length > 0,
    featureCount: features.length,
    hasVin: Boolean(String(listing.vin ?? '').trim()),
    // The current owner-listing response does not expose authoritative logbook file evidence.
    // registration_number is deliberately not used here.
    hasLogbook: false,
    descriptionLength: description.length,
  };
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
    imageCount: Math.max(0, Number(factors.imageCount) || 0),
    hasFeatures: factors.hasFeatures || false,
    featureCount: Math.max(0, Number(factors.featureCount) || 0),
    hasVin: factors.hasVin || false,
    hasLogbook: false,
    descriptionLength: Math.max(0, Number(factors.descriptionLength) || 0),
  };

  let score = 0;
  const missing: string[] = [];
  const suggestions: string[] = [];

  // Core vehicle and commercial information: 40 points.
  if (f.hasTitle) score += 5; else missing.push('Listing title');
  if (f.hasBrand) score += 5; else missing.push('Vehicle brand');
  if (f.hasModel) score += 5; else missing.push('Vehicle model');
  if (f.hasYear) score += 5; else missing.push('Vehicle year');
  if (f.hasPrice) score += 10; else missing.push('Listing price');
  if (f.hasMileage) score += 5; else missing.push('Vehicle mileage');
  if (f.hasFuel) score += 3; else missing.push('Fuel type');
  if (f.hasTransmission) score += 2; else missing.push('Transmission type');

  // Description: 20 points.
  if (f.hasDescription) {
    if (f.descriptionLength >= 200) score += 20;
    else if (f.descriptionLength >= 100) { score += 15; suggestions.push('Add more useful details to your description.'); }
    else { score += 10; suggestions.push('Expand your description with condition, service history and notable features.'); }
  } else missing.push('Vehicle description');

  // Usable vehicle photos: 25 points.
  if (f.hasImages) {
    if (f.imageCount >= 8) score += 25;
    else if (f.imageCount >= 5) { score += 20; suggestions.push('Add more photos; eight clear angles are recommended.'); }
    else if (f.imageCount >= 3) { score += 15; suggestions.push('Add a few more photos to showcase the vehicle.'); }
    else { score += 8; suggestions.push('Upload at least three clear vehicle photos.'); }
  } else missing.push('Vehicle photos');

  // Additional vehicle context: 15 points. No logbook points are awarded without document evidence.
  if (f.hasBodyType) score += 3; else missing.push('Body type');
  if (f.hasLocation) score += 3; else missing.push('Location');
  if (f.hasFeatures) {
    if (f.featureCount >= 5) score += 5;
    else if (f.featureCount >= 3) { score += 3; suggestions.push('Add more vehicle features.'); }
    else score += 2;
  } else suggestions.push('Add vehicle features to help buyers compare.');
  if (f.hasVin) score += 4; else suggestions.push('Add the VIN if available.');

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  let level: ListingQualityResult['level'];
  if (boundedScore >= 85) level = 'Excellent';
  else if (boundedScore >= 65) level = 'Good';
  else if (boundedScore >= 40) level = 'Fair';
  else level = 'Poor';

  return { score: boundedScore, level, factors: f, suggestions, missing };
}

/** Preferred domain name; the old export remains for compatibility with existing callers. */
export const calculateListingCompleteness = calculateListingQualityScore;

export function getQualityScoreColor(score: number): string {
  if (score >= 85) return '#22C55E';
  if (score >= 65) return '#5AAFA4';
  if (score >= 40) return '#176B87';
  return '#EF4444';
}

export function getQualityScoreGradient(score: number): string {
  if (score >= 85) return 'linear-gradient(135deg, #22C55E, #16A34A)';
  if (score >= 65) return 'linear-gradient(135deg, #5AAFA4, #2F8F87)';
  if (score >= 40) return 'linear-gradient(135deg, #176B87, #12576D)';
  return 'linear-gradient(135deg, #EF4444, #DC2626)';
}
