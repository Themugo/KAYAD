// OD-1: view_system_health is narrow — assignable, labelled, held by no default role; superadmin keeps everything.
import { PERM, ROLE_PERMISSIONS, ASSIGNABLE_PERMISSIONS, PERM_LABELS, getEffectivePermissions } from "../../config/roles.js";
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
    expect(getEffectivePermissions({ role: "moderator", grantedPermissions: ["view_system_health"] })).toContain("view_system_health");
    expect(getEffectivePermissions({ role: "technical_support", grantedPermissions: ["view_system_health"], revokedPermissions: ["view_system_health"] })).not.toContain("view_system_health");
    expect(getEffectivePermissions({ role: "superadmin" })).toContain("view_system_health");
  });
});
