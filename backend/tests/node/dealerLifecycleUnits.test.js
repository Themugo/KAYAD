import test from "node:test";
import assert from "node:assert/strict";
import { mapLifecycleError, bulkChangeDealerListingStatus, BULK_MAX, missingForPublication } from "../../services/dealerListingSale.service.js";
import { normalizeInvalidationPattern } from "../../middleware/apiCache.js";

test("every lock raised by the database maps to a 409 with a stable code", () => {
  for (const code of ["TRANSACTION_LOCK", "OFFER_SETTLEMENT_LOCK", "AUCTION_OR_BID_LOCK", "ALREADY_SOLD", "LISTING_SOLD_READ_ONLY", "LISTING_STATE_LOCKED"]) {
    const e = mapLifecycleError({ message: `${code}` });
    assert.equal(e.status, 409); assert.equal(e.code, code); assert.equal(e.expose, true);
  }
  assert.equal(mapLifecycleError({ message: "LISTING_NOT_FOUND" }).status, 404);
});
test("a missing function is reported as service unavailable and never leaks its name", () => {
  const e = mapLifecycleError({ code: "PGRST202", message: "Could not find the function public.kayad_dealer_listing_lifecycle_atomic" });
  assert.equal(e.status, 503); assert.ok(!/kayad_dealer/.test(e.message));
});
test("unknown errors pass through untouched", () => {
  const raw = new Error("boom"); assert.equal(mapLifecycleError(raw), raw);
});
test("bulk validation happens before any write", async () => {
  await assert.rejects(bulkChangeDealerListingStatus({ dealerId: "d", ids: ["a"], status: "reserved" }), { code: "INVALID_LISTING_STATUS" });
  await assert.rejects(bulkChangeDealerListingStatus({ dealerId: "d", ids: [], status: "sold" }), { code: "IDS_REQUIRED" });
  await assert.rejects(bulkChangeDealerListingStatus({ dealerId: "d", ids: Array.from({ length: BULK_MAX + 1 }, (_, i) => `id${i}`), status: "sold" }), { code: "TOO_MANY_IDS" });
});
test("a bare cache prefix invalidates every key under it (DA-04 stale banking)", () => {
  assert.equal(normalizeInvalidationPattern("dealer"), "dealer:*");
  assert.equal(normalizeInvalidationPattern("cache:*"), "cache:*");
  assert.equal(normalizeInvalidationPattern("dealer:42:*"), "dealer:42:*");
  const re = new RegExp(normalizeInvalidationPattern("dealer").replace("*", ".*"));
  assert.ok(re.test("dealer:user-1:/settlement:{}"));
});

test("a listing needs brand, model, year, price and a photo before it can be published", () => {
  const ok = { brand: "Toyota", model: "Prado", year: 2018, price: 4000000, images: [{ url: "x" }] };
  assert.deepEqual(missingForPublication(ok), []);
  assert.deepEqual(missingForPublication({ ...ok, images: [] }), ["photos"]);
  assert.deepEqual(missingForPublication({ ...ok, images: "[]" }), ["photos"]);
  assert.deepEqual(missingForPublication({ ...ok, images: JSON.stringify([{ url: "x" }]) }), []);
  assert.deepEqual(missingForPublication({ ...ok, brand: " ", price: 0, year: null }), ["brand", "year", "price"]);
  assert.deepEqual(missingForPublication({}).sort(), ["brand", "model", "photos", "price", "year"]);
});
test("the new pause / publish lock codes map to stable 409s", () => {
  for (const code of ["LISTING_NOT_PUBLISHED", "LISTING_NOT_ELIGIBLE_TO_PUBLISH"]) {
    const e = mapLifecycleError({ message: code }); assert.equal(e.status, 409); assert.equal(e.code, code);
  }
});
