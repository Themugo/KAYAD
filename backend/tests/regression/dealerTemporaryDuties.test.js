import { describe, it, expect } from "@jest/globals";
import { validateGrant, grantIsActive, TEMPORARY_DUTY_PERMISSIONS, MAX_DUTY_DAYS, DutyError } from "../../services/dealerTemporaryDuties.service.js";

const now = new Date("2026-11-23T10:00:00Z");
const soon = "2026-11-24T10:00:00Z";
const ok = (over = {}) => validateGrant({ permissions: ["canChatBuyers"], expiresAt: soon, actorId: "a", targetMemberId: "t", actorPermissions: { canChatBuyers: true }, now, ...over });
const code = (fn) => { try { fn(); return null; } catch (e) { return e instanceof DutyError ? e.code : "OTHER"; } };

describe("temporary duty rules", () => {
  it("never allows governance permissions to be lent", () => {
    expect(TEMPORARY_DUTY_PERMISSIONS).not.toContain("canManageTeam");
    expect(TEMPORARY_DUTY_PERMISSIONS).not.toContain("canEditSettings");
    expect(code(() => ok({ permissions: ["canManageTeam"], unrestricted: true }))).toBe("DUTY_PERMISSION_NOT_ALLOWED");
    expect(code(() => ok({ permissions: ["canEditSettings"], unrestricted: true }))).toBe("DUTY_PERMISSION_NOT_ALLOWED");
  });
  it("requires at least one duty and a future expiry within the maximum", () => {
    expect(code(() => ok({ permissions: [] }))).toBe("DUTY_PERMISSIONS_REQUIRED");
    expect(code(() => ok({ expiresAt: undefined }))).toBe("DUTY_EXPIRY_REQUIRED");
    expect(code(() => ok({ expiresAt: "2026-11-23T09:00:00Z" }))).toBe("DUTY_EXPIRY_PAST");
    expect(code(() => ok({ expiresAt: new Date(now.getTime() + (MAX_DUTY_DAYS + 1) * 86400000).toISOString() }))).toBe("DUTY_TOO_LONG");
    expect(code(() => ok({ startsAt: "2026-11-25T00:00:00Z" }))).toBe("DUTY_WINDOW_INVALID");
  });
  it("refuses self-grants and lending what the granter does not hold", () => {
    expect(code(() => ok({ targetMemberId: "a" }))).toBe("DUTY_SELF_GRANT");
    expect(code(() => ok({ permissions: ["canDeleteCars"] }))).toBe("PERMISSION_GRANT_FORBIDDEN");
    expect(code(() => ok({ permissions: ["canDeleteCars"], unrestricted: true }))).toBeNull();
  });
  it("returns a normalised grant and strips markup from the reason", () => {
    const g = ok({ permissions: ["canChatBuyers", "canChatBuyers"], reason: "  <b>cover</b>  " });
    expect(g.permissions).toEqual(["canChatBuyers"]);
    expect(g.reason).toBe("bcover/b");
  });
  it("counts only unrevoked grants inside their window as active", () => {
    const g = { startsAt: "2026-11-23T09:00:00Z", expiresAt: "2026-11-23T11:00:00Z", revokedAt: null };
    expect(grantIsActive(g, now)).toBe(true);
    expect(grantIsActive({ ...g, revokedAt: "2026-11-23T09:30:00Z" }, now)).toBe(false);
    expect(grantIsActive({ ...g, expiresAt: "2026-11-23T09:59:00Z" }, now)).toBe(false);
    expect(grantIsActive({ ...g, startsAt: "2026-11-23T10:30:00Z" }, now)).toBe(false);
  });
});
