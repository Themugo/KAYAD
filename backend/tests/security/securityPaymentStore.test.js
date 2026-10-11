// MOCKED unit tests (injected db functions) for the auction security-payment store. Real-database behaviour:
// docs/messaging-consistency-audit/harness/tests/m13-auction-security-payments.test.mjs.
import { describe, it, expect, jest } from "@jest/globals";
import { findSecurityPaymentByCheckout, createSecurityPayment, updateSecurityPayment } from "../../services/securityPaymentStore.js";

const missing = Object.assign(new Error('relation "public.transactions" does not exist'), { code: "42P01" });

describe("findSecurityPaymentByCheckout", () => {
  it("returns the payments row for a security type", async () => {
    const findOne = jest.fn(async (t) => (t === "payments" ? { id: "p1", type: "bid_commitment" } : null));
    expect(await findSecurityPaymentByCheckout("co", { findOne })).toEqual({ table: "payments", row: { id: "p1", type: "bid_commitment" } });
    expect(findOne).toHaveBeenCalledTimes(1);
  });
  it("a regular payment owns the checkout id -> not a security payment (legacy table never consulted)", async () => {
    const findOne = jest.fn(async () => ({ id: "p2", type: "purchase" }));
    expect(await findSecurityPaymentByCheckout("co", { findOne })).toBeNull();
    expect(findOne).toHaveBeenCalledTimes(1);
  });
  it("falls back to a legacy transactions row when present", async () => {
    const findOne = jest.fn(async (t) => (t === "transactions" ? { id: "t1", type: "bid_security" } : null));
    expect(await findSecurityPaymentByCheckout("co", { findOne })).toEqual({ table: "transactions", row: { id: "t1", type: "bid_security" } });
  });
  it("a missing legacy table is tolerated (this used to abort every M-Pesa callback)", async () => {
    const findOne = jest.fn(async (t) => { if (t === "transactions") throw missing; return null; });
    expect(await findSecurityPaymentByCheckout("co", { findOne })).toBeNull();
  });
  it("a legacy table WITHOUT the checkout column (production shape: 42703) is tolerated too", async () => {
    const col = Object.assign(new Error("column transactions.checkout_request_id does not exist"), { code: "42703" });
    const findOne = jest.fn(async (t) => { if (t === "transactions") throw col; return null; });
    expect(await findSecurityPaymentByCheckout("co", { findOne })).toBeNull();
  });
  it("any other database error still surfaces", async () => {
    const findOne = jest.fn(async (t) => { if (t === "transactions") throw Object.assign(new Error("timeout"), { code: "57014" }); return null; });
    await expect(findSecurityPaymentByCheckout("co", { findOne })).rejects.toThrow("timeout");
  });
});

describe("createSecurityPayment / updateSecurityPayment", () => {
  it("creates pending mpesa rows in payments only, for the two security types", async () => {
    const create = jest.fn(async (t, d) => ({ id: "n", ...d }));
    const r = await createSecurityPayment({ userId: "u", carId: "c", amount: 5000, type: "bid_commitment", phone: "2547", checkoutRequestId: "co", metadata: { a: 1 } }, { create });
    expect(create).toHaveBeenCalledWith("payments", expect.objectContaining({ user: "u", car: "c", amount: 5000, type: "bid_commitment", status: "pending", mode: "mpesa", processed: false, checkoutRequestId: "co" }));
    expect(r.table).toBe("payments");
    await expect(createSecurityPayment({ type: "purchase" }, { create })).rejects.toThrow(/Unsupported/);
  });
  it("finalising a payments row marks it processed (generic claim path can never re-run it) and stamps paidAt on success", async () => {
    const update = jest.fn(async () => ({}));
    await updateSecurityPayment({ table: "payments", row: { id: "p" } }, { status: "success", mpesaReceipt: "R" }, { update });
    expect(update.mock.calls[0][2]).toMatchObject({ status: "success", mpesaReceipt: "R", processed: true });
    expect(update.mock.calls[0][2].paidAt).toBeTruthy();
    await updateSecurityPayment({ table: "transactions", row: { id: "t" } }, { status: "failed" }, { update });
    expect(update.mock.calls[1]).toEqual(["transactions", "t", { status: "failed" }]);
  });
});
