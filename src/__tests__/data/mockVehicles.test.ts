import { describe, it, expect } from 'vitest';
import { INITIAL_VEHICLES } from '../../data/mockVehicles';

describe('mockVehicles - auction end times stay live', () => {
  // Found a real bug: both mock auction vehicles had hardcoded
  // auctionEndsAt dates (2026-08-01, 2026-07-30) that were already in
  // the past by the time this was actually tested - the app's own
  // countdown logic correctly computed "Auction Closed" for both,
  // directly contradicting the "Live Bidding Events" section they were
  // shown under (real bid counts, active "Ready to Bid"/"Register
  // Deposit" CTAs implying you could still bid). Fixed by computing
  // auctionEndsAt relative to Date.now() at module load instead of a
  // fixed calendar date, so this can't go stale the same way again.
  // This test is the regression guard for that specific fix.
  it('every vehicle marked isAuction has an auctionEndsAt in the future, not the past', () => {
    const auctionVehicles = INITIAL_VEHICLES.filter((v) => v.isAuction);
    expect(auctionVehicles.length).toBeGreaterThan(0);
    auctionVehicles.forEach((v) => {
      expect(v.auctionEndsAt).toBeTruthy();
      const msRemaining = new Date(v.auctionEndsAt!).getTime() - Date.now();
      expect(msRemaining).toBeGreaterThan(0);
    });
  });

  it('at least one auction vehicle is within the 24h "ending soon" urgency window, so that section of the UI has real data to show', () => {
    const auctionVehicles = INITIAL_VEHICLES.filter((v) => v.isAuction);
    const hasUrgentOne = auctionVehicles.some((v) => {
      const msRemaining = new Date(v.auctionEndsAt!).getTime() - Date.now();
      return msRemaining > 0 && msRemaining < 24 * 60 * 60 * 1000;
    });
    expect(hasUrgentOne).toBe(true);
  });
});
