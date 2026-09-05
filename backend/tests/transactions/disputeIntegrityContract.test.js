import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("Phase 13 dispute integrity contract", () => {
  test("legacy generic dispute API cannot masquerade as a persisted production workflow", () => {
    const routes = read("backend/routes/disputeRoutes.js");
    expect(routes).toContain('code: "GENERIC_DISPUTES_UNAVAILABLE"');
    expect(routes).toContain("res.status(501)");
    expect(routes).not.toContain("disputeController");
  });

  test("supported escrow dispute path preserves actor role and database idempotency", () => {
    const controller = read("backend/controllers/escrowController.js");
    const service = read("backend/services/escrow.service.js");

    expect(controller).toContain('String(escrow.seller) === userId ? "seller" : "buyer"');
    expect(controller).toContain("idempotencyKey: req.idempotencyKey");
    expect(service).toMatch(/nextStatus:\s*STATES\.DISPUTED[\s\S]*?idempotencyKey/);
  });
});
