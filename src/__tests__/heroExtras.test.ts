import { describe, it, expect } from 'vitest';
import { HERO_EXTRAS_DEFAULTS, normalizeHeroExtras } from '../features/VehicleMarketplace/types/heroPresentation';

describe('normalizeHeroExtras (shared by the public hero and the admin save path)', () => {
  it('returns the approved visual-foundation defaults when nothing is stored', () => {
    expect(normalizeHeroExtras(undefined)).toEqual(HERO_EXTRAS_DEFAULTS);
    expect(normalizeHeroExtras({})).toEqual(HERO_EXTRAS_DEFAULTS);
    expect(HERO_EXTRAS_DEFAULTS).toMatchObject({ mobileStageMinPx: 168, mobileStageMaxPx: 260, mobileTransitionMs: 320, rotationSeconds: 6.5 });
  });

  it('preserves an explicit 0 (instant transition, rotation off) instead of falling back to defaults', () => {
    const out = normalizeHeroExtras({ mobileTransitionMs: 0, rotationSeconds: 0 });
    expect(out.mobileTransitionMs).toBe(0);
    expect(out.rotationSeconds).toBe(0);
  });

  it('clamps unsafe values and keeps max >= min', () => {
    expect(normalizeHeroExtras({ mobileStageMinPx: 5, mobileStageMaxPx: 9000 })).toMatchObject({ mobileStageMinPx: 120, mobileStageMaxPx: 420 });
    expect(normalizeHeroExtras({ mobileStageMinPx: 300, mobileStageMaxPx: 170 }).mobileStageMaxPx).toBeGreaterThanOrEqual(300);
    expect(normalizeHeroExtras({ mobileTransitionMs: 99999 }).mobileTransitionMs).toBe(1000);
    expect(normalizeHeroExtras({ mobileTransitionMs: -4 }).mobileTransitionMs).toBe(0);
    // Rotation is either off (<=0) or at least 3s so the hero cannot flicker.
    expect(normalizeHeroExtras({ rotationSeconds: 1 }).rotationSeconds).toBe(3);
    expect(normalizeHeroExtras({ rotationSeconds: 500 }).rotationSeconds).toBe(60);
  });

  it('ignores junk (NaN, empty string, text) and uses defaults', () => {
    expect(normalizeHeroExtras({ mobileStageMinPx: 'abc', mobileTransitionMs: '', rotationSeconds: NaN })).toEqual(HERO_EXTRAS_DEFAULTS);
  });
});
