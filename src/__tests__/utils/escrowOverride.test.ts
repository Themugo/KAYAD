import { describe, it, expect, beforeEach } from 'vitest';
import { isEscrowApplicable, getEscrowBadgeLabel } from '../../utils/escrow';
import { Vehicle } from '../../types';

// Minimal valid Vehicle stub - only the fields these functions actually
// read are meaningfully varied per test; the rest are placeholder
// values satisfying the type.
function makeVehicle(overrides: Partial<Vehicle>): Vehicle {
  return {
    id: 'test-v1',
    title: 'Test Vehicle',
    make: 'Toyota',
    model: 'Test',
    year: 2020,
    price: 1000000,
    mileage: 10000,
    location: 'Nairobi',
    sellerName: 'Test Seller',
    sellerType: 'Verified Dealer',
    image: '',
    images: [],
    condition: 'Foreign Used',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyStyle: 'Sedan',
    savedCount: 0,
    ...overrides,
  } as Vehicle;
}

describe('isEscrowApplicable - per-vehicle admin override (escrowOverride)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Added per explicit direction: escrow shouldn't be unconditionally
  // mandatory for every private-seller sale via the blanket global rule
  // alone - an admin needs to enforce or revoke it per individual sale.
  // These tests verify the override takes precedence over the global
  // rule in both directions, for both seller types.

  it('escrowOverride "revoke" returns false even for a Private Seller (whose default rule is mandatory)', () => {
    const vehicle = makeVehicle({ sellerType: 'Private Seller', escrowOverride: 'revoke' });
    expect(isEscrowApplicable(vehicle)).toBe(false);
  });

  // STAGE 8 FIX: escrowOverride "enforce" can no longer manufacture
  // escrow capability for a vehicle the backend has not marked eligible
  // (vehicle.escrowEligible, sourced from cars.escrow_enabled). An
  // override has no backend write path today (see
  // ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md), so this is
  // presentation-layer scaffolding only — it must never be able to
  // fabricate a trust signal the backend would reject at purchase time.
  it('escrowOverride "enforce" does NOT fabricate escrow for a Verified Dealer vehicle with escrowEligible: false', () => {
    const vehicle = makeVehicle({
      sellerType: 'Verified Dealer',
      escrowEligible: false,
      escrowOverride: 'enforce',
    });
    expect(isEscrowApplicable(vehicle)).toBe(false);
  });

  it('escrowOverride "enforce" DOES apply once the vehicle is backend-eligible, even under a global "disabled" tier', () => {
    const vehicle = makeVehicle({
      sellerType: 'Verified Dealer',
      escrowEligible: true,
      escrowOverride: 'enforce',
    });
    expect(isEscrowApplicable(vehicle)).toBe(true);
  });

  it('with no override (undefined), falls through to the existing global-rule behavior, still gated on real backend eligibility', () => {
    const privateSeller = makeVehicle({ sellerType: 'Private Seller', escrowEligible: true });
    const dealerNotEligible = makeVehicle({ sellerType: 'Verified Dealer', escrowEligible: false });
    const dealerEligible = makeVehicle({ sellerType: 'Verified Dealer', escrowEligible: true });
    expect(isEscrowApplicable(privateSeller)).toBe(true);
    expect(isEscrowApplicable(dealerNotEligible)).toBe(false);
    expect(isEscrowApplicable(dealerEligible)).toBe(true);
  });

  it('explicit escrowOverride: null behaves identically to undefined (falls through to the global rule), still gated on real backend eligibility', () => {
    const vehicle = makeVehicle({ sellerType: 'Private Seller', escrowOverride: null, escrowEligible: true });
    expect(isEscrowApplicable(vehicle)).toBe(true);
  });

  it('a private seller vehicle the backend has NOT marked escrow-eligible never shows the badge, regardless of the mandatory default policy', () => {
    const vehicle = makeVehicle({ sellerType: 'Private Seller', escrowEligible: false });
    expect(isEscrowApplicable(vehicle)).toBe(false);
  });
});

describe('getEscrowBadgeLabel - reflects the actual effective requirement, not raw sellerType', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('says "Escrow Mandatory" for a dealer vehicle when an admin has enforced it via override', () => {
    const vehicle = makeVehicle({ sellerType: 'Verified Dealer', escrowOverride: 'enforce' });
    expect(getEscrowBadgeLabel(vehicle)).toContain('Escrow Mandatory');
  });

  it('says "Escrow Vault Enabled" (not "Mandatory") for a private seller vehicle when an admin has revoked the mandatory requirement via override', () => {
    const vehicle = makeVehicle({ sellerType: 'Private Seller', escrowOverride: 'revoke' });
    // Note: getEscrowBadgeLabel is only actually shown by callers when
    // isEscrowApplicable is true, but its own labeling logic should
    // still be internally consistent regardless of caller behavior -
    // 'revoke' overrides isMandatory to false, so the label reflects
    // "not mandatory" phrasing even though this exact combination
    // (revoked but somehow still displayed) shouldn't normally occur.
    expect(getEscrowBadgeLabel(vehicle)).toContain('Escrow Vault Enabled');
    expect(getEscrowBadgeLabel(vehicle)).not.toContain('Mandatory');
  });
});
