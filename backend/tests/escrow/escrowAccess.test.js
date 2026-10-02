// Escrow identity normalization + canonical-role access + response contract.
import { describe, test, expect } from "@jest/globals";
import {
  toIdString, sameId, isEscrowParty, isEscrowBuyer, isEscrowSeller, canViewAnyEscrow, canViewEscrow,
  canActAsEscrowAdmin, escrowAdminOnly, ESCROW_ADMIN_ROLES,
} from "../../utils/escrowAccess.js";
import { STAFF_ROLES, ROLE_HIERARCHY } from "../../config/roles.js";
import { escrowResponseSchema, escrowStateResponseSchema } from "../../validation/response.schema.js";
import { getAllowedTransitions } from "../../services/escrowStateMachine.js";

const B = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const X = "33333333-3333-4333-8333-333333333333";

describe("toIdString / sameId", () => {
  test("normalizes bare ids, populated rows and case/whitespace variants", () => {
    expect(toIdString(B)).toBe(B);
    expect(toIdString({ id: B, name: "Buyer" })).toBe(B);
    expect(toIdString({ _id: B })).toBe(B);
    expect(toIdString(` ${B.toUpperCase()} `)).toBe(B);
    expect(sameId({ id: B }, B.toUpperCase())).toBe(true);
  });
  test("fails closed on missing / unusable values", () => {
    for (const v of [null, undefined, "", {}, "undefined", "null", "[object Object]"]) expect(toIdString(v)).toBeNull();
    expect(sameId(undefined, undefined)).toBe(false);
    expect(sameId(null, B)).toBe(false);
  });
});

describe("UUID-only identity contract (no Mongo ObjectId handling)", () => {
  test("24-char hex ObjectId strings and ObjectId-like objects are rejected", () => {
    expect(toIdString("507f1f77bcf86cd799439011")).toBeNull();
    expect(toIdString({ toHexString: () => B })).toBeNull();
    expect(toIdString({ toString: () => B })).toBeNull();
    expect(sameId("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439011")).toBe(false);
  });
  test("non-string ids are rejected", () => {
    for (const v of [123, true, [], [B], () => B]) expect(toIdString(v)).toBeNull();
  });
  test("nested wrapper {_id:{id}} unwraps at most twice", () => {
    expect(toIdString({ _id: { id: B } })).toBe(B);
    expect(toIdString({ _id: { _id: { id: B } } })).toBeNull();
  });
});

describe("party detection: populated vs unpopulated", () => {
  const unpopulated = { buyer: B, seller: S };
  const populated = { buyer: { id: B, name: "b" }, seller: { id: S, name: "s" } };
  test.each([["unpopulated", unpopulated], ["populated", populated]])("%s record", (_n, e) => {
    expect(isEscrowBuyer(e, B)).toBe(true);
    expect(isEscrowSeller(e, S)).toBe(true);
    expect(isEscrowParty(e, B)).toBe(true);
    expect(isEscrowParty(e, S)).toBe(true);
    expect(isEscrowParty(e, X)).toBe(false);
    expect(isEscrowBuyer(e, S)).toBe(false);
  });
  test("regression: String() of a populated row is not an id", () => {
    expect(String(populated.buyer)).toBe("[object Object]");
    expect(isEscrowParty(populated, B)).toBe(true);
  });
  test("missing parties never match, even against an undefined user id", () => {
    expect(isEscrowParty({}, undefined)).toBe(false);
    expect(isEscrowParty({ buyer: null, seller: null }, X)).toBe(false);
  });
});

describe("staff access follows the canonical role contract", () => {
  const e = { buyer: B, seller: S };
  const allow = ["admin", "superadmin", "escrow_officer", "moderator"];
  test.each(ROLE_HIERARCHY)("role %s", (role) => {
    expect(canViewAnyEscrow({ id: X, role })).toBe(allow.includes(role));
    expect(canViewEscrow(e, { id: X, role })).toBe(allow.includes(role));
  });
  test("webhoist owner is allowed; unauthenticated is not", () => {
    expect(canViewAnyEscrow({ id: X, role: "superadmin", effectiveRole: "webhoist" })).toBe(true);
    expect(canViewEscrow(e, undefined)).toBe(false);
  });
  test("every escrow viewer role is a real canonical role", () => {
    for (const r of allow) expect(ROLE_HIERARCHY).toContain(r);
    for (const r of ["admin", "superadmin", "escrow_officer"]) expect(STAFF_ROLES).toContain(r);
  });
});

describe("response contract", () => {
  const detail = {
    success: true,
    data: { id: B, amount: 1500000, status: "funded", car: { id: X, title: "t" }, buyer: { id: B }, seller: S, allowedTransitions: getAllowedTransitions("funded") },
  };
  const state = { success: true, data: { currentState: "funded", allowedTransitions: getAllowedTransitions("funded"), history: [] } };
  test("detail and state shapes validate against their schemas", () => {
    expect(escrowResponseSchema.safeParse(detail).success).toBe(true);
    expect(escrowStateResponseSchema.safeParse(state).success).toBe(true);
  });
  test("state schema rejects the legacy availableTransitions name", () => {
    const legacy = { success: true, data: { currentState: "funded", availableTransitions: [], history: [] } };
    expect(escrowStateResponseSchema.safeParse(legacy).success).toBe(false);
  });
  test("error envelopes validate", () => {
    expect(escrowResponseSchema.safeParse({ success: false, message: "Not authorized" }).success).toBe(true);
    expect(escrowStateResponseSchema.safeParse({ success: false, message: "Not authorized" }).success).toBe(true);
  });
  test("OpenAPI block documents allowedTransitions, not availableTransitions", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../../routes/escrowRoutes.js", import.meta.url), "utf8");
    expect(src).toContain("allowedTransitions:");
    expect(src).not.toContain("availableTransitions");
  });
});

describe("escrow administrator action roles", () => {
  test("contract is exactly admin + superadmin, matching the state machine and DB function", () => {
    expect([...ESCROW_ADMIN_ROLES]).toEqual(["admin", "superadmin"]);
  });
  test.each(ROLE_HIERARCHY)("canActAsEscrowAdmin: %s", (role) => {
    expect(canActAsEscrowAdmin({ id: X, role })).toBe(role === "admin" || role === "superadmin");
  });
  test("webhoist allowed, anonymous denied", () => {
    expect(canActAsEscrowAdmin({ id: X, role: "user", effectiveRole: "webhoist" })).toBe(true);
    expect(canActAsEscrowAdmin(undefined)).toBe(false);
  });
  test.each(ROLE_HIERARCHY)("escrowAdminOnly middleware: %s", (role) => {
    const res = { code: null, status(c) { this.code = c; return this; }, json() { return this; } };
    let called = false;
    escrowAdminOnly({ user: { id: X, role } }, res, () => { called = true; });
    expect(called).toBe(role === "admin" || role === "superadmin");
    if (!called) expect(res.code).toBe(403);
  });
  test("middleware: no user -> 401", () => {
    const res = { code: null, status(c) { this.code = c; return this; }, json() { return this; } };
    escrowAdminOnly({}, res, () => { throw new Error("should not pass"); });
    expect(res.code).toBe(401);
  });
});
