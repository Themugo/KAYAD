// Public program status endpoint, operations dashboard scoping, and the retired "held" status.
import { describe, test, expect, jest } from "@jest/globals";
import fs from "node:fs";

let rules = { enabled: true, fundingMethods: ["bank_transfer"], releaseDays: 3, minimumAmount: 0, maximumAmount: null };
jest.unstable_mockModule("../../services/escrowConfiguration.service.js", () => ({
  getEscrowRules: async () => rules, getPrimaryEscrowAccount: async () => ({ id: "a", accountNumber: "SECRET-ACCT" }), sanitizeEscrowAccount: (a) => a, verifyEscrowFunding: jest.fn(),
}));
jest.unstable_mockModule("../../middleware/auth.js", () => ({ protect: (r, s, n) => n(), adminOnly: (r, s, n) => n() }));
const fns = (names) => Object.fromEntries(names.map((n) => [n, jest.fn()]));
jest.unstable_mockModule("../../controllers/escrowController.js", () => fns(["getAllEscrows", "getUserEscrows", "getEscrowById", "getEscrowState", "releaseEscrow", "refundEscrow", "confirmVehicleHandler", "confirmDelivery", "requestRelease", "disputeEscrow", "closeEscrowHandler", "completeEscrowRefund"]));
jest.unstable_mockModule("../../controllers/escrowOperationsController.js", () => fns(["getEscrowOperationsDashboard", "getEscrowOperationsCase", "runEscrowReconciliation", "runEscrowAnomalyScan", "initiateEscrowPayout"]));
jest.unstable_mockModule("../../middleware/idempotency.js", () => ({ idempotencyCheck: (r, s, n) => n() }));
jest.unstable_mockModule("../../middleware/rateLimiter.js", () => ({ createLimiter: (r, s, n) => n() }));
jest.unstable_mockModule("../../db/index.js", () => ({ findById: jest.fn() }));

const { default: router } = await import("../../routes/escrowRoutes.js");
const layer = (p, m = "get") => router.stack.find((l) => l.route?.path === p && l.route.methods[m]);

describe("GET /api/escrow/program", () => {
  test("is registered before /:id, with no authentication middleware in front of it", () => {
    const idx = router.stack.findIndex((l) => l.route?.path === "/program");
    const idIdx = router.stack.findIndex((l) => l.route?.path === "/:id");
    expect(idx).toBeGreaterThan(-1);
    expect(idx).toBeLessThan(idIdx);
    expect(layer("/program").route.stack).toHaveLength(1);
  });
  const call = async () => { const res = { headers: {}, body: null, set(k, v) { this.headers[k] = v; return this; }, json(b) { this.body = b; return this; } }; await layer("/program").route.stack[0].handle({}, res, (e) => { throw e; }); return res; };
  test("returns only the published program rules — no account, deal or balance", async () => {
    const res = await call();
    expect(res.body).toEqual({ success: true, data: { enabled: true, fundingMethods: ["bank_transfer"], releaseDays: 3, minimumAmount: 0, maximumAmount: null, currency: "KES" } });
    expect(JSON.stringify(res.body)).not.toMatch(/SECRET|account|balance|total/i);
    expect(res.headers["Cache-Control"]).toMatch(/max-age/);
  });
  test("reflects a switched-off program", async () => { rules = { ...rules, enabled: false }; expect((await call()).body.data.enabled).toBe(false); rules = { ...rules, enabled: true }; });
  test("every other escrow route still requires authentication", () => {
    const open = router.stack.filter((l) => l.route && l.route.stack.length === 1 && l.route.path !== "/program").map((l) => l.route.path);
    expect(open).toEqual([]);
  });
});

describe("the retired 'held' status", () => {
  const src = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
  test.each(["routes/adminRoutes.js", "controllers/operationsController.js", "routes/dealerRoutes.js", "services/reconciliationService.js"])("%s no longer counts escrows with status 'held'", (p) => {
    const lines = src(p).split("\n").filter((l) => /escrow/i.test(l) && /status[^\n]*["']held["']/.test(l));
    // compareEscrowBalances is intentionally deferred (see ESCROW_PRODUCT_DISCOVERY.md §12)
    expect(lines.filter((l) => !/compareEscrow|heldResult|referenceModel/.test(l))).toEqual([]);
  });
});
