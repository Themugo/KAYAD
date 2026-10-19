// STAGE 5C — action audits must not be lost when public.security_logs does not exist (no DDL in the repository).
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
const sec = { create: jest.fn() }; const aud = { create: jest.fn() }; const logError = jest.fn();
jest.unstable_mockModule("../../models/SecurityLog.js", () => ({ default: sec }));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: aud }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn() }));
const { logActionFromReq } = await import("../../utils/securityLogger.js");
const U = "11111111-1111-4111-8111-111111111111", T = "22222222-2222-4222-8222-222222222222";
const req = { user: { id: U, role: "admin" }, ip: "203.0.113.9", headers: { "user-agent": "jest" } };
beforeEach(() => { sec.create.mockReset(); aud.create.mockReset(); logError.mockReset(); });

describe("logActionFromReq persistence", () => {
  test("normal path writes security_logs only", async () => {
    sec.create.mockResolvedValue({}); await logActionFromReq(req, "dealer_x", { target: T, targetModel: "Dealer" });
    expect(sec.create).toHaveBeenCalledTimes(1); expect(aud.create).not.toHaveBeenCalled();
  });
  test.each([[{}], [{ code: "PGRST205", message: "Could not find the table 'public.security_logs'" }], [{ code: "42P01", message: 'relation "security_logs" does not exist' }]])("missing table (%j) falls back to audit_logs with the mapped canonical fields", async (err) => {
    sec.create.mockRejectedValue(err); aud.create.mockResolvedValue({});
    await logActionFromReq(req, "inspection_submitted", { target: T, targetModel: "VehicleInspection", details: { to: "completed" } });
    expect(aud.create).toHaveBeenCalledTimes(1);
    const row = aud.create.mock.calls[0][0];
    expect(row).toMatchObject({ action: "inspection_submitted", actor: U, actorRole: "admin", target: T, targetModel: "VehicleInspection" });
    expect(row.details).toMatchObject({ to: "completed", store: "audit_logs_fallback" });
    expect(logError).not.toHaveBeenCalled();
  });
  test("any OTHER failure is not papered over by the fallback and is surfaced", async () => {
    sec.create.mockRejectedValue(Object.assign(new Error("permission denied for table security_logs"), { code: "42501" }));
    await logActionFromReq(req, "x", {});
    expect(aud.create).not.toHaveBeenCalled(); expect(logError).toHaveBeenCalled();
  });
  test("if the fallback also fails the loss is logged, never thrown into the request", async () => {
    sec.create.mockRejectedValue({}); aud.create.mockRejectedValue(new Error("db down"));
    await expect(logActionFromReq(req, "x", {})).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalled();
  });
});
