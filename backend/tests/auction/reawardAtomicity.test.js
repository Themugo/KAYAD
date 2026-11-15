import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const service = fs.readFileSync(path.join(root, "backend/services/auctionFulfilment.service.js"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261115120000_auction_financial_reaward_integrity.sql"), "utf8");

describe("atomic auction re-award", () => {
  it("uses one database RPC instead of split bid/outcome writes", () => {
    expect(service).toContain("kayad_reaward_auction_outcome_atomic");
    expect(service).toContain(".rpc(");
    const body = service.slice(service.indexOf("export async function reawardAuctionOutcome"));
    expect(body).not.toContain('updateMany("bids"');
    expect(body).not.toContain('updateMany("auction_outcomes"');
  });
  it("locks and validates the outcome, bid and bidder registration in SQL", () => {
    expect(migration).toMatch(/auction_outcomes[\s\S]*?FOR UPDATE/i);
    expect(migration).toMatch(/bids[\s\S]*?FOR UPDATE/i);
    expect(migration).toMatch(/auction_registrations[\s\S]*?FOR UPDATE/i);
    expect(migration).toContain("status = 'lost'");
    expect(migration).toContain("status = 'payment_due'");
    expect(migration).toContain("security_reconciliation_status = 'reconciled'");
  });
  it("does not credit refund-pending or refunded holds", () => {
    expect(migration).toContain("status = 'applied'");
    expect(migration).toContain("applied_outcome_id = v_outcome.id");
    expect(migration).toContain("status = 'refund_pending'");
    expect(migration).toContain("status = 'held'");
    expect(migration).toContain("refund_pending/refunded holds are never eligible");
  });
});
