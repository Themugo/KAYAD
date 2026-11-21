import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const AGENT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const T = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CAR = "99999999-9999-4999-8999-999999999999";

let tables;
const rpcCalls = [];
let rpcImpl;
let auditFail = false;

// Minimal chainable PostgREST stand-in (select/eq/in/is/ilike/order/range/limit/maybeSingle).
function from(name) {
  const f = [];
  let rangeArr = null;
  const q = {
    select: () => q,
    insert: async (row) => { if (auditFail) return { error: { message: "down" } }; (tables[name] = tables[name] || []).push(row); return { error: null }; },
    eq: (c, v) => (f.push((r) => r[c] === v), q),
    in: (c, vs) => (f.push((r) => vs.includes(r[c])), q),
    is: (c, v) => (f.push((r) => (r[c] ?? null) === v), q),
    ilike: () => q,
    order: () => q,
    limit: () => q,
    range: (a, b) => ((rangeArr = [a, b]), q),
    maybeSingle: async () => ({ data: (tables[name] || []).filter((r) => f.every((x) => x(r)))[0] || null, error: null }),
    then: (res, rej) => {
      let rows = (tables[name] || []).filter((r) => f.every((x) => x(r)));
      const total = rows.length;
      if (rangeArr) rows = rows.slice(rangeArr[0], rangeArr[1] + 1);
      return Promise.resolve({ data: rows, error: null, count: total }).then(res, rej);
    },
  };
  return q;
}
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: () => ({ from, rpc: async (n, a) => { rpcCalls.push([n, a]); return { data: await rpcImpl(n, a), error: null }; } }),
}));
const emit = jest.fn(async () => []);
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({
  emitCommunication: emit,
  COMMUNICATION_EVENTS: { SUPPORT_CASE_CREATED: "support.case_created", SUPPORT_CASE_UPDATED: "support.case_updated" },
}));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn() }));

const svc = await import("../../services/support/supportCase.service.js");
const pol = await import("../../services/support/supportPolicy.js");
const ser = await import("../../services/support/supportSerializers.js");
const { requireSupportStaff, requireSupportViewer, requireSupportAgent, supportCapability } = await import("../../middleware/supportAccess.js");

const ticket = (over = {}) => ({
  id: T, user_id: A, ticket_number: "SUP-20261009-000001", category: "escrow", priority: "high", subject: "Escrow stuck",
  description: "My escrow has not moved", status: "in_progress", assigned_to: AGENT, escalated_to: AGENT,
  related_car: null, related_escrow: null, related_payment: null, related_inspection: null, related_auction: null,
  first_response_at: "2026-10-09T08:00:00Z", resolved_at: null, closed_at: null, closed_by: AGENT, message_count: 3,
  satisfaction_rating: null, satisfaction_comment: null, resolution_notes: "STAFF ONLY", row_version: 4, sla: { firstResponseTarget: "x" },
  created_at: "2026-10-09T07:00:00Z", updated_at: "2026-10-09T08:00:00Z",
  messages: [
    { id: "m1", sender: A, senderKind: "customer", content: "help", isInternal: false, createdAt: "t1" },
    { id: "m2", sender: AGENT, senderKind: "staff", content: "INTERNAL: suspect fraud agent@kayad.co", isInternal: true, createdAt: "t2" },
    { id: "m3", sender: AGENT, senderKind: "staff", content: "We are checking", isInternal: false, createdAt: "t3" },
  ],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  auditFail = false;
  rpcCalls.length = 0;
  delete process.env.SUPPORT_SLA_FIRST_RESPONSE_MINUTES;
  delete process.env.SUPPORT_SLA_RESOLUTION_MINUTES;
  tables = {
    support_tickets: [ticket()],
    users: [{ id: A, name: "Alice", role: "user" }, { id: AGENT, name: "Agent", role: "technical_support" }],
    cars: [{ id: CAR, dealer_id: B, status: "hidden" }],
    escrows: [], payments: [], bids: [], auction_registrations: [], inspection_bookings: [], vehicle_inspections: [],
  };
  rpcImpl = async (n, a) => {
    if (n === "kayad_support_create_case") return { id: T, ticket_number: "SUP-20261009-000001", deduplicated: Boolean(a.p_idempotency_key === "dup") };
    if (n === "kayad_support_append_message") return { message: { id: "mm" }, status: "open", reopened: false };
    if (n === "kayad_support_update_case") return { id: T, status: a.p_status || "in_progress", previousStatus: "open", rowVersion: 5, userId: A };
    return {};
  };
});

describe("customer projection never leaks staff data", () => {
  test("detail removes internal notes, staff identities, SLA internals and staff fields", async () => {
    const d = await svc.getOwnCase({ id: A }, T);
    const json = JSON.stringify(d);
    expect(json).not.toContain("INTERNAL");
    expect(json).not.toContain("agent@kayad.co");
    expect(json).not.toContain("STAFF ONLY");
    for (const k of ["assigned_to", "assignedTo", "escalatedTo", "closedBy", "sla", "priority", "user_id", "row_version", "first_response_at"]) expect(json).not.toContain(`"${k}"`);
    expect(d.messages.map((m) => m.content)).toEqual(["help", "We are checking"]);
    expect(d.messages.map((m) => m.from)).toEqual(["you", "support"]);
  });
  test("another customer gets the same 404 as a missing case", async () => {
    await expect(svc.getOwnCase({ id: B }, T)).rejects.toMatchObject({ status: 404, code: "SUPPORT_TICKET_NOT_FOUND" });
    await expect(svc.getOwnCase({ id: B }, "00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ status: 404 });
    await expect(svc.getOwnCase({ id: A }, "not-a-uuid")).rejects.toMatchObject({ status: 404 });
  });
  test("list is filtered to the caller and exposes no staff fields", async () => {
    tables.support_tickets.push(ticket({ id: "11111111-1111-4111-8111-111111111111", user_id: B }));
    const out = await svc.listOwnCases({ id: A });
    expect(out.cases).toHaveLength(1);
    expect(JSON.stringify(out)).not.toMatch(/assign|priority|escalat/i);
  });
  test("SLA expectations are null unless operations configured targets", async () => {
    expect((await svc.getOwnCase({ id: A }, T)).expectations).toEqual({ firstResponseMinutes: null, resolutionMinutes: null });
    process.env.SUPPORT_SLA_FIRST_RESPONSE_MINUTES = "60";
    expect((await svc.getOwnCase({ id: A }, T)).expectations.firstResponseMinutes).toBe(60);
  });
});

describe("createCase", () => {
  test("ignores customer-supplied priority/status/assignment/sla and uses medium + configured targets only", async () => {
    await svc.createCase({ id: A, role: "admin" }, { category: "escrow", subject: "Escrow stuck", description: "My escrow has not moved", priority: "urgent", status: "closed", assignedTo: AGENT, sla: { x: 1 } });
    const [, a] = rpcCalls.find(([n]) => n === "kayad_support_create_case");
    expect(a.p_priority).toBe("medium");
    expect(a.p_user_id).toBe(A);
    expect(a.p_sla).toEqual({});
    expect(Object.keys(a)).not.toContain("p_status");
  });
  test("sets SLA targets only when configured", async () => {
    process.env.SUPPORT_SLA_FIRST_RESPONSE_MINUTES = "30";
    await svc.createCase({ id: A }, { category: "general", subject: "Hello", description: "A long enough description" });
    const [, a] = rpcCalls.find(([n]) => n === "kayad_support_create_case");
    expect(Object.keys(a.p_sla)).toEqual(["firstResponseTarget"]);
  });
  test("unowned reference is dropped and reported, case still created", async () => {
    const out = await svc.createCase({ id: A }, { category: "marketplace", subject: "Car issue", description: "About a hidden vehicle", reference: { kind: "vehicle", id: CAR } });
    expect(out.referenceLinked).toBe(false);
    expect(rpcCalls.find(([n]) => n === "kayad_support_create_case")[1].p_related.car).toBeNull();
  });
  test("owned escrow reference is linked", async () => {
    const E = "55555555-5555-4555-8555-555555555555";
    tables.escrows.push({ id: E, buyer: A, seller: B });
    const out = await svc.createCase({ id: A }, { category: "escrow", subject: "Escrow", description: "My escrow problem", reference: { kind: "escrow", id: E } });
    expect(out.referenceLinked).toBe(true);
    expect(rpcCalls.find(([n]) => n === "kayad_support_create_case")[1].p_related.escrow).toBe(E);
  });
  test("a stranger's escrow is not linked", async () => {
    const E = "55555555-5555-4555-8555-555555555555";
    tables.escrows.push({ id: E, buyer: B, seller: B });
    const out = await svc.createCase({ id: A }, { category: "escrow", subject: "Escrow", description: "Someone else's escrow", reference: { kind: "escrow", id: E } });
    expect(out.referenceLinked).toBe(false);
  });
  test("notifies in_app+email only, with a stable idempotency key and no issue content; none on duplicate", async () => {
    await svc.createCase({ id: A }, { category: "general", subject: "Secret subject", description: "Secret description text" });
    expect(emit).toHaveBeenCalledTimes(1);
    const p = emit.mock.calls[0][0];
    expect(p.channels).toEqual(["in_app", "email"]);
    expect(p.metadata.idempotencyKey).toBe(`support-created:${T}`);
    expect(JSON.stringify(p)).not.toContain("Secret");
    emit.mockClear();
    await svc.createCase({ id: A }, { category: "general", subject: "Secret subject", description: "Secret description text", idempotencyKey: "dup" });
    expect(emit).not.toHaveBeenCalled();
  });
});

describe("replies", () => {
  test("customer reply is always actor kind 'customer', whatever the app role says", async () => {
    await svc.customerReply({ id: A, role: "admin" }, T, { content: "hi", isInternal: true });
    const [, a] = rpcCalls.find(([n]) => n === "kayad_support_append_message");
    expect(a.p_actor_kind).toBe("customer");
    expect(a.p_is_internal).toBe(false);
  });
  test("customer cannot reply on someone else's case (no RPC call)", async () => {
    await expect(svc.customerReply({ id: B }, T, { content: "hi" })).rejects.toMatchObject({ status: 404 });
    expect(rpcCalls.find(([n]) => n === "kayad_support_append_message")).toBeUndefined();
  });
  test("internal staff note never notifies the customer; public reply does", async () => {
    await svc.staffReply({ id: AGENT }, T, { content: "note", isInternal: true });
    expect(emit).not.toHaveBeenCalled();
    await svc.staffReply({ id: AGENT }, T, { content: "public" });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0].userId).toBe(A);
    expect(JSON.stringify(emit.mock.calls[0][0])).not.toContain("public");
  });
  test("customer reply notifies the assignee in_app only", async () => {
    await svc.customerReply({ id: A }, T, { content: "any news?" });
    expect(emit.mock.calls[0][0]).toMatchObject({ userId: AGENT, channels: ["in_app"] });
  });
});

describe("validation", () => {
  test.each([
    [{ category: "insurance", subject: "abc", description: "long enough text" }, "SUPPORT_CATEGORY_INVALID"],
    [{ category: "general", subject: "ab", description: "long enough text" }, "SUPPORT_SUBJECT_REQUIRED"],
    [{ category: "general", subject: "abc", description: "short" }, "SUPPORT_DESCRIPTION_REQUIRED"],
    [{ category: "general", subject: "abc", description: "x".repeat(5001) }, "SUPPORT_DESCRIPTION_TOO_LONG"],
    [{ category: "general", subject: "abc", description: "long enough text", attachments: [{ url: "x" }] }, "SUPPORT_ATTACHMENTS_UNSUPPORTED"],
    [{ category: "general", subject: "abc", description: "long enough text", reference: { kind: "boat", id: "1" } }, "SUPPORT_REFERENCE_INVALID"],
    [{ category: "general", subject: "abc", description: "long enough text", idempotencyKey: "bad key!" }, "SUPPORT_IDEMPOTENCY_INVALID"],
  ])("create rejects %#", (body, code) => {
    try { pol.validateCreateInput(body); throw new Error("no throw"); } catch (e) { expect(e.code).toBe(code); }
  });
  test("rating bounds", () => {
    for (const r of [0, 6, 2.5, "x", null]) expect(() => pol.validateRatingInput({ rating: r })).toThrow();
    expect(pol.validateRatingInput({ rating: 5, comment: "  ok " })).toEqual({ rating: 5, comment: "ok" });
  });
  test("staff update: resolve needs a note; bad enums/uuids rejected; empty rejected", () => {
    expect(() => pol.validateStaffUpdate({ status: "resolved" })).toThrow(/resolution note/i);
    expect(() => pol.validateStaffUpdate({ status: "nope" })).toThrow();
    expect(() => pol.validateStaffUpdate({ priority: "critical" })).toThrow();
    expect(() => pol.validateStaffUpdate({ assignedTo: "x" })).toThrow();
    expect(() => pol.validateStaffUpdate({})).toThrow();
    expect(pol.validateStaffUpdate({ status: "resolved", resolutionNote: "Done" })).toMatchObject({ status: "resolved" });
  });
  test("transition table mirrors the DB function", () => {
    expect(pol.isTransitionAllowed("open", "closed")).toBe(false);
    expect(pol.isTransitionAllowed("closed", "open")).toBe(false);
    expect(pol.isTransitionAllowed("resolved", "closed")).toBe(true);
    expect(pol.isTransitionAllowed("in_progress", "resolved")).toBe(true);
  });
  test("database errors map to safe customer messages", () => {
    const e = pol.mapDbError({ message: "SUPPORT_TICKET_CLOSED" });
    expect(e).toMatchObject({ status: 409, code: "SUPPORT_TICKET_CLOSED" });
    expect(pol.mapDbError({ message: "relation \"x\" does not exist" })).toBeNull();
  });
});

describe("staff authorization", () => {
  const run = (user) => {
    const res = { code: 200, status(c) { this.code = c; return this; }, json() { return this; } };
    let nexted = false;
    requireSupportStaff({ user }, res, () => { nexted = true; });
    return { nexted, code: res.code };
  };
  test.each(["technical_support", "admin", "superadmin"])("%s may enter the support workspace (viewer gate)", (role) => expect(run({ id: AGENT, role }).nexted).toBe(true));
  test.each(["user", "dealer", "marketing", "hr", "accounts", "ad_manager", "moderator", "ghost_checker", "support", "staff"])("%s is not", (role) => expect(run({ id: AGENT, role })).toEqual({ nexted: false, code: 403 }));
  test("no user is 401", () => expect(run(null).code).toBe(401));
  test("staff list view shows customer name but never email", async () => {
    const q = await svc.listQueue({});
    expect(q.cases[0].customer).toEqual({ id: A, name: "Alice", role: "user" });
    expect(JSON.stringify(q)).not.toContain("@");
  });
  test("staff update calls RPC with explicit version and notifies only on a customer-relevant change", async () => {
    await svc.staffUpdate({ id: AGENT }, T, { status: "resolved", resolutionNote: "Fixed", expectedVersion: 4 });
    const [, a] = rpcCalls.find(([n]) => n === "kayad_support_update_case");
    expect(a).toMatchObject({ p_expected_version: 4, p_status: "resolved", p_resolution_note: "Fixed" });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0].metadata.idempotencyKey).toBe(`support-status:${T}:5`);
  });
});


describe("least-privilege capability matrix", () => {
  const cap = (role, extra = {}) => supportCapability({ id: AGENT, role, ...extra });
  test("only technical_support is an agent; admin/superadmin are read-only oversight", () => {
    expect(cap("technical_support")).toBe("agent");
    expect(cap("admin")).toBe("oversight");
    expect(cap("superadmin")).toBe("oversight");
  });
  test.each(["user", "dealer", "marketing", "hr", "accounts", "ad_manager", "moderator", "support", "staff"])("%s has no support capability", (role) => expect(cap(role)).toBeNull());
  test("agent-only gate rejects oversight roles with 403", () => {
    for (const role of ["admin", "superadmin"]) {
      const res = { code: 200, status(c) { this.code = c; return this; }, json() { return this; } };
      let next = false;
      requireSupportAgent({ user: { id: AGENT, role } }, res, () => { next = true; });
      expect({ next, code: res.code }).toEqual({ next: false, code: 403 });
    }
    let ok = false; requireSupportAgent({ user: { id: AGENT, role: "technical_support" } }, { status() { return this; }, json() {} }, () => { ok = true; });
    expect(ok).toBe(true);
  });
  test("viewer gate stamps the capability on the request", () => {
    const req = { user: { id: AGENT, role: "admin" } }; requireSupportViewer(req, {}, () => {});
    expect(req.supportCapability).toBe("oversight");
  });
});

describe("oversight access is reasoned, audited, redacted and read-only", () => {
  const admin = { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", role: "admin" };
  test("a reason is mandatory", async () => {
    await expect(svc.getStaffCase(T, admin, "oversight", undefined)).rejects.toMatchObject({ code: "SUPPORT_REASON_REQUIRED" });
    await expect(svc.getStaffCase(T, admin, "oversight", "short")).rejects.toMatchObject({ code: "SUPPORT_REASON_REQUIRED" });
  });
  test("oversight view contains no internal notes and records an audit row with the reason", async () => {
    const c = await svc.getStaffCase(T, admin, "oversight", "Escalated complaint review for QA");
    const json = JSON.stringify(c);
    expect(json).not.toContain("INTERNAL: suspect fraud");
    expect(json).not.toContain("STAFF ONLY");
    expect(c.readOnly).toBe(true);
    const row = tables.audit_logs.find((r) => r.action === "support.oversight_viewed");
    expect(row).toMatchObject({ actor_id: admin.id, entity_id: T });
    expect(row.details.reason).toBe("Escalated complaint review for QA");
  });
  test("fails closed: if the audit cannot be written the case is not returned", async () => {
    auditFail = true;
    await expect(svc.getStaffCase(T, admin, "oversight", "Escalated complaint review for QA")).rejects.toMatchObject({ status: 503, code: "SUPPORT_AUDIT_UNAVAILABLE" });
  });
  test("agent view includes internal notes and is audited", async () => {
    const c = await svc.getStaffCase(T, { id: AGENT, role: "technical_support" }, "agent");
    expect(JSON.stringify(c)).toContain("INTERNAL: suspect fraud");
    expect(c.readOnly).toBeFalsy();
    expect(tables.audit_logs.some((r) => r.action === "support.case_viewed")).toBe(true);
  });
});

describe("agents only work on unassigned or own cases", () => {
  const other = { id: "12121212-1212-4212-8212-121212121212", role: "technical_support" };
  test("another agent cannot reply or change status on a case assigned elsewhere", async () => {
    await expect(svc.staffReply(other, T, { content: "hi" })).rejects.toMatchObject({ status: 403, code: "SUPPORT_ASSIGNED_TO_OTHER" });
    await expect(svc.staffUpdate(other, T, { status: "resolved", resolutionNote: "x" })).rejects.toMatchObject({ code: "SUPPORT_ASSIGNED_TO_OTHER" });
    expect(rpcCalls.length).toBe(0);
  });
  test("an unassigned case can be worked, and take-over by reassignment is allowed", async () => {
    tables.support_tickets[0].assigned_to = null;
    await svc.staffReply(other, T, { content: "On it" });
    expect(rpcCalls.some(([n]) => n === "kayad_support_append_message")).toBe(true);
    tables.support_tickets[0].assigned_to = AGENT;
    await svc.staffUpdate(other, T, { assignedTo: other.id });
    expect(rpcCalls.some(([n]) => n === "kayad_support_update_case")).toBe(true);
  });
  test("assignable staff list contains only support agents", async () => {
    tables.users.push({ id: "ffffffff-ffff-4fff-8fff-ffffffffffff", name: "Adm", role: "admin", status: "approved" });
    const staff = await svc.listAssignableStaff();
    expect(JSON.stringify(staff)).not.toContain("Adm");
  });
});


describe("auction reference requires real participation", () => {
  const refs = () => import("../../services/support/supportReferences.js");
  test("seller, bidder and registered bidder may link; a stranger and a missing auction may not", async () => {
    const { resolveReference } = await refs();
    expect((await resolveReference({ kind: "auction", id: CAR }, B)).linked).toBe(true); // dealer/seller of the car
    expect((await resolveReference({ kind: "auction", id: CAR }, A)).linked).toBe(false); // stranger
    tables.bids.push({ id: "b1", car_id: CAR, user_id: A });
    expect((await resolveReference({ kind: "auction", id: CAR }, A)).linked).toBe(true); // bidder
    tables.bids.length = 0;
    tables.auction_registrations.push({ id: "r1", auction_id: CAR, bidder_id: A });
    expect((await resolveReference({ kind: "auction", id: CAR }, A)).linked).toBe(true); // registered, no bid yet
    expect((await resolveReference({ kind: "auction", id: "00000000-0000-4000-8000-000000000000" }, A)).linked).toBe(false);
  });
});
