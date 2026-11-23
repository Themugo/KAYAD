import { describe, test, expect, jest } from "@jest/globals";
process.env.NODE_ENV = "test";
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({}) }));
const S = await import("../../services/dealerCommandCentre.service.js");

const NOW = new Date("2026-11-22T12:00:00Z");
const e = (id, status, amount, commission, extra = {}) => ({ id, status, amount, commission, sellerAmount: amount - commission, fundedAt: status === "pending" ? null : "2026-11-01T00:00:00Z", ...extra });

describe("financial definitions (reports/DEALER-FINANCIAL-DEFINITIONS.md)", () => {
  const escrows = [
    e("e1", "released", 1000000, 50000), e("e2", "closed", 2000000, 100000), e("e3", "released", 500000, 25000), e("e4", "released", 800000, 40000),
    e("e5", "funded", 3000000, 150000), e("e6", "delivered", 1000000, 50000), e("e7", "vehicle_confirmed", 400000, 20000),
    e("e8", "disputed", 700000, 35000), e("e9", "refunded", 900000, 45000), e("e10", "pending", 600000, 30000),
  ];
  const payouts = [
    { escrow: "e1", status: "paid", net_amount: 950000 }, { escrow: "e3", status: "processing", net_amount: 475000 }, { escrow: "e4", status: "failed", net_amount: 760000 },
  ];
  const refunds = [{ escrow_id: "e9", amount: 900000, status: "completed" }, { escrow_id: "e8", amount: 100, status: "pending" }, { escrow_id: "foreign", amount: 5, status: "completed" }];
  const f = S.summariseFinancials({ escrows, payouts, refunds, now: NOW, settlements: [
    { status: "awaiting_payment", agreed_amount: 1500000, expires_at: "2026-12-01T00:00:00Z" }, { status: "awaiting_payment", agreed_amount: 999, expires_at: "2026-11-01T00:00:00Z" },
  ], outcomes: [{ status: "payment_due", winning_amount: 2500000 }, { status: "completed", winning_amount: 777 }] });

  test("gross, revenue and fees count only released and closed escrows, and gross = revenue + fees", () => {
    expect(f.grossSales).toEqual({ amount: 4300000, count: 4 });
    expect(f.releasedRevenue.amount).toBe(1000000 - 50000 + 2000000 - 100000 + 500000 - 25000 + 800000 - 40000);
    expect(f.platformFees.amount).toBe(215000);
    expect(f.grossSales.amount).toBe(f.releasedRevenue.amount + f.platformFees.amount);
  });
  test("held escrow is never released revenue; pending (unfunded) escrow is not held", () => {
    expect(f.escrowHeld).toEqual({ amount: 2850000 + 950000 + 380000, gross: 4400000, count: 3 });
    expect(f.releasedRevenue.amount).not.toBe(f.releasedRevenue.amount + f.escrowHeld.amount);
    expect(f.escrowDisputed.count).toBe(1);
  });
  test("pending payout = released escrows without a paid payout, split by payout state", () => {
    expect(f.pendingPayout.inProgress).toEqual({ count: 1, amount: 475000 });
    expect(f.pendingPayout.failed).toEqual({ count: 1, amount: 760000 });
    expect(f.pendingPayout.notRequested.count).toBe(0);
    expect(f.pendingPayout.amount).toBe(1235000);
    expect(f.completedPayout).toEqual({ amount: 950000, count: 1 });
  });
  test("reconciliation: revenue = completed payout + pending payout + closed-without-payout", () => {
    expect(f.reconciliation.closedWithoutPayout).toEqual({ count: 1, amount: 1900000 });
    expect(f.releasedRevenue.amount).toBe(f.completedPayout.amount + f.pendingPayout.amount + f.reconciliation.closedWithoutPayout.amount);
  });
  test("refunds only for this dealership's escrows; open refunds counted separately", () => {
    expect(f.refunds).toMatchObject({ amount: 900000, count: 1, openCount: 1, refundedDeals: 1 });
  });
  test("pending settlement counts unexpired awaiting-payment settlements and payment-due auctions, not other statuses", () => {
    expect(f.pendingSettlement.amount).toBe(1500000 + 2500000);
    expect(f.pendingSettlement.offerSettlements.count).toBe(1);
  });
  test("outstanding receivables = held + pending payout; transaction volume = funded escrows only", () => {
    expect(f.outstandingReceivables.amount).toBe(f.escrowHeld.amount + f.pendingPayout.amount);
    expect(f.transactionVolume.count).toBe(9);
    expect(f.transactionVolume.gross).toBe(escrows.filter((x) => x.fundedAt).reduce((s, x) => s + x.amount, 0));
  });
  test("an empty dealership yields real zeros, not placeholders", () => {
    const z = S.summariseFinancials({ now: NOW });
    expect(z.releasedRevenue.amount).toBe(0); expect(z.pendingPayout.amount).toBe(0); expect(z.transactionVolume.count).toBe(0);
  });
  test("escrowNet falls back to amount − commission when sellerAmount is empty", () => {
    expect(S.escrowNet({ amount: 1000, commission: 40, sellerAmount: null })).toBe(960);
  });
});

describe("access mirrors the existing role matrix (never wider)", () => {
  const perms = (...k) => Object.fromEntries(k.map((x) => [x, true]));
  const roles = {
    owner: { isOwner: true, permissions: {} },
    manager: { permissions: perms("canListCars", "canEditCars", "canDeleteCars", "canViewEarnings", "canApproveDeals", "canChatBuyers", "canEditSettings") },
    sales_agent: { permissions: perms("canListCars", "canEditCars", "canChatBuyers") },
    lot_agent: { permissions: perms("canListCars", "canEditCars") },
    finance_officer: { permissions: perms("canViewEarnings", "canApproveDeals") },
    viewer: { permissions: {} },
  };
  const a = Object.fromEntries(Object.entries(roles).map(([k, v]) => [k, S.resolveAccess(v)]));
  test("owner sees everything", () => expect(a.owner).toEqual({ owner: true, inventory: true, leads: true, revenue: true, team: true, auctions: true, finance: true }));
  test("only the owner reaches escrow, payout, refund and fee figures", () => { for (const k of Object.keys(roles)) expect(a[k].finance).toBe(k === "owner"); });
  test("manager: no team, no finance; sees listings, leads, revenue, auctions", () => expect(a.manager).toMatchObject({ inventory: true, leads: true, revenue: true, team: false, finance: false, auctions: true }));
  test("sales agent: listings and leads, no revenue/team/finance", () => expect(a.sales_agent).toMatchObject({ inventory: true, leads: true, revenue: false, team: false, finance: false }));
  test("lot agent: listings/auctions only", () => expect(a.lot_agent).toMatchObject({ inventory: true, auctions: true, leads: false, revenue: false }));
  test("finance officer: revenue only", () => expect(a.finance_officer).toMatchObject({ revenue: true, inventory: false, leads: false, team: false, finance: false }));
  test("viewer: nothing", () => expect(Object.values(a.viewer).every((v) => v === false)).toBe(true));
  test("custom role with canManageTeam gets team only", () => expect(S.resolveAccess({ permissions: perms("canManageTeam") })).toMatchObject({ team: true, inventory: false, finance: false }));
});

describe("business, leads, offers, auctions, team", () => {
  test("listing counts: active/pending/draft/sold, soft-deleted excluded", () => {
    const l = S.summariseListings([{ status: "available" }, { status: "active" }, { status: "pending" }, { status: "draft" }, { status: "sold", sold: true }, { status: "available", sold: true }, { status: "available", deleted_at: "x" }]);
    expect(l).toMatchObject({ total: 6, active: 3, pendingApproval: 1, draft: 1, sold: 2 });
  });
  test("new enquiries, >24h unanswered, offers awaiting the dealer's decision (not expired, not sent by the dealer)", () => {
    const r = S.summariseLeadsAndOffers({ dealerId: "d1", now: NOW,
      leads: [{ stage: "new", created_at: "2026-11-22T11:00:00Z" }, { stage: "new", created_at: "2026-11-20T00:00:00Z", first_response_time: null }, { stage: "new", created_at: "2026-11-20T00:00:00Z", first_response_time: 5 }, { stage: "new", archived: true, created_at: "2026-11-01T00:00:00Z" }, { stage: "sold" }],
      offers: [{ status: "pending", recipient_id: "d1", expires_at: "2026-11-30T00:00:00Z" }, { status: "pending", recipient_id: "buyer" }, { status: "pending", recipient_id: "d1", expires_at: "2026-11-01T00:00:00Z" }, { status: "accepted", recipient_id: "d1" }] });
    expect(r).toMatchObject({ newEnquiries: 3, unansweredLeads: 1, offersAwaitingDecision: 1, totalLeads: 5 });
  });
  test("auctions: valid bids come from paid bids; ended live auctions are completed", () => {
    const a = S.summariseAuctions({ now: NOW, cars: [
      { id: "a", title: "A", auction_status: "live", auction_end: "2026-11-23T00:00:00Z" }, { id: "b", title: "B", auction_status: "live", auction_end: "2026-11-21T00:00:00Z" },
      { id: "c", title: "C", auction_status: "upcoming" }, { id: "d", auction_status: "ended" }, { id: "e", auction_status: "none" } ],
      paidBidStats: new Map([["a", { count: 3, highest: 900000 }]]), outcomes: [{ status: "payment_due" }, { status: "completed" }, { status: "defaulted" }] });
    expect(a).toMatchObject({ active: 1, upcoming: 1, completed: 2, validBids: 3, outcomesRequiringAttention: 2 });
    expect(a.live[0]).toMatchObject({ id: "a", validBids: 3, highestValidBid: 900000 });
  });
  test("team: outstanding invitations exclude expired; membership changes and authorised activity are named", () => {
    const t = S.summariseTeam({ now: NOW, names: new Map([["u1", "Amina"]]),
      members: [{ id: "m1", member: "u1", role: "manager", status: "active", created_at: "2026-11-10T00:00:00Z" }, { id: "m2", role: "viewer", status: "invited", invite_email: "x@example.test", invite_expires_at: "2026-12-01T00:00:00Z", created_at: "2026-11-11T00:00:00Z" }, { id: "m3", role: "viewer", status: "invited", invite_email: "old@example.test", invite_expires_at: "2026-11-01T00:00:00Z", created_at: "2026-10-01T00:00:00Z" }],
      events: [{ id: "ev", actor_type: "dealer_staff", actor_user_id: "u1", action: "dealer_mark_sold", created_at: "2026-11-21T00:00:00Z" }] });
    expect(t).toMatchObject({ outstandingInvitations: 1, expiredInvitations: 1, activeMembers: 1 });
    expect(t.activity[0].message).toBe("Amina marked a vehicle sold");
  });
  test("attention queue: only sections the caller may see, sorted critical first, every item has a destination", () => {
    const fin = S.summariseFinancials({ escrows: [e("e1", "released", 100, 5), e("e2", "disputed", 100, 5)], payouts: [], now: NOW });
    const owner = S.buildAttentionQueue({ access: S.resolveAccess({ isOwner: true }), listings: { draft: 2 }, leadStats: { newEnquiries: 1, unansweredLeads: 0, offersAwaitingDecision: 2 }, financial: fin, team: { outstandingInvitations: 1 }, auctions: { outcomesRequiringAttention: 1 } });
    expect(owner[0].severity).toBe("critical");
    expect(owner.every((i) => i.target.section && i.count > 0)).toBe(true);
    const agent = S.buildAttentionQueue({ access: S.resolveAccess({ permissions: { canChatBuyers: true } }), listings: { draft: 2 }, leadStats: { newEnquiries: 1, unansweredLeads: 0, offersAwaitingDecision: 2 }, financial: fin, team: { outstandingInvitations: 1 }, auctions: { outcomesRequiringAttention: 1 } });
    expect(agent.map((i) => i.id).sort()).toEqual(["new-enquiries", "offers-awaiting"]);
  });
  test("loader requires a server-supplied dealership id", async () => {
    await expect(S.loadCommandCentre({ dealerId: null, org: { isOwner: true } })).rejects.toThrow("dealerId is required");
  });
  describe("a database that lacks a source table (migration not yet applied)", () => {
    const missing = (name) => ({ code: "PGRST205", message: `Could not find the table 'public.${name}' in the schema cache` });
    // chainable PostgREST stand-in: every builder method returns the same thenable; tables listed in `absent` answer with a missing-table error
    const fakeSb = (absent) => ({ from: (table) => { const res = absent.includes(table) ? { data: null, error: missing(table) } : { data: [], error: null }; const b = new Proxy({}, { get: (_t, p) => (p === "then" ? (ok) => Promise.resolve(res).then(ok) : () => b) }); return b; } });
    test("isMissingRelation recognises PostgREST and PostgreSQL missing-table errors only", () => {
      expect(S.isMissingRelation({ code: "42P01" })).toBe(true);
      expect(S.isMissingRelation(missing("x"))).toBe(true);
      expect(S.isMissingRelation({ code: "42501", message: "permission denied for table escrows" })).toBe(false);
      expect(S.isMissingRelation(null)).toBe(false);
    });
    test("missing offers/settlements/outcomes/lifecycle tables are reported as unavailable, never as a figure", async () => {
      const out = await S.loadCommandCentre({ dealerId: "d1", org: { isOwner: true }, sb: fakeSb(["marketplace_offers", "marketplace_offer_settlements", "auction_outcomes", "dealer_listing_lifecycle_events"]) });
      expect(out.unavailable.sort()).toEqual(["auction_outcomes", "offers", "settlements", "team_activity"]);
      expect(out.financial.releasedRevenue.amount).toBe(0);
    });
    test("a missing CORE table (escrows) is NOT swallowed: the endpoint fails loudly", async () => {
      await expect(S.loadCommandCentre({ dealerId: "d1", org: { isOwner: true }, sb: fakeSb(["escrows"]) })).rejects.toBeTruthy();
    });
    test("nothing is reported unavailable on a complete schema", async () => {
      const out = await S.loadCommandCentre({ dealerId: "d1", org: { isOwner: true }, sb: fakeSb([]) });
      expect(out.unavailable).toEqual([]);
    });
  });
});
