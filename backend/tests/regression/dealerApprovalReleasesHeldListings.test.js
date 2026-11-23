import { describe, test, expect, jest } from "@jest/globals";
import { approveDealer } from "../../services/dealerApproval.service.js";
import { PAPERWORK_ITEMS } from "../../config/dealerPaperwork.js";

const noPaperwork = Object.fromEntries(Object.keys(PAPERWORK_ITEMS).map((k) => [k, { enabled: false, required: false }]));

const deps = (over = {}) => ({
  findDealer: async () => ({ businessName: "ABC Motors", location: "Nairobi", approved: false }),
  findVerification: async () => ({ verificationStatus: "pending", submittedAt: new Date().toISOString(), documents: {} }),
  findUser: async (id) => ({ id, role: "dealer", status: "pending", emailVerified: true }),
  getPolicy: async () => ({ items: noPaperwork }),
  rpc: jest.fn(async () => ({ data: { ok: true }, error: null })),
  releaseHeldListings: jest.fn(async () => 2),
  ...over,
});

describe("approving a dealer releases the listings held while it was pending", () => {
  test("held listings are released after the atomic approval and the count is reported", async () => {
    const d = deps();
    const out = await approveDealer({ user: { id: "dealer-1", role: "dealer", status: "pending" }, actorId: "admin-1", reason: "Documents checked and complete." }, d);
    expect(out).toMatchObject({ changed: true, releasedListings: 2, releaseError: null });
    expect(d.rpc).toHaveBeenCalledTimes(1);
    expect(d.releaseHeldListings).toHaveBeenCalledWith("dealer-1");
    expect(d.rpc.mock.invocationCallOrder[0]).toBeLessThan(d.releaseHeldListings.mock.invocationCallOrder[0]);
  });
  test("a failure releasing listings never undoes or fails the approval, and is reported", async () => {
    const d = deps({ releaseHeldListings: jest.fn(async () => { throw new Error("db down"); }) });
    const out = await approveDealer({ user: { id: "dealer-1", role: "dealer", status: "pending" }, actorId: "admin-1", reason: "Documents checked and complete." }, d);
    expect(out).toMatchObject({ changed: true, releasedListings: 0, releaseError: "db down" });
  });
  test("a refused approval releases nothing", async () => {
    const d = deps({ findVerification: async () => null });
    await expect(approveDealer({ user: { id: "dealer-1", role: "dealer", status: "pending" }, actorId: "admin-1", reason: "Documents checked and complete." }, d)).rejects.toMatchObject({ code: "DEALER_APPLICATION_INCOMPLETE" });
    expect(d.releaseHeldListings).not.toHaveBeenCalled();
  });
});
