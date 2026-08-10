import { describe, it, expect, beforeEach } from 'vitest';
import { isEscrowApplicable, isEscrowLive, getEscrowBadgeLabel } from '../../utils/escrow';
import {
  readEscrowRulesConfig,
  writeEscrowRulesConfig,
  DEFAULT_ESCROW_RULES_CONFIG,
} from '../../features/Admin/hooks/escrowRulesConfig';
import { readLogEntries } from '../../features/Admin/hooks/adminAuditLog';
import { Vehicle } from '../../types';
import { INITIAL_VEHICLES } from '../../data/mockVehicles';

describe('Escrow rules config actually drives real business logic (not decorative admin UI)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const admin = { id: 'usr-admin-1', name: 'Test Admin' };

  it('defaults exactly match the previous hardcoded behavior (private mandatory, dealer optional)', () => {
    const dealer = INITIAL_VEHICLES.find((v) => v.sellerType === 'Verified Dealer' && v.escrowEligible);
    const dealerNotEligible = INITIAL_VEHICLES.find((v) => v.sellerType === 'Verified Dealer' && !v.escrowEligible);
    const privateSeller = INITIAL_VEHICLES.find((v) => v.sellerType === 'Private Seller');
    expect(privateSeller).toBeTruthy();
    expect(isEscrowApplicable(privateSeller)).toBe(true); // always mandatory
    if (dealer) expect(isEscrowApplicable(dealer)).toBe(true); // optional + eligible
    if (dealerNotEligible) expect(isEscrowApplicable(dealerNotEligible)).toBe(false); // optional + not eligible
  });

  it('admin setting privateSellerRequirement to "disabled" actually turns off escrow for private sellers, not just the UI label', () => {
    const privateSeller = INITIAL_VEHICLES.find((v) => v.sellerType === 'Private Seller')!;
    expect(isEscrowApplicable(privateSeller)).toBe(true); // sanity check before the change

    writeEscrowRulesConfig({ ...DEFAULT_ESCROW_RULES_CONFIG, privateSellerRequirement: 'disabled' }, admin);
    expect(isEscrowApplicable(privateSeller)).toBe(false);
  });

  it('admin setting dealerRequirement to "mandatory" actually makes it apply to a dealer vehicle that is NOT individually escrowEligible', () => {
    const dealerNotEligible = INITIAL_VEHICLES.find((v) => v.sellerType === 'Verified Dealer' && !v.escrowEligible);
    if (!dealerNotEligible) return; // no such vehicle in current mock data - nothing to verify against
    expect(isEscrowApplicable(dealerNotEligible)).toBe(false); // sanity check before

    writeEscrowRulesConfig({ ...DEFAULT_ESCROW_RULES_CONFIG, dealerRequirement: 'mandatory' }, admin);
    expect(isEscrowApplicable(dealerNotEligible)).toBe(true);
  });

  it('isEscrowLive() reflects liveMode and defaults to false (not yet CBK-certified)', () => {
    expect(isEscrowLive()).toBe(false);
    writeEscrowRulesConfig({ ...DEFAULT_ESCROW_RULES_CONFIG, liveMode: true }, admin);
    expect(isEscrowLive()).toBe(true);
  });

  it('getEscrowBadgeLabel appends "(Preview)" while not live, and drops it once liveMode is on', () => {
    const privateSeller: Vehicle = INITIAL_VEHICLES.find((v) => v.sellerType === 'Private Seller')!;
    expect(getEscrowBadgeLabel(privateSeller)).toMatch(/\(Preview\)$/);

    writeEscrowRulesConfig({ ...DEFAULT_ESCROW_RULES_CONFIG, liveMode: true }, admin);
    expect(getEscrowBadgeLabel(privateSeller)).not.toMatch(/\(Preview\)$/);
  });

  it('every config write appends a real, correctly-attributed entry to the immutable audit log', () => {
    expect(readLogEntries().length).toBe(0);
    writeEscrowRulesConfig({ ...DEFAULT_ESCROW_RULES_CONFIG, liveMode: true }, admin);
    const entries = readLogEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].adminId).toBe(admin.id);
    expect(entries[0].adminName).toBe(admin.name);
    expect(entries[0].area).toBe('escrow-rules');
    expect(entries[0].summary).toMatch(/Escrow Live Mode: OFF -> ON/);
  });

  it('the audit log module exposes no update/delete function - only append and read', async () => {
    const mod = await import('../../features/Admin/hooks/adminAuditLog');
    const exportNames = Object.keys(mod);
    expect(exportNames).toContain('appendLogEntry');
    expect(exportNames).toContain('readLogEntries');
    expect(exportNames.some((n) => /update|edit|delete|remove/i.test(n))).toBe(false);
  });

  it('config persists across separate read calls (survives what would be a page reload)', () => {
    writeEscrowRulesConfig({ ...DEFAULT_ESCROW_RULES_CONFIG, dealerRequirement: 'disabled' }, admin);
    // A fresh, independent read call - simulates a new page load reading
    // from localStorage rather than trusting in-memory state.
    const reloaded = readEscrowRulesConfig();
    expect(reloaded.dealerRequirement).toBe('disabled');
  });
});
