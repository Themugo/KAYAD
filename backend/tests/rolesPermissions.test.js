import { describe, it, expect } from "@jest/globals";
import {
  getEffectivePermissions,
  userHasPermission,
  ASSIGNABLE_PERMISSIONS,
  PERM_LABELS,
  ROLE_PERMISSIONS,
  PERM,
} from "../config/roles.js";

// Pure-logic tests for the assignable-permissions RBAC.
// These require NO database — they exercise the effective-permission math:
//   effective = role defaults ∪ grantedPermissions − revokedPermissions
describe("RBAC effective permissions", () => {
  it("returns role defaults when nothing is granted or revoked", () => {
    const mod = { role: "moderator", grantedPermissions: [], revokedPermissions: [] };
    const eff = getEffectivePermissions(mod).sort();
    expect(eff).toEqual([...(ROLE_PERMISSIONS.moderator || [])].sort());
  });

  it("adds granted permissions on top of the role defaults", () => {
    const mod = { role: "moderator", grantedPermissions: [PERM.MANAGE_ESCROW], revokedPermissions: [] };
    expect(userHasPermission(mod, PERM.MANAGE_ESCROW)).toBe(true);
    // still keeps its base perms
    expect(userHasPermission(mod, PERM.MANAGE_MODERATION)).toBe(true);
  });

  it("removes revoked permissions from the role defaults", () => {
    const acct = { role: "accounts", grantedPermissions: [], revokedPermissions: [PERM.MANAGE_FINANCE] };
    expect(userHasPermission(acct, PERM.MANAGE_FINANCE)).toBe(false);
  });

  it("grant + revoke combine correctly", () => {
    const mod = {
      role: "moderator",
      grantedPermissions: [PERM.MANAGE_ESCROW],
      revokedPermissions: [PERM.VIEW_LOGS],
    };
    const eff = getEffectivePermissions(mod).sort();
    expect(eff).toContain(PERM.MANAGE_ESCROW);
    expect(eff).toContain(PERM.MANAGE_MODERATION);
    expect(eff).not.toContain(PERM.VIEW_LOGS);
  });

  it("superadmin always has every permission regardless of revokes", () => {
    const su = {
      role: "superadmin",
      grantedPermissions: [],
      revokedPermissions: [PERM.MANAGE_FINANCE, PERM.MANAGE_CARS],
    };
    expect(userHasPermission(su, PERM.MANAGE_FINANCE)).toBe(true);
    expect(userHasPermission(su, PERM.MANAGE_PLATFORM)).toBe(true);
    expect(getEffectivePermissions(su).length).toBe(Object.values(PERM).length);
  });

  it("handles users with no permission fields (safe defaults)", () => {
    const bare = { role: "user" };
    expect(Array.isArray(getEffectivePermissions(bare))).toBe(true);
    expect(userHasPermission(bare, PERM.MANAGE_CARS)).toBe(false);
  });

  it("returns empty for null/undefined user", () => {
    expect(getEffectivePermissions(null)).toEqual([]);
    expect(userHasPermission(undefined, PERM.MANAGE_CARS)).toBe(false);
  });

  it("FULL_ACCESS is never in the assignable catalog", () => {
    expect(ASSIGNABLE_PERMISSIONS).not.toContain(PERM.FULL_ACCESS);
  });

  it("every assignable permission has a UI label with a group", () => {
    for (const p of ASSIGNABLE_PERMISSIONS) {
      expect(PERM_LABELS[p]).toBeDefined();
      expect(typeof PERM_LABELS[p].label).toBe("string");
      expect(typeof PERM_LABELS[p].group).toBe("string");
    }
  });

  it("a granted permission cannot be silently dropped by an unrelated revoke", () => {
    const u = {
      role: "ad_manager",
      grantedPermissions: [PERM.MANAGE_USERS],
      revokedPermissions: [PERM.MANAGE_ADS],
    };
    expect(userHasPermission(u, PERM.MANAGE_USERS)).toBe(true);
    expect(userHasPermission(u, PERM.MANAGE_ADS)).toBe(false);
  });
});
