import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261115120000_auction_financial_reaward_integrity.sql"), "utf8");
const callback = fs.readFileSync(path.join(root, "backend/services/bidSecurityService.js"), "utf8");
const registration = fs.readFileSync(path.join(root, "backend/services/auctionRegistration.service.js"), "utf8");
const settlement = fs.readFileSync(path.join(root, "backend/services/auctionSettlement.service.js"), "utf8");
const policy = fs.readFileSync(path.join(root, "backend/services/auctionPlatformPolicy.service.js"), "utf8");

describe("auction financial and re-award integrity repair contracts", () => {
  it("reverses an applied commitment from seller/escrow payable before forfeiture", () => {
    expect(migration).toContain("auction-security-forfeit-applied:");
    expect(migration).toContain("v_debit, '4410'");
    expect(migration).toContain("reversal_of");
    expect(migration).toContain("status = 'forfeited'");
    expect(migration).toContain("NOT IN ('defaulted','reaward_pending')");
  });

  it("applies the platform and auction commitment-credit policies consistently", () => {
    expect(migration).toContain("commitmentCreditTowardWinningPayment");
    expect(migration).toContain("nonWinnerCommitmentRefundRequired");
    expect(migration).toContain("v_credit_enabled");
    expect(settlement).toContain("platformPolicy?.commitmentCreditTowardWinningPayment !== false");
    expect(policy).toContain("nonWinnerCommitmentRefundRequired: policy.nonWinnerCommitmentRefundRequired !== false");
  });

  it("keeps payment confirmation from independently activating a bidder", () => {
    const sqlCallback = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.kayad_settle_auction_security_hold_atomic"),
      migration.indexOf("REVOKE ALL ON FUNCTION public.kayad_settle_auction_security_hold_atomic")
    );
    expect(sqlCallback).toContain("status = 'pending_eligibility'");
    expect(sqlCallback).toContain("eligibility_status = 'pending'");
    expect(sqlCallback).not.toMatch(/status\\s*=\\s*'active'/);
    expect(callback).toContain("finalizeCommitmentRegistration");
    expect(registration).toContain("evaluateEligibility(user, normalizeAuctionSetup(setup.config || {}))");
  });

  it("re-award validates user state, reserve and deadline under database locks", () => {
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("is_banned");
    expect(migration).toContain("deactivated_at");
    expect(migration).toContain("deleted_at");
    expect(migration).toContain("Candidate bid does not meet the hard reserve");
    expect(migration).toContain("p_payment_due_at <= now()");
    expect(migration).toContain("SET status = 'payment_due'");
  });

  it("does not move an escrow outcome to funding before winner payment", () => {
    const reaward = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.kayad_reaward_auction_outcome_atomic")
    );
    expect(reaward).toContain("SET status = 'payment_due'");
    expect(reaward).not.toContain("status = 'escrow_pending_funding'");
  });
});
