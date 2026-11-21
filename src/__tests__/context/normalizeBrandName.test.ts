import { describe, it, expect } from 'vitest';
import { normalizeBrandName } from '../../context/BrandingContext';

describe('normalizeBrandName (DA-05)', () => {
  it.each(['KAYAD', 'KAYARD', 'KAYAD KE', 'KAYARD KE', 'KAYARD ', ' kayad ', 'Kayard  Ke', 'kayard ke'])('maps %j to the approved name', (v) => {
    expect(normalizeBrandName(v)).toBe('KAYARD KE');
  });
  it.each(['Kayad Motors Ltd', 'KAYAD-IR-1234', 'kayad.space', 'Eric Kamau Motors', ''])('leaves %j untouched', (v) => {
    expect(normalizeBrandName(v)).toBe(v);
  });
  it('passes null and undefined through', () => {
    expect(normalizeBrandName(null)).toBeNull();
    expect(normalizeBrandName(undefined)).toBeUndefined();
  });
});
