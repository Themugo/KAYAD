import { jest } from "@jest/globals";

const rpc = jest.fn();
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc }) }));
jest.unstable_mockModule("../../db/index.js", () => ({ findAll: jest.fn().mockResolvedValue([]), findById: jest.fn().mockResolvedValue(null) }));
const svc = await import("../../services/privateSellerAuctionProposal.service.js");
const P = "11111111-1111-4111-8111-111111111111";
const U = "33333333-3333-4333-8333-333333333333";

beforeEach(() => rpc.mockReset());

describe("proposal service: capacity is fixed by the mount point and re-verified by the database", () => {
  test("a seller route cannot send provider/admin events (no DB call made)", async () => {
    for (const ev of ["inspection_result", "custody_received", "admin_decision", "authority_verified", "release_authorized", "appeal_decision"]) {
      await expect(svc.applyEvent({ proposalId: P, event: ev, actorUserId: U, actorRole: "seller", payload: {}, idem: "k-12345678" })).rejects.toMatchObject({ status: 403, code: "FORBIDDEN_EVENT_FOR_ROLE" });
    }
    expect(rpc).not.toHaveBeenCalled();
  });
  test("a provider route cannot approve or decide", async () => {
    for (const ev of ["admin_decision", "custody_assigned", "appeal_decision", "evidence_submitted"]) {
      await expect(svc.applyEvent({ proposalId: P, event: ev, actorUserId: U, actorRole: "provider", idem: "k-12345678" })).rejects.toMatchObject({ status: 403 });
    }
  });
  test("unknown role/event is refused; non-UUID proposal is 400", async () => {
    await expect(svc.applyEvent({ proposalId: P, event: "x", actorUserId: U, actorRole: "root", idem: "k" })).rejects.toMatchObject({ status: 403 });
    await expect(svc.applyEvent({ proposalId: "nope", event: "evidence_submitted", actorUserId: U, actorRole: "seller", idem: "k-12345678" })).rejects.toMatchObject({ status: 400 });
  });
  test("allowed event passes actor, role and idempotency key to the single DB writer", async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null });
    await svc.applyEvent({ proposalId: P, event: "proposal_submitted", actorUserId: U, actorRole: "seller", payload: { a: 1 }, idem: "k-12345678" });
    expect(rpc).toHaveBeenCalledWith("kayad_psap_apply_event", { p_proposal_id: P, p_event: "proposal_submitted", p_actor_user_id: U, p_actor_role: "seller", p_payload: { a: 1 }, p_idem: "k-12345678" });
  });
  test("DB authorisation failures map to 403/409/422, unknown DB failures never leak as 200 or raw text", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "NOT_AN_ADMIN", code: "42501" } });
    await expect(svc.applyEvent({ proposalId: P, event: "admin_decision", actorUserId: U, actorRole: "admin", idem: "k-12345678" })).rejects.toMatchObject({ status: 403 });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "INVALID_TRANSITION" } });
    await expect(svc.applyEvent({ proposalId: P, event: "proposal_submitted", actorUserId: U, actorRole: "seller", idem: "k-12345678" })).rejects.toMatchObject({ status: 409 });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "connection to server at 10.0.0.1 failed" } });
    await expect(svc.applyEvent({ proposalId: P, event: "proposal_submitted", actorUserId: U, actorRole: "seller", idem: "k-12345678" })).rejects.toMatchObject({ status: 500, message: "Request could not be completed" });
  });
  test("capability: only partners request, only admins approve/suspend/revoke; only garage/dealer kinds", async () => {
    await expect(svc.applyCapabilityAction({ providerId: P, providerKind: "garage", action: "approve", actorUserId: U, actorRole: "provider" })).rejects.toMatchObject({ status: 403 });
    await expect(svc.applyCapabilityAction({ providerId: P, providerKind: "garage", action: "request", actorUserId: U, actorRole: "admin" })).rejects.toMatchObject({ status: 403 });
    await expect(svc.applyCapabilityAction({ providerId: P, providerKind: "escrow_agent", action: "request", actorUserId: U, actorRole: "provider" })).rejects.toMatchObject({ status: 422 });
    expect(rpc).not.toHaveBeenCalled();
  });
  test("Idempotency-Key is mandatory for mutations", () => {
    expect(() => svc.requireIdempotencyKey({ get: () => "", headers: {} })).toThrow(/Idempotency-Key/);
    expect(svc.requireIdempotencyKey({ get: () => "abcdefgh-1", headers: {} })).toBe("abcdefgh-1");
  });
});
