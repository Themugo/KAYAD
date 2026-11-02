// ============================================================
// GUEST BROWSING vs ACCOUNT-REQUIRED ACTIONS (2026-11-01). Static contract over the real route files + App route table:
// public reads carry no authentication guard; saving, bidding, enquiries, listing creation and applications do.
// EVIDENCE TIER: source contract (the routers themselves need a database to execute, so the guard wiring is asserted from source).
// ============================================================
import { describe, test, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
// Collect every `router.<verb>(` call as { verb, path, text } where text runs to the next router.<verb>( call.
const routes = (file) => {
  const src = read(file);
  const re = /router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]*)["'`]/g;
  const hits = [...src.matchAll(re)];
  return hits.map((m, i) => ({ verb: m[1], path: m[2], text: src.slice(m.index, hits[i + 1]?.index ?? src.length) }));
};
const guarded = (r) => /\bprotect\b|requireAuth|authorize\(|adminOnly|dealerOnly|allowRoles|sellerListingAccess/.test(r.text.split("asyncHandler")[0]);
const find = (file, verb, p) => routes(file).find((r) => r.verb === verb && r.path === p);

describe("guests can browse public content without an account", () => {
  test.each([
    ["backend/routes/auctionRoutes.js", "get", "/"],
    ["backend/routes/auctionRoutes.js", "get", "/active"],
    ["backend/routes/auctionRoutes.js", "get", "/:id"],
    ["backend/routes/auctionRoutes.js", "get", "/:id/bids"],
    ["backend/routes/inspectorApplicationRoutes.js", "get", "/active"],
  ])("%s %s %s needs no sign-in", (file, verb, p) => {
    const r = find(file, verb, p); expect(r).toBeTruthy(); expect(guarded(r)).toBe(false);
  });
  test("public vehicle list and detail are not authentication-guarded", () => {
    const cars = routes("backend/routes/carRoutes.js");
    const publicGets = cars.filter((r) => r.verb === "get" && (r.path === "/" || r.path === "/:id"));
    expect(publicGets.length).toBeGreaterThan(0);
    for (const r of publicGets) expect(guarded(r)).toBe(false);
  });
  test("the analytics collector accepts guests", () => {
    const r = find("backend/routes/analyticsRoutes.js", "post", "/collect"); expect(r.text).toMatch(/optionalAuth/); expect(r.text).not.toMatch(/\bprotect\b/);
  });
  test("the storefront (home, marketplace, vehicle and auction pages) is not wrapped in RequireAuth", () => {
    const app = read("src/App.tsx");
    expect(app).toContain("path.startsWith('/auction/')) return <AuctionLivePage");
    expect(app).toMatch(/vehiclePathMatch = path\.match\(\/\^\\\/cars/);
    const guardedLines = app.split("\n").filter((l) => /RequireAuth/.test(l) && /path ===|startsWith/.test(l));
    for (const l of guardedLines) expect(l).not.toMatch(/path === '\/'\)|marketplace|\/auction\/'\)|\/cars/);
    // the in-app workspaces that DO need an account are the explicit list; marketplace and auctions are not in it
    const set = app.match(/const protectedNavs = new Set\(\[([^\]]*)\]/)[1];
    for (const open of ["marketplace", "auctions", "inspections", "home"]) expect(set).not.toContain(`'${open}'`);
  });
});

describe("account-required actions refuse a guest", () => {
  test("saving / favouriting: every favourites route is behind protect", () => {
    expect(read("backend/routes/favoriteRoutes.js")).toMatch(/router\.use\(protect\)/);
  });
  test.each([
    ["backend/routes/bidRoutes.js", "post", "/:id/bid"],
    ["backend/routes/bidRoutes.js", "get", "/my"],
    ["backend/routes/carRoutes.js", "get", "/my-listings"],
    ["backend/routes/carRoutes.js", "get", "/dealer/my-cars"],
    ["backend/routes/privateSellerCapabilityRoutes.js", "post", "/apply"],
    ["backend/routes/privateSellerCapabilityRoutes.js", "get", "/me"],
    ["backend/routes/inspectorApplicationRoutes.js", "get", "/my"],
    ["backend/routes/leadRoutes.js", "get", "/"],
    ["backend/routes/accountCapabilitiesRoutes.js", "get", "/capabilities"],
  ])("%s %s %s requires an account", (file, verb, p) => {
    const r = find(file, verb, p); expect(r).toBeTruthy(); expect(guarded(r)).toBe(true);
  });
  test("creating a listing requires an account (and seller authority)", () => {
    const creates = routes("backend/routes/carRoutes.js").filter((r) => r.verb === "post" && r.path === "/");
    expect(creates.length).toBeGreaterThan(0); for (const r of creates) expect(guarded(r)).toBe(true);
  });
  test("dealer application endpoints require an account", () => {
    for (const p of ["/application", "/paperwork-requirements"]) { const r = find("backend/routes/dealerRoutes.js", p === "/application" ? "post" : "get", p); expect(guarded(r)).toBe(true); }
  });
  test("bids are state-changing and also sit behind CSRF + idempotency in the server mount", () => {
    expect(read("backend/server.js")).toMatch(/app\.use\("\/api\/bids", idempotencyCheck, csrfProtection, bidRoutes\)/);
  });
});

describe("one account: registration creates exactly one identity; applications attach to it", () => {
  test("there is no second 'seller registration' route that creates another user for an existing account", () => {
    const auth = read("backend/routes/authRoutes.js");
    const posts = [...auth.matchAll(/router\.post\(\s*["'`]([^"'`]*)/g)].map((m) => m[1]);
    expect(posts.filter((p) => /register/i.test(p))).toEqual(expect.arrayContaining(["/register"]));
    expect(posts.filter((p) => /register.*(seller|buyer)|(seller|buyer).*register/i.test(p))).toEqual([]);
  });
  test("private-seller, dealer and inspector applications all key on the signed-in user id", () => {
    expect(read("backend/services/privateSellerCapability.service.js")).toMatch(/user_id/);
    expect(read("backend/routes/dealerRoutes.js")).toMatch(/findOne\("dealers", \{ user: req\.user\.id \}\)/);
    expect(read("backend/controllers/inspectorApplicationController.js")).toMatch(/user: req\.user\?\.id/);
  });
  test("no endpoint lets a user set their own role or capability", () => {
    const caps = routes("backend/routes/accountCapabilitiesRoutes.js"); expect(caps.every((r) => r.verb === "get")).toBe(true);
    const profile = read("backend/routes/userRoutes.js");
    expect(profile).not.toMatch(/req\.body\.role\b(?!.*(?:delete|reject|forbid))/s);
  });
});
