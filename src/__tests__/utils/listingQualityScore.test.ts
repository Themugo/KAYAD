import { describe, it, expect } from 'vitest';
import {
  calculateListingQualityScore,
  getQualityScoreColor,
  getQualityScoreGradient,
  ListingQualityFactors,
} from '../../utils/listingQualityScore';

// A listing with every factor maxed out: 40 (basic) + 20 (description)
// + 25 (images) + 15 (additional details) = 100 points.
const completeFactors: ListingQualityFactors = {
  hasTitle: true,
  hasBrand: true,
  hasModel: true,
  hasYear: true,
  hasPrice: true,
  hasMileage: true,
  hasFuel: true,
  hasTransmission: true,
  hasBodyType: true,
  hasDescription: true,
  hasLocation: true,
  hasImages: true,
  imageCount: 8,
  hasFeatures: true,
  featureCount: 5,
  hasVin: true,
  hasLogbook: true,
  descriptionLength: 200,
};

// All basic information factors present (worth exactly 40 points), with
// everything else absent.
const basicInfoOnly: Partial<ListingQualityFactors> = {
  hasTitle: true,
  hasBrand: true,
  hasModel: true,
  hasYear: true,
  hasPrice: true,
  hasMileage: true,
  hasFuel: true,
  hasTransmission: true,
};

describe('calculateListingQualityScore', () => {
  it('returns score 0 and Poor level when no factors are provided', () => {
    const result = calculateListingQualityScore({});

    expect(result.score).toBe(0);
    expect(result.level).toBe('Poor');
    expect(result.missing).toContain('Listing title');
    expect(result.missing).toContain('Listing price');
    expect(result.missing).toContain('Vehicle description');
    expect(result.missing).toContain('Vehicle photos');
  });

  it('defaults missing factors to false and counts to 0', () => {
    const result = calculateListingQualityScore({ hasTitle: true });

    expect(result.factors.hasTitle).toBe(true);
    expect(result.factors.hasBrand).toBe(false);
    expect(result.factors.imageCount).toBe(0);
    expect(result.factors.featureCount).toBe(0);
    expect(result.factors.descriptionLength).toBe(0);
  });

  it('returns score 100 and Excellent level for a complete listing', () => {
    const result = calculateListingQualityScore(completeFactors);

    expect(result.score).toBe(100);
    expect(result.level).toBe('Excellent');
    expect(result.missing).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
  });

  it('lists each absent basic field in missing and deducts its points', () => {
    const result = calculateListingQualityScore({ ...basicInfoOnly, hasPrice: false });

    // 40 basic points minus the 10 for price
    expect(result.score).toBe(30);
    expect(result.missing).toContain('Listing price');
    expect(result.missing).not.toContain('Listing title');
  });

  describe('description scoring', () => {
    it('awards 20 points for descriptions of 200+ characters', () => {
      const result = calculateListingQualityScore({
        ...basicInfoOnly,
        hasDescription: true,
        descriptionLength: 250,
      });

      expect(result.score).toBe(60);
      expect(result.suggestions).not.toContain(
        'Add more details to your description for better quality'
      );
    });

    it('awards 15 points for descriptions of 100-199 characters with a suggestion', () => {
      const result = calculateListingQualityScore({
        ...basicInfoOnly,
        hasDescription: true,
        descriptionLength: 150,
      });

      expect(result.score).toBe(55);
      expect(result.suggestions).toContain(
        'Add more details to your description for better quality'
      );
    });

    it('awards 10 points for short descriptions with a suggestion', () => {
      const result = calculateListingQualityScore({
        ...basicInfoOnly,
        hasDescription: true,
        descriptionLength: 50,
      });

      expect(result.score).toBe(50);
      expect(result.suggestions).toContain(
        'Expand your description with vehicle condition, service history, and unique features'
      );
    });

    it('ignores descriptionLength when hasDescription is false', () => {
      const result = calculateListingQualityScore({
        ...basicInfoOnly,
        hasDescription: false,
        descriptionLength: 500,
      });

      expect(result.score).toBe(40);
      expect(result.missing).toContain('Vehicle description');
    });
  });

  describe('image scoring', () => {
    it.each([
      [8, 25],
      [10, 25],
      [5, 20],
      [7, 20],
      [3, 15],
      [4, 15],
      [1, 8],
      [2, 8],
    ])('scores %i images as %i points', (imageCount, expectedPoints) => {
      const result = calculateListingQualityScore({
        ...basicInfoOnly,
        hasImages: true,
        imageCount,
      });

      expect(result.score).toBe(40 + expectedPoints);
    });

    it('suggests adding photos when fewer than 8 are uploaded', () => {
      const result = calculateListingQualityScore({
        ...basicInfoOnly,
        hasImages: true,
        imageCount: 5,
      });

      expect(result.suggestions).toContain(
        'Add more photos (8 recommended) for better visibility'
      );
    });

    it('marks photos as missing when hasImages is false', () => {
      const result = calculateListingQualityScore({
        ...basicInfoOnly,
        hasImages: false,
        imageCount: 12,
      });

      expect(result.score).toBe(40);
      expect(result.missing).toContain('Vehicle photos');
    });
  });

  describe('additional details scoring', () => {
    it('awards feature points by tier', () => {
      const five = calculateListingQualityScore({ ...basicInfoOnly, hasFeatures: true, featureCount: 5 });
      const three = calculateListingQualityScore({ ...basicInfoOnly, hasFeatures: true, featureCount: 3 });
      const one = calculateListingQualityScore({ ...basicInfoOnly, hasFeatures: true, featureCount: 1 });

      expect(five.score).toBe(45);
      expect(three.score).toBe(43);
      expect(one.score).toBe(42);
      expect(three.suggestions).toContain('Add more features to highlight your vehicle');
    });

    it('suggests VIN and logbook instead of marking them missing', () => {
      const result = calculateListingQualityScore(basicInfoOnly);

      expect(result.missing).not.toContain('VIN');
      expect(result.suggestions).toContain('Include VIN for verification');
      expect(result.suggestions).toContain('Upload logbook for buyer confidence');
    });
  });

  describe('quality level boundaries', () => {
    it('scores exactly 40 as Fair', () => {
      const result = calculateListingQualityScore(basicInfoOnly);

      expect(result.score).toBe(40);
      expect(result.level).toBe('Fair');
    });

    it('scores exactly 65 as Good', () => {
      // 40 basic + 20 description + 5 features
      const result = calculateListingQualityScore({
        ...basicInfoOnly,
        hasDescription: true,
        descriptionLength: 200,
        hasFeatures: true,
        featureCount: 5,
      });

      expect(result.score).toBe(65);
      expect(result.level).toBe('Good');
    });

    it('scores exactly 85 as Excellent', () => {
      // 40 basic + 20 description + 25 images
      const result = calculateListingQualityScore({
        ...basicInfoOnly,
        hasDescription: true,
        descriptionLength: 200,
        hasImages: true,
        imageCount: 8,
      });

      expect(result.score).toBe(85);
      expect(result.level).toBe('Excellent');
    });

    it('scores below 40 as Poor', () => {
      // All basic info except transmission: 40 - 2 = 38 points.
      const result = calculateListingQualityScore({
        hasTitle: true,
        hasBrand: true,
        hasModel: true,
        hasYear: true,
        hasPrice: true,
        hasMileage: true,
        hasFuel: true,
        hasTransmission: false,
      });

      expect(result.score).toBe(38);
      expect(result.level).toBe('Poor');
    });
  });
});

describe('getQualityScoreColor', () => {
  it.each([
    [100, '#22C55E'],
    [85, '#22C55E'],
    [84, '#84CC16'],
    [65, '#84CC16'],
    [64, '#F59E0B'],
    [40, '#F59E0B'],
    [39, '#EF4444'],
    [0, '#EF4444'],
  ])('for score %i returns %s', (score, expectedColor) => {
    expect(getQualityScoreColor(score)).toBe(expectedColor);
  });
});

describe('getQualityScoreGradient', () => {
  it.each([
    [90, 'linear-gradient(135deg, #22C55E, #16A34A)'],
    [70, 'linear-gradient(135deg, #84CC16, #65A30D)'],
    [50, 'linear-gradient(135deg, #F59E0B, #D97706)'],
    [10, 'linear-gradient(135deg, #EF4444, #DC2626)'],
  ])('returns the expected gradient for score %i', (score, expectedGradient) => {
    expect(getQualityScoreGradient(score)).toBe(expectedGradient);
  });
});
