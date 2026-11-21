// The party-facing escrow read model: what a buyer / seller may see, and which
// actions the backend will actually accept for them right now.
import { describe, test, expect } from "@jest/globals";
import { projectEscrowForViewer, summarizeForViewer, availableActionsFor, viewerRoleFor, REQUEST_RELEASE_STATES } from "../../utils/escrowViewModel.js";
import { STATES, validateTransition } from "../../services/escrowStateMachine.js";
import { escrowStaffCapabilities, escrowAdminOnly, escrowViewOnly, escrowOperateOnly, escrowReleaseOnly, escrowRefundOnly, escrowSettlementOnly, escrowReconcileOnly, requireEscrowPermission } from "../../utils/escrowAccess.js";
import { PERM } from "../../config/roles.js";

const B = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const X = "33333333-3333-4333-8333-333333333333";
const ID = "44444444-4444-4444-8444-444444444444";

const leakyUser = (id, name) => ({
  id, name, email: `${name}@private.test`, phone: "+254700000000", credits: 900, commissionBalance: 55, referralEarnings: 12,
  escrowCapabilityReason: "internal note", isBanned: false, role: "dealer", businessName: `${name} Motors`,
});
const row = (status, extra = {}) => ({
  id: ID, status, amount: 500000, commission: 25000, sellerAmount: 475000,
  buyer: leakyUser(B, "Buyer"), seller: leakyUser(S, "Seller"),
  car: { id: X, title: "Toyota", price: 600000, vin: "VIN123", registrationNumber: "KDA 001A", images: [{ url: "https://img/1" }, { url: "https://img/2" }], internalNotes: "x" },
  payment: { id: "p", phone: "+254711111111", mpesaReceipt: "RCPT", checkoutRequestId: "ws_CO_1" },
  createdAt: new Date("2026-01-01"), disputeInternalNotes: [{ note: "staff only" }],
  disputeEvidence: [{ type: "photo", fileName: "a.jpg", mimeType: "image/jpeg", size: 10, url: "https://secret/a", publicId: "pid", uploadedBy: B }],
  disputeTimeline: [{ action: "opened", at: "t", note: "n", actor: B }],
  ...extra,
});

describe("projectEscrowForViewer — counterparty and payment data never leave the server", () => {
  const serialized = (viewer) => JSON.stringify(projectEscrowForViewer(row(STATES.FUNDED), viewer));

  test.each([
    ["buyer", { id: B, role: "user" }],
    ["seller", { id: S, role: "dealer" }],
    ["staff", { id: X, role: "admin" }],
  ])("%s receives no contact, balance, payment or internal fields", (_n, viewer) => {
    const s = serialized(viewer);
    for (const forbidden of ["private.test", "254700000000", "254711111111", "RCPT", "ws_CO_1", "internal note", "credits", "commissionBalance", "referralEarnings", "escrowCapabilityReason", "isBanned", "staff only", "https://secret", "publicId", "internalNotes", "disputeInternalNotes"]) {
      expect(s).not.toContain(forbidden);
    }
  });

  test("counterparties are reduced to id + name, only one car image is returned", () => {
    const p = projectEscrowForViewer(row(STATES.FUNDED), { id: B, role: "user" });
    expect(p.buyer).toEqual({ id: B, name: "Buyer" });
    expect(p.seller).toEqual({ id: S, name: "Seller", businessName: "Seller Motors" });
    expect(p.car.images).toEqual([{ url: "https://img/1" }]);
  });

  test("the fee split is visible to the seller and staff, not to the buyer", () => {
    expect(projectEscrowForViewer(row(STATES.RELEASED), { id: B, role: "user" })).not.toHaveProperty("commission");
    expect(projectEscrowForViewer(row(STATES.RELEASED), { id: B, role: "user" })).not.toHaveProperty("sellerAmount");
    expect(projectEscrowForViewer(row(STATES.RELEASED), { id: S, role: "dealer" }).sellerAmount).toBe(475000);
    expect(projectEscrowForViewer(row(STATES.RELEASED), { id: X, role: "admin" }).commission).toBe(25000);
  });

  test("works for both populated and bare-id parties", () => {
    const bare = projectEscrowForViewer({ ...row(STATES.FUNDED), buyer: B, seller: S, car: X }, { id: B, role: "user" });
    expect(bare.viewerRole).toBe("buyer");
    expect(bare.buyer.id).toBe(B);
    expect(bare.car.id).toBe(X);
  });
});

describe("availableActions are derived from the same state machine the endpoints enforce", () => {
  const all = Object.values(STATES);
  test.each(all)("buyer @ %s", (status) => {
    const a = availableActionsFor({ status }, "buyer");
    expect(a.includes("confirm_vehicle")).toBe(validateTransition(status, STATES.VEHICLE_CONFIRMED, "buyer", {}).allowed);
    expect(a.includes("open_dispute")).toBe(validateTransition(status, STATES.DISPUTED, "buyer", {}).allowed);
    expect(a.includes("request_release")).toBe(REQUEST_RELEASE_STATES.includes(status));
    expect(a.includes("view_funding_instructions")).toBe(status === STATES.PENDING);
    expect(a).not.toContain("confirm_delivery");
  });
  test.each(all)("seller @ %s", (status) => {
    const a = availableActionsFor({ status }, "seller");
    expect(a.includes("confirm_delivery")).toBe(validateTransition(status, STATES.DELIVERED, "seller", {}).allowed);
    expect(a.includes("open_dispute")).toBe(validateTransition(status, STATES.DISPUTED, "seller", {}).allowed);
    expect(a).not.toContain("confirm_vehicle");
    expect(a).not.toContain("request_release");
  });
  test("staff and unrelated viewers are offered no party actions", () => {
    for (const s of all) { expect(availableActionsFor({ status: s }, "staff")).toEqual([]); expect(availableActionsFor({ status: s }, null)).toEqual([]); }
  });
  test("terminal and released escrows offer a party nothing", () => {
    for (const s of [STATES.REFUNDED, STATES.CLOSED, STATES.RELEASED, STATES.DISPUTED]) {
      expect(availableActionsFor({ status: s }, "buyer")).toEqual([]);
      expect(availableActionsFor({ status: s }, "seller")).toEqual([]);
    }
  });
  test("the funded → delivered shortcut is not offered: delivery needs the buyer's vehicle confirmation first", () => {
    expect(availableActionsFor({ status: STATES.FUNDED }, "seller")).not.toContain("confirm_delivery");
    expect(availableActionsFor({ status: STATES.VEHICLE_CONFIRMED }, "seller")).toContain("confirm_delivery");
  });
  test("viewerRole: party beats staff; strangers get null", () => {
    const e = { buyer: B, seller: S };
    expect(viewerRoleFor(e, { id: B, role: "admin" })).toBe("buyer");
    expect(viewerRoleFor(e, { id: X, role: "admin" })).toBe("staff");
    expect(viewerRoleFor(e, { id: X, role: "user" })).toBeNull();
    expect(viewerRoleFor(e, null)).toBeNull();
  });
});

describe("summarizeForViewer — scoped, honest totals", () => {
  const p = (status, amount, actions = []) => ({ status, amount, availableActions: actions });
  test("held means funded / vehicle_confirmed / delivered / disputed; pending is not held; released is settled", () => {
    const s = summarizeForViewer([p("pending", 100), p("funded", 200, ["confirm_vehicle"]), p("delivered", 300), p("disputed", 400), p("released", 500), p("refunded", 600), p("closed", 700)]);
    expect(s).toMatchObject({ scope: "participant", currency: "KES", totalDeals: 7, heldAmount: 900, heldCount: 3, pendingFundingCount: 1, activeCount: 4, settledCount: 3, needsActionCount: 1 });
  });
  test("an empty list is zero deals, flagged by scope — not a platform balance", () => {
    expect(summarizeForViewer([])).toMatchObject({ scope: "participant", totalDeals: 0, heldAmount: 0 });
  });
});

describe("escrowStaffCapabilities mirrors the route middleware for every role", () => {
  const run = (mw, user) => { let code = null; const res = { status(c) { code = c; return this; }, json() { return this; } }; let passed = false; mw({ user }, res, () => { passed = true; }); return passed; };
  const roles = ["user", "individual_seller", "dealer", "moderator", "ghost_checker", "accounts", "escrow_officer", "technical_support", "hr", "admin", "superadmin"];
  const pairs = [
    ["view", [escrowViewOnly]],
    ["operate", [escrowOperateOnly]],
    ["reconcile", [escrowReconcileOnly]],
    ["settle", [escrowSettlementOnly]],
    ["release", [escrowAdminOnly, escrowReleaseOnly]],
    ["refund", [escrowAdminOnly, escrowRefundOnly]],
    ["completeRefund", [escrowAdminOnly, escrowSettlementOnly]],
    ["close", [escrowAdminOnly, requireEscrowPermission(PERM.EMERGENCY_ESCROW_CONTROL)]],
  ];
  test.each(roles.flatMap((r) => pairs.map((p) => [r, ...p])))("%s / %s", (role, cap, chain) => {
    const user = { id: X, role };
    const viaMiddleware = chain.every((mw) => run(mw, user));
    expect(escrowStaffCapabilities(user)[cap]).toBe(viaMiddleware);
  });
  test("webhoist owner and anonymous", () => {
    const owner = { id: X, role: "superadmin", effectiveRole: "webhoist" };
    expect(Object.values(escrowStaffCapabilities(owner)).every(Boolean)).toBe(true);
    expect(Object.values(escrowStaffCapabilities(null)).some(Boolean)).toBe(false);
  });
  test("moderator can open a dispute through the party endpoint but holds no money-moving capability", () => {
    const c = escrowStaffCapabilities({ id: X, role: "moderator" });
    expect(c.release || c.refund || c.close || c.settle).toBe(false);
  });
});

import { staffActionsFor } from "../../utils/escrowViewModel.js";
describe("staffActionsFor — permission AND state", () => {
  const admin = escrowStaffCapabilities({ id: X, role: "admin" });
  const officer = escrowStaffCapabilities({ id: X, role: "escrow_officer" });
  const accounts = escrowStaffCapabilities({ id: X, role: "accounts" });
  const a = (status, caps, extra) => staffActionsFor({ status }, caps, extra);

  test("pending: only someone who may reconcile can verify funding", () => {
    expect(a("pending", admin)).toContain("verify_funding");
    expect(a("pending", accounts)).toContain("verify_funding");
    expect(a("pending", escrowStaffCapabilities({ id: X, role: "moderator" }))).not.toContain("verify_funding");
  });
  test("release is offered only from delivered or disputed (the DB refuses admin release from funded/vehicle_confirmed)", () => {
    for (const s of ["delivered", "disputed"]) expect(a(s, admin)).toContain("release");
    for (const s of ["pending", "funded", "vehicle_confirmed", "released", "refunded", "closed"]) expect(a(s, admin)).not.toContain("release");
  });
  test("refund only from disputed; close only from released", () => {
    expect(a("disputed", admin)).toContain("refund");
    expect(a("delivered", admin)).not.toContain("refund");
    expect(a("released", admin)).toContain("close");
    expect(a("disputed", admin)).not.toContain("close");
  });
  test("the escrow officer operates but cannot move money", () => {
    for (const s of Object.values(STATES)) expect(a(s, officer).filter((x) => ["release", "refund", "close", "complete_refund", "payout"].includes(x))).toEqual([]);
  });
  test("payout is offered after release unless one is already processing or paid", () => {
    expect(a("released", accounts)).toContain("payout");
    expect(a("released", accounts, { payout: { status: "processing" } })).not.toContain("payout");
    expect(a("released", accounts, { payout: { status: "paid" } })).not.toContain("payout");
    expect(a("released", accounts, { payout: { status: "failed" } })).toContain("payout");
    expect(a("delivered", accounts)).not.toContain("payout");
  });
  test("complete_refund needs a pending refund record", () => {
    expect(a("refunded", admin, { refund: { status: "pending" } })).toContain("complete_refund");
    expect(a("refunded", admin, { refund: { status: "completed" } })).not.toContain("complete_refund");
    expect(a("refunded", admin)).not.toContain("complete_refund");
  });
  test("no capabilities, no actions", () => { for (const s of Object.values(STATES)) expect(staffActionsFor({ status: s }, null)).toEqual([]); });
});
