// Exactly-once listing creation: the REAL carController.createCar and utils/listingIdempotency with the persistence layer mocked at its edge.
// The database-level guarantees (unique index, advisory lock, 1,600-attempt race) are proven by ci/db-journeys/15_listing_creation_idempotency.mjs on a real schema.
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

process.env.CLOUDINARY_CLOUD_NAME = "x"; process.env.CLOUDINARY_API_KEY = "x"; process.env.CLOUDINARY_API_SECRET = "x";
let created; let existingByKey; let gate; let rpcImpl; let cleaned;
const Car = {
  findOne: jest.fn(async (filter) => (filter.creationIdempotencyKey ? existingByKey.get(`${filter.dealer}|${filter.creationIdempotencyKey}`) || null : null)),
  countDocuments: jest.fn(async () => 0),
  create: jest.fn(async (b) => { if (created.failWith) throw created.failWith; const row = { id: "new1", _id: "new1", ...b }; created.rows.push(row); return row; }),
  findById: jest.fn(async (id) => ({ id, _id: id, title: "x" })),
};
jest.unstable_mockModule("../../models/Car.js", () => ({ default: Car }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn(() => ({ select: async () => ({ id: "d1", role: "dealer", status: "approved", listingCount: 0 }) })), findByIdAndUpdate: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn(() => ({ lean: async () => ({}) })) } }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheDelPattern: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({ uploadMultiple: jest.fn(), deleteImage: jest.fn() }));
jest.unstable_mockModule("../../middleware/upload.js", () => ({ cleanupFiles: jest.fn((f) => { cleaned.push(...f); }) }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: () => ({}) }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/duplicateVehicleService.js", () => ({ detectDuplicates: jest.fn(async () => ({ hasDuplicates: false })), flagDuplicate: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logVehicleCreated: jest.fn(), logVehicleEdited: jest.fn(), logVehicleDeleted: jest.fn() }));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({ getDealerEntitlement: jest.fn(), assertDealerCanCreateListing: jest.fn(async () => gate) }));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({ atomicCreateDealerListing: jest.fn(async (a) => rpcImpl(a)) }));
jest.unstable_mockModule("../../services/mediaRecovery.service.js", () => ({ registerMediaUploadJob: jest.fn(async () => ({})), registerMediaUploadFailure: jest.fn(async () => ({})), completeMediaUpload: jest.fn() }));
jest.unstable_mockModule("../../services/escrowCapability.service.js", () => ({ getEscrowEnabledForNewOrEditedCar: jest.fn(async () => false), getEffectiveEscrowForCar: jest.fn() }));
jest.unstable_mockModule("../../utils/publicListingCache.js", () => ({ invalidatePublicListingCaches: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/privateSellerAuctionEligibility.service.js", () => ({ evaluateEligibilityBatch: jest.fn() }));
jest.unstable_mockModule("../../services/onboardingPolicy.service.js", () => ({ getOnboardingPolicy: jest.fn(), isPolicyTrusted: jest.fn(), sellerMayPublishDirectly: jest.fn(async () => true) }));

const { createCar } = await import("../../controllers/carController.js");
const { readListingIdempotency, classifyReplay } = await import("../../utils/listingIdempotency.js");
const { atomicCreateDealerListing } = await import("../../utils/atomicTransactions.js");

const mkRes = () => { const r = { code: 200, body: null, headers: {} }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; r.set = (k, v) => { r.headers[k] = v; return r; }; return r; };
const KEY = "idem-key-0001-abcdef";
const mkReq = (over = {}) => ({
  user: { id: "d1", role: "dealer", effectiveRole: "dealer" }, body: { title: "Prado", brand: "Toyota", model: "Prado", year: "2019", price: "100", city: "Nairobi" },
  files: [{ path: "/tmp/a.png", originalname: "a.png", mimetype: "image/png", size: 10 }], headers: { "idempotency-key": KEY },
  get(h) { return this.headers[String(h).toLowerCase()]; }, ...over,
});
const hashOf = (req) => readListingIdempotency(req).hash;
beforeEach(() => { created = { rows: [], failWith: null }; existingByKey = new Map(); gate = { subscriptionRequired: false }; cleaned = []; jest.clearAllMocks(); rpcImpl = async () => ({ listing: { id: "paid1" }, idempotent: false }); });

describe("key and hash derivation", () => {
  test("no header means no idempotency (behaviour unchanged)", () => { expect(readListingIdempotency(mkReq({ headers: {} }))).toBeNull(); });
  test.each([["short"], ["has space in it"], ["x".repeat(201)], ["bad/char/slash!"]])("invalid key %p is an error", (k) => { expect(readListingIdempotency(mkReq({ headers: { "idempotency-key": k } })).error).toMatch(/Idempotency-Key/); });
  test("the hash is stable for the same content regardless of field order, and changes with any field or file", () => {
    const a = readListingIdempotency(mkReq()); const b = readListingIdempotency(mkReq({ body: { city: "Nairobi", price: "100", year: "2019", model: "Prado", brand: "Toyota", title: "Prado" } }));
    expect(a.hash).toBe(b.hash);
    expect(readListingIdempotency(mkReq({ body: { ...mkReq().body, price: "101" } })).hash).not.toBe(a.hash);
    expect(readListingIdempotency(mkReq({ files: [] })).hash).not.toBe(a.hash);
  });
  test("classifyReplay: new / replay / conflict / gone", () => {
    const idem = readListingIdempotency(mkReq());
    expect(classifyReplay(null, idem)).toBe("new");
    expect(classifyReplay({ creationRequestHash: idem.hash }, idem)).toBe("replay");
    expect(classifyReplay({ creationRequestHash: "other" }, idem)).toBe("conflict");
    expect(classifyReplay({ creationRequestHash: idem.hash, deletedAt: "2026-01-01" }, idem)).toBe("gone");
  });
});

describe("free path (createCar)", () => {
  test("no key: creates, never writes key columns, never looks up", async () => {
    const res = mkRes(); await createCar(mkReq({ headers: {} }), res);
    expect(res.code).toBe(201); expect(Car.findOne).not.toHaveBeenCalled();
    expect(created.rows[0].creationIdempotencyKey).toBeUndefined();
  });
  test("first submission with a key: 201 and the key and request hash are stored with the listing", async () => {
    const req = mkReq(); const h = hashOf(req); const res = mkRes(); await createCar(req, res); // the controller hashes the request AS RECEIVED, before it adds derived fields
    expect(res.code).toBe(201);
    expect(created.rows[0].creationIdempotencyKey).toBe(KEY); expect(created.rows[0].creationRequestHash).toBe(h);
  });
  test("same key + same payload already stored: 200 replay of that listing, nothing created, temp uploads discarded", async () => {
    const req = mkReq(); const h = hashOf(req); existingByKey.set(`d1|${KEY}`, { id: "old1", _id: "old1", creationRequestHash: h });
    const res = mkRes(); await createCar(req, res);
    expect(res.code).toBe(200); expect(res.body.data.id).toBe("old1"); expect(res.headers["Idempotent-Replay"]).toBe("true");
    expect(Car.create).not.toHaveBeenCalled(); expect(cleaned).toHaveLength(1);
  });
  test("same key + different payload: 409 IDEMPOTENCY_KEY_REUSED, nothing created", async () => {
    existingByKey.set(`d1|${KEY}`, { id: "old1", creationRequestHash: "a-different-hash" });
    const res = mkRes(); await createCar(mkReq(), res);
    expect(res.code).toBe(409); expect(res.body.code).toBe("IDEMPOTENCY_KEY_REUSED"); expect(Car.create).not.toHaveBeenCalled();
  });
  test("key of a deleted listing: 409 IDEMPOTENCY_KEY_USED", async () => {
    const req = mkReq(); const h = hashOf(req); existingByKey.set(`d1|${KEY}`, { id: "old1", creationRequestHash: h, deletedAt: "2026-01-01" });
    const res = mkRes(); await createCar(req, res);
    expect(res.code).toBe(409); expect(res.body.code).toBe("IDEMPOTENCY_KEY_USED");
  });
  test("invalid key: 400, nothing created", async () => {
    const res = mkRes(); await createCar(mkReq({ headers: { "idempotency-key": "short" } }), res);
    expect(res.code).toBe(400); expect(res.body.code).toBe("INVALID_IDEMPOTENCY_KEY"); expect(Car.create).not.toHaveBeenCalled();
  });
  test("a concurrent duplicate that wins the race (database 23505 on the key index) is replayed, not duplicated", async () => {
    const req = mkReq(); const h = hashOf(req);
    created.failWith = Object.assign(new Error('duplicate key value violates unique constraint "uq_cars_owner_creation_key"'), { code: "23505" });
    Car.findOne.mockImplementationOnce(async () => null).mockImplementationOnce(async () => ({ id: "winner", _id: "winner", creationRequestHash: h }));
    const res = mkRes(); await createCar(req, res);
    expect(res.code).toBe(200); expect(res.body.data.id).toBe("winner"); expect(cleaned).toHaveLength(1);
  });
  test("a 23505 on the key index where the winner has a different payload is a 409 conflict", async () => {
    created.failWith = Object.assign(new Error("uq_cars_owner_creation_key"), { code: "23505" });
    Car.findOne.mockImplementationOnce(async () => null).mockImplementationOnce(async () => ({ id: "winner", creationRequestHash: "different" }));
    const res = mkRes(); await createCar(mkReq(), res);
    expect(res.code).toBe(409); expect(res.body.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });
  test("any other creation failure is not swallowed as a replay", async () => {
    created.failWith = Object.assign(new Error("boom"), { code: "XX000" });
    const res = mkRes(); await createCar(mkReq(), res);
    expect(res.code).toBeGreaterThanOrEqual(400); expect(res.body?.idempotentReplay).toBeUndefined();
  });
});

describe("paid path (kayad_create_dealer_listing_atomic)", () => {
  beforeEach(() => { gate = { subscriptionRequired: true }; });
  test("passes the owner-scoped key and the request hash to the database function", async () => {
    const req = mkReq(); const h = hashOf(req); const res = mkRes(); await createCar(req, res);
    expect(atomicCreateDealerListing).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: KEY, requestHash: h, dealerId: "d1" }));
    expect(res.code).toBe(201);
  });
  test("without a header the database receives a unique per-request key and no hash (no replay is possible)", async () => {
    const res = mkRes(); await createCar(mkReq({ headers: {} }), res);
    const arg = atomicCreateDealerListing.mock.calls[0][0]; expect(arg.requestHash).toBeNull(); expect(arg.idempotencyKey).toMatch(/^listing:d1:/);
  });
  test("an idempotent replay from the database is a 200 with no further side effects", async () => {
    rpcImpl = async () => ({ listing: { id: "paid1" }, idempotent: true });
    const res = mkRes(); await createCar(mkReq(), res);
    expect(res.code).toBe(200); expect(res.headers["Idempotent-Replay"]).toBe("true"); expect(cleaned).toHaveLength(1);
  });
  test("the database refusing a reused key with another payload is a 409", async () => {
    rpcImpl = async () => { throw new Error("IDEMPOTENCY_KEY_REUSED: this Idempotency-Key was already used for a different listing request"); };
    const res = mkRes(); await createCar(mkReq(), res);
    expect(res.code).toBe(409); expect(res.body.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });
});
