/** @jest-environment node */
// STAGE 5A: pins for defects that only appeared against the real PostgreSQL schema (mocks could not see them).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const src = (f) => fs.readFileSync(path.join(repo, f), "utf8");
describe("real-schema pins (STAGE 5A)", () => {
  test("admin routes never select/filter nonexistent users columns", () => {
    const s = src("backend/routes/adminRoutes.js");
    const m = /const ADMIN_USER_FIELDS\s*=\s*([\s\S]*?);/.exec(s)[1];
    for (const bad of ["approved", "businessType", "lastLogin", "verificationStatus"]) expect(m).not.toMatch(new RegExp(`\\b${bad}\\b`));
  });
  test("approve-dealer uses the atomic RPC and the real account gate, not users.approved", () => {
    const s = src("backend/routes/adminRoutes.js");
    const seg = s.slice(s.indexOf('"/users/:id/approve-dealer"'), s.indexOf('"/users/:id/seller-settings"'));
    expect(seg).toMatch(/kayad_apply_dealer_verification_atomic/);
    expect(seg).toMatch(/status:\s*"approved"/);
    expect(seg).not.toMatch(/approved:\s*true/);
  });
  test("single moderation updates only the status (never saves a populated dealer object)", () => {
    const s = src("backend/routes/adminRoutes.js");
    const seg = s.slice(s.indexOf('"/cars/:id/moderate"'), s.indexOf('"/cars/:id/moderate"') + 4000);
    expect(seg).toMatch(/Car\.findByIdAndUpdate\(req\.params\.id, \{ status: newStatus \}\)/);
    expect(seg).not.toMatch(/await car\.save\(\)/);
  });
  test("seller bulk endpoints query the physical column cars.dealer_id", () => {
    const s = src("backend/routes/dealerRoutes.js");
    const seg = s.slice(s.indexOf('"/cars/bulk-status"'));
    expect(seg.slice(0, 3000)).toMatch(/\.eq\("dealer_id", req\.user\.id\)/);
  });
  test("the owner onboarding settings page is mounted in the live admin console", () => {
    const s = src("src/features/AdminView.tsx");
    expect(s).toMatch(/import AdminSettingsOnboarding from/);
    expect(s).toMatch(/module === 'onboarding' && <AdminSettingsOnboarding \/>/);
  });
  test("admin console exposes dealer/seller decisions and listing hide through the server APIs, and loads the audit log from /admin/audit-log", () => {
    const s = src("src/features/AdminView.tsx");
    expect(s).toMatch(/adminAPI\.approveDealer/);
    expect(s).toMatch(/adminAPI\.verifyDealer\(user\._id, \{ action: 'reject'/);
    expect(s).toMatch(/adminAPI\.moderateCar\(car\._id, \{ action \}\)/);
    expect(s).toMatch(/adminAPI\.getAuditLog\(/);
    expect(s).not.toMatch(/adminAPI\.getAuditLogs\(/);
  });
});
