// OD-1: view_system_health is narrow — assignable, labelled, held by no default role; superadmin keeps everything.
import { PERM, ROLE_PERMISSIONS, ASSIGNABLE_PERMISSIONS, PERM_LABELS, getEffectivePermissions, isPermissionEligibleForRole } from "../../config/roles.js";
import { PERMISSIONS } from "../../middleware/rbac.js";

describe("view_system_health (OD-1)", () => {
  it("is declared, labelled and assignable", () => {
    expect(PERM.VIEW_SYSTEM_HEALTH).toBe("view_system_health");
    expect(PERMISSIONS.VIEW_SYSTEM_HEALTH).toBe("view_system_health");
    expect(ASSIGNABLE_PERMISSIONS).toContain("view_system_health");
    expect(PERM_LABELS["view_system_health"].label).toBeTruthy();
  });
  it("is held by no role except superadmin's all-permissions", () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role === "superadmin") continue;
      expect(perms).not.toContain("view_system_health");
    }
  });
  it("is not implied by view_logs (technical staff are not auto-granted)", () => {
    const tech = getEffectivePermissions({ role: "technical_support" });
    expect(tech).toContain("view_logs");
    expect(tech).not.toContain("view_system_health");
  });
  it("is granted only individually and removed by a revoke", () => {
    expect(getEffectivePermissions({ role: "technical_support", grantedPermissions: ["view_system_health"] })).toContain("view_system_health");
    expect(getEffectivePermissions({ role: "technical_support", grantedPermissions: ["view_system_health"], revokedPermissions: ["view_system_health"] })).not.toContain("view_system_health");
    expect(getEffectivePermissions({ role: "superadmin" })).toContain("view_system_health");
  });
  // Final-closure Phase 1: a grant alone never admits a non-technical role (the earlier test asserted the opposite; intended behaviour changed).
  it("is NOT effective for any non-technical role even when granted (eligibility boundary)", () => {
    for (const role of ["moderator", "hr", "accounts", "marketing", "escrow_officer", "admin", "ad_manager", "ghost_checker", "user", "dealer"]) {
      expect(getEffectivePermissions({ role, grantedPermissions: ["view_system_health"] })).not.toContain("view_system_health");
      expect(isPermissionEligibleForRole(role, "view_system_health")).toBe(false);
    }
    expect(isPermissionEligibleForRole("technical_support", "view_system_health")).toBe(true);
    expect(isPermissionEligibleForRole("superadmin", "view_system_health")).toBe(true);
    expect(isPermissionEligibleForRole("moderator", "view_logs")).toBe(true); // other permissions are unaffected
  });
});
