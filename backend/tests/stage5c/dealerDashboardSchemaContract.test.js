// STAGE 5C — static contract: the dealer dashboard's raw PostgREST queries use real snake_case columns and surface errors.
import { describe, test, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "../../routes/dealerRoutes.js"), "utf8");
const lines = src.split("\n");
// the wholesale (dealer trade) feature has NO backing column in the repository schema; its routes now answer 503 TRADE_LISTINGS_UNAVAILABLE explicitly (see defect ledger).
const rawQueries = lines.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => /\bsb\s*\.from\(|\.from\("/.test(l) || /^\s*\.(eq|in|gte|lte|order|select)\(/.test(l));

describe("dealerRoutes raw queries", () => {
  const forbidden = [
    [/from\("cars"\)[^\n]*\.eq\("dealer",/, "cars.dealer (real column: dealer_id)"],
    [/from\("cars"\)[^\n]*"(bidsCount|favoritesCount|currentBid|auctionStatus|createdAt)"/, "camelCase cars column"],
    [/from\("bids"\)[^\n]*"(carId|createdAt)"/, "camelCase bids column"],
    [/from\("favorites"\)[^\n]*\.(in|eq)\("car",/, "favorites.car (real column: car_id)"],
    [/from\("favorites"\)[^\n]*"createdAt"/, "favorites.createdAt"],
    [/from\("payments"\)[^\n]*\.eq\("user",/, "payments.user (real column: user_id; also the payer, not the dealer)"],
    [/from\("payments"\)[^\n]*"(createdAt|dealerAmount)"/, "camelCase payments column"],
    [/from\("messages"\)[^\n]*"receiver"/, "messages.receiver (no such column)"],
    [/from\("dealer_teams"\)[^\n]*"createdAt"/, "dealer_teams.createdAt"],
  ];
  test.each(forbidden)("no query uses %s", (re, why) => {
    const hits = lines.map((l, i) => [l, i + 1]).filter(([l]) => re.test(l));
    expect(hits.map(([, n]) => `${why} @ line ${n}`)).toEqual([]);
  });
  test("earnings/summary/analytics queries go through must()/countOf so database errors are not rendered as zeros", () => {
    expect(src).toMatch(/const must = \(\{ data, count, error \}\) => \{ if \(error\) throw error;/);
    for (const route of ['"/earnings"', '"/summary"', '"/analytics"', '"/quick-stats"', '"/cars"']) expect(src).toContain(`router.get(\n  ${route}`);
    expect(src).not.toMatch(/\.then\(\(\{ count \}\) => count \|\| 0\)/);
    expect(src).not.toMatch(/\.then\(\(\{ data \}\) => data \|\| \[\]\)/);
  });
  test("settlement and profile are persisted on real columns (dealers.payment_details, users profile columns)", () => {
    expect(src).toContain("payment_details");
    expect(src).toContain('DEALER_PROFILE_COLUMNS = ["name", "phone", "avatar", "businessName", "location", "bio"]');
  });
});

describe("inspector application routes", () => {
  const routes = fs.readFileSync(path.join(here, "../../routes/inspectorApplicationRoutes.js"), "utf8");
  test("review endpoints are NOT behind adminOnly (which admits every staff role incl. the inspectors themselves)", () => {
    expect(routes).not.toMatch(/\badminOnly\b\s*,/);
    expect(routes).toContain('const reviewerOnly = allowRoles("admin", "superadmin", "hr", "technical_support");');
    for (const m of [/router\.get\("\/", protect, reviewerOnly/, /router\.get\("\/:id", protect, reviewerOnly/, /router\.post\("\/:id\/approve", protect, reviewerOnly/, /router\.post\("\/:id\/reject", protect, reviewerOnly/]) expect(routes).toMatch(m);
  });
});
