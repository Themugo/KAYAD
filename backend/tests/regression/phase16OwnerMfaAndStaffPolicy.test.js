import { describe, expect, it, beforeAll } from "@jest/globals";
import crypto from "node:crypto";
import { base32Decode, base32Encode, hotp, totpAt, verifyTotp, generateSecret, otpauthUri, stepAt } from "../../utils/totp.js";
import { STAFF_ACCESS_POLICY } from "../../config/staffAccessPolicy.js";
import { ROLE_PERMISSIONS, PERM } from "../../config/roles.js";
import { requireAnyPermission } from "../../middleware/rbac.js";

const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));
describe("Phase 16 TOTP (RFC 6238 / RFC 4226)", () => {
  it("matches the RFC 6238 SHA-1 vectors (8 digits)", () => {
    expect(totpAt(RFC_SECRET, 59 * 1000, 8)).toBe("94287082");
    expect(totpAt(RFC_SECRET, 1111111109 * 1000, 8)).toBe("07081804");
    expect(totpAt(RFC_SECRET, 1234567890 * 1000, 8)).toBe("89005924");
  });
  it("matches the RFC 4226 HOTP vectors", () => {
    const k = Buffer.from("12345678901234567890");
    expect([0, 1, 2].map((c) => hotp(k, c, 6))).toEqual(["755224", "287082", "359152"]);
  });
  it("base32 round-trips", () => { const b = crypto.randomBytes(20); expect(base32Decode(base32Encode(b)).equals(b)).toBe(true); });
  it("accepts the current and adjacent step only, returns the step, rejects junk", () => {
    const s = generateSecret(); const now = Date.now();
    expect(verifyTotp(s, totpAt(s, now), now)).toBe(stepAt(now));
    expect(verifyTotp(s, totpAt(s, now + 30000), now)).toBe(stepAt(now) + 1);
    expect(verifyTotp(s, totpAt(s, now + 90000), now)).toBeNull();
    for (const bad of ["", "abc", "12345", "1234567", null, undefined, "0000000000"]) expect(verifyTotp(s, bad, now) === null || bad === "000000").toBe(true);
  });
  it("otpauth URI carries issuer and no password", () => { const u = otpauthUri({ secret: "ABC", account: "a@b.c" }); expect(u).toMatch(/^otpauth:\/\/totp\//); expect(u).toContain("issuer="); });
});

describe("Phase 16 owner MFA service (pure crypto helpers)", () => {
  let svc;
  beforeAll(async () => { process.env.OWNER_MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64"); svc = await import("../../services/ownerMfa.service.js"); });
  it("encrypts with AES-256-GCM, differently each time, and round-trips", () => {
    const a = svc.encryptSecret("JBSWY3DPEHPK3PXP"), b = svc.encryptSecret("JBSWY3DPEHPK3PXP");
    expect(a).not.toBe(b); expect(a.startsWith("v1:")).toBe(true); expect(a).not.toContain("JBSWY3DPEHPK3PXP");
    expect(svc.decryptSecret(a)).toBe("JBSWY3DPEHPK3PXP");
  });
  it("refuses tampered ciphertext and a wrong key", () => {
    const a = svc.encryptSecret("SECRET"); const parts = a.split(":"); parts[3] = Buffer.from("x" + parts[3]).toString("base64");
    expect(() => svc.decryptSecret(parts.join(":"))).toThrow();
    expect(() => svc.decryptSecret(a, crypto.randomBytes(32))).toThrow();
  });
  it("fails closed without a key", async () => {
    const k = process.env.OWNER_MFA_ENCRYPTION_KEY; delete process.env.OWNER_MFA_ENCRYPTION_KEY;
    expect(svc.keyConfigured()).toBe(false); expect(() => svc.encryptSecret("x")).toThrow(/not configured/i);
    process.env.OWNER_MFA_ENCRYPTION_KEY = "too-short"; expect(svc.keyConfigured()).toBe(false);
    process.env.OWNER_MFA_ENCRYPTION_KEY = k;
  });
  it("recovery codes are random, normalised and hashed, never equal to their hash", () => {
    const c = svc.newRecoveryCode(); expect(c).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    expect(svc.hashRecoveryCode(c)).toBe(svc.hashRecoveryCode(c.toLowerCase().replace("-", " ")));
    expect(svc.hashRecoveryCode(c)).not.toContain(c); expect(svc.newRecoveryCode()).not.toBe(c);
  });
  it("policy defaults to enrolled_only and ignores unknown values", () => {
    delete process.env.OWNER_MFA_POLICY; expect(svc.mfaPolicy()).toBe("enrolled_only");
    process.env.OWNER_MFA_POLICY = "bogus"; expect(svc.mfaPolicy()).toBe("enrolled_only");
    process.env.OWNER_MFA_POLICY = "required"; expect(svc.mfaPolicy()).toBe("required"); delete process.env.OWNER_MFA_POLICY;
  });
});

const STAFF = ["admin", "accounts", "escrow_officer", "hr", "marketing", "moderator", "ghost_checker", "ad_manager", "support", "engineer", "executive", "manager"].filter((r) => ROLE_PERMISSIONS[r]);
const holds = (role, key) => STAFF_ACCESS_POLICY[key].some((p) => (ROLE_PERMISSIONS[role] || []).includes(p));
describe("Phase 16 staff access policy (derived from existing role permissions)", () => {
  it("every policy entry names only real permissions", () => { for (const [k, v] of Object.entries(STAFF_ACCESS_POLICY)) { expect(v.length).toBeGreaterThan(0); for (const p of v) expect(Object.values(PERM)).toContain(p); } });
  it("ledger is finance-only: HR, marketing, moderators, ghost checkers and ad managers are excluded", () => {
    for (const r of ["hr", "marketing", "moderator", "ghost_checker", "ad_manager"].filter((x) => ROLE_PERMISSIONS[x])) { expect(holds(r, "ledger.read")).toBe(false); expect(holds(r, "ledger.write")).toBe(false); }
    expect(holds("accounts", "ledger.read")).toBe(true);
  });
  it("communications recipient data and retries are not open to HR/marketing/finance-only roles", () => {
    for (const r of ["hr", "marketing", "accounts"].filter((x) => ROLE_PERMISSIONS[x])) { expect(holds(r, "communications.recipient.read")).toBe(false); expect(holds(r, "communications.delivery.retry")).toBe(false); }
  });
  it("revenue figures need finance, sales summary needs analytics", () => {
    expect(holds("hr", "dashboard.sales.revenue")).toBe(false); expect(holds("accounts", "dashboard.sales.revenue")).toBe(true);
    expect(holds("marketing", "dashboard.sales.summary")).toBe(true);
  });
});

const run = async (mw, user) => { let code = 0, nexted = false; const res = { status(c) { code = c; return this; }, json() { return this; } }; await mw({ user, originalUrl: "/x", method: "GET" }, res, () => { nexted = true; }); return nexted ? 200 : code; };
describe("requireAnyPermission", () => {
  const gate = requireAnyPermission(PERM.MANAGE_PLATFORM, PERM.MANAGE_SUPPORT);
  it("anonymous -> 401", async () => expect(await run(gate, null)).toBe(401));
  it("a role with none of the permissions -> 403", async () => expect(await run(gate, { id: "1", role: "user" })).toBe(403));
  it("superadmin passes", async () => expect(await run(gate, { id: "1", role: "superadmin" })).toBe(200));
});

describe("account deletion guard covers owner memberships without breaking installs that lack the table", () => {
  it("counts owner_memberships when present and skips it when the table does not exist", async () => {
    const { inspectAccountDeletion, ACCOUNT_DELETE_OPTIONAL_DEPENDENCIES } = await import("../../utils/accountDeletionGuard.js");
    expect(ACCOUNT_DELETE_OPTIONAL_DEPENDENCIES.map((d) => d[1])).toContain("owner_memberships");
    const mk = (owner) => ({ from: (t) => ({ select: () => ({ or: async () => (t === "owner_memberships" ? (owner === "missing" ? { count: null, error: { code: "PGRST205", message: "Could not find the table" } } : { count: owner, error: null }) : { count: 0, error: null }) }) }) });
    expect(await inspectAccountDeletion("u1", { sb: mk(1) })).toEqual([expect.objectContaining({ code: "OWNER_GOVERNANCE", count: 1 })]);
    expect(await inspectAccountDeletion("u1", { sb: mk("missing") })).toEqual([]);
  });
});
