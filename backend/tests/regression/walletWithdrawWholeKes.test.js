// Write-route audit finding W-1: wallet withdrawals must be whole KES (rounding in the DB function must never be reached silently).
import { jest, describe, test, expect } from "@jest/globals";
const withdraw = jest.fn(async () => ({ id: "w1", status: "processing" }));
jest.unstable_mockModule("../../services/auctionWallet.service.js", () => ({ getWallet: jest.fn(), refundHold: jest.fn(), withdraw }));
jest.unstable_mockModule("../../services/dealerPaymentAccount.service.js", () => ({ saveDealerPaymentAccount: jest.fn(), getDealerPaymentAccount: jest.fn(), reviewDealerPaymentAccount: jest.fn(), listDealerPaymentAccounts: jest.fn() }));
jest.unstable_mockModule("../../middleware/auth.js", () => ({ protect: (req, res, next) => { req.user = { id: "u1", role: "user" }; next(); }, adminOnly: (q, r, n) => n(), allowRoles: () => (q, r, n) => n() }));
const { default: router } = await import("../../routes/walletRoutes.js");
const call = async (body) => {
  const layer = router.stack.find((l) => l.route?.path === "/withdraw" && l.route.methods.post);
  const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  const req = { body, user: { id: "u1" } };
  for (const h of layer.route.stack) { await new Promise((ok, no) => { try { const r = h.handle(req, res, (e) => (e ? no(e) : ok())); Promise.resolve(r).then(() => ok(), no); } catch (e) { no(e); } }); if (res.body) break; }
  return res;
};
describe("POST /api/wallet/withdraw amount validation", () => {
  test.each([[10.5], ["10.5"], [0], [-5], ["abc"], [1e30]])("rejects %p before reaching the wallet service", async (amount) => {
    withdraw.mockClear();
    const res = await call({ amount });
    expect(res.statusCode).toBe(422);
    expect(withdraw).not.toHaveBeenCalled();
  });
  test("accepts a whole-KES amount and passes it unchanged", async () => {
    withdraw.mockClear();
    const res = await call({ amount: 500, idempotencyKey: "k1" });
    expect(res.body.success).toBe(true);
    expect(withdraw).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", amount: 500, key: "wd:u1:k1" }));
  });
});
