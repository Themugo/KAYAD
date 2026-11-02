// LOCAL REAL-SCHEMA REHEARSAL (opt-in): drives the REAL validateCar -> createCar -> Car.create -> db layer, and the REAL
// kayad_create_dealer_listing_atomic function, against a THROWAWAY local PostgreSQL built from supabase/migrations.
// NOT run against any hosted database. Skipped unless REHEARSAL_PG=1 (and PGHOST/PGPORT point at a local socket, database "rehearsal_listing").
//   See scripts/rehearse-listing-local.sh
import { describe, test, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
const note = (...a) => { if (process.env.REHEARSAL_LOG) appendFileSync(process.env.REHEARSAL_LOG, a.join(" ") + "\n"); };
process.env.NODE_ENV = "test";
const ON = process.env.REHEARSAL_PG === "1";
const DB = "rehearsal_listing";
const psql = (sql) => execFileSync("psql", ["-X", "-At", "-q", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const lit = (v) => `$kj$${JSON.stringify(v)}$kj$`;
const DEALER = "11111111-1111-4111-8111-111111111111";
let columns = new Set();
const pgErr = (e) => ({ code: /violates not-null/.test(e.stderr || "") ? "23502" : /violates/.test(e.stderr || "") ? "23xxx" : "P0001", message: String(e.stderr || e.message).split("\n")[0].replace(/^ERROR:\s*/, "") });

// Reads other than the listing insert return "no rows" (policy tables are empty on a fresh database, i.e. defaults apply).
const readChain = (overrides = {}, table = "") => {
  let idEq = null;
  const c = new Proxy(function () {}, {
    get: (_t, prop) => {
      if (prop in overrides) return overrides[prop];
      if (prop === "update" && table === "cars") return (patch) => {
        const upd = { id: null };
        const chain = { eq: (col, val) => { upd.id = val; return chain; }, select: () => chain, single: async () => {
          const keys = Object.keys(patch);
          const unknown = keys.filter((k) => !columns.has(k));
          if (unknown.length) return { data: null, error: { code: "PGRST204", message: `Could not find the '${unknown[0]}' column of 'cars' in the schema cache` } };
          const set = keys.map((k) => `"${k}" = r."${k}"`).join(", ");
          try {
            const out = psql(`update cars set ${set} from jsonb_populate_record(null::cars, ${lit(patch)}::jsonb) r where cars.id = '${upd.id}' returning to_jsonb(cars.*)`);
            return { data: JSON.parse(out.split("\n")[0]), error: null };
          } catch (e) { return { data: null, error: pgErr(e) }; }
        } };
        return chain;
      };
      if (prop === "eq") return (col, val) => { if (table === "cars" && col === "id") idEq = val; return c; };
      if ((prop === "single" || prop === "maybeSingle") && idEq) return async () => ({ data: JSON.parse(psql(`select to_jsonb(cars.*) from cars where id = '${idEq}'`).split("\n")[0] || "null"), error: null });
      if (prop === "then") return (ok) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
      if (prop === "single" || prop === "maybeSingle") return async () => ({ data: null, error: null });
      return () => c;
    },
  });
  return c;
};
const fakeSb = {
  from: (table) => readChain({
    insert: (row) => ({
      select: () => ({
        single: async () => {
          const keys = Object.keys(row);
          const unknown = keys.filter((k) => !columns.has(k));
          if (unknown.length) return { data: null, error: { code: "PGRST204", message: `Could not find the '${unknown[0]}' column of '${table}' in the schema cache` } };
          const cols = keys.map((k) => `"${k}"`).join(",");
          try {
            const out = psql(`insert into "${table}" (${cols}) select ${cols} from jsonb_populate_record(null::"${table}", ${lit(row)}::jsonb) returning to_jsonb("${table}".*)`);
            return { data: JSON.parse(out.split("\n")[0]), error: null };
          } catch (e) { return { data: null, error: pgErr(e) }; }
        },
      }),
    }),
  }, table),
  rpc: async (name, params) => {
    const args = Object.entries(params).map(([k, v]) => `${k} => ${typeof v === "string" ? `${lit(v)}` .replace(/^\$kj\$"(.*)"\$kj\$$/, "'$1'") : `${lit(v)}::jsonb`}`).join(", ");
    try { return { data: JSON.parse(psql(`select ${name}(${args})`).split("\n")[0]), error: null }; }
    catch (e) { return { data: null, error: pgErr(e) }; }
  },
};

const sellerRow = { id: DEALER, role: "dealer", status: "approved", location: "Nairobi" };
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => fakeSb, isSupabaseConnected: () => true, initSupabase: jest.fn(), default: null }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn(() => ({ select: async () => sellerRow })), findByIdAndUpdate: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: () => ({ lean: async () => ({}) }) } }));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({
  getDealerEntitlement: jest.fn(),
  assertDealerCanCreateListing: jest.fn(async () => ({ status: globalThis.__sub ? "active" : "none", subscriptionRequired: !!globalThis.__required })),
}));
jest.unstable_mockModule("../../services/escrowCapability.service.js", () => ({ getEscrowEnabledForNewOrEditedCar: jest.fn(async () => false), getEffectiveEscrowForCar: jest.fn(async () => false) }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({ uploadMultiple: jest.fn(), deleteImage: jest.fn() }));
jest.unstable_mockModule("../../middleware/upload.js", () => ({ cleanupFiles: jest.fn() }));
globalThis.__errs = [];
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: (m, e) => { globalThis.__errs.push(`${m}: ${e?.error ?? e?.message ?? JSON.stringify(e)}`); } }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheDelPattern: jest.fn() }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn() }));
jest.unstable_mockModule("../../services/duplicateVehicleService.js", () => ({ detectDuplicates: jest.fn(async () => ({})), flagDuplicate: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logVehicleCreated: jest.fn(), logVehicleEdited: jest.fn(), logVehicleDeleted: jest.fn() }));
jest.unstable_mockModule("../../services/mediaRecovery.service.js", () => ({ registerMediaUploadJob: jest.fn(async () => ({})), registerMediaUploadFailure: jest.fn(async () => ({})), completeMediaUpload: jest.fn(async () => ({})) }));

const d = ON ? describe : describe.skip;
d("listing creation against the REAL schema (local throwaway Postgres)", () => {
  let createCar; let validateCar;
  beforeAll(async () => {
    columns = new Set(psql("select column_name from information_schema.columns where table_name='cars'").trim().split("\n"));
    ({ createCar } = await import("../../controllers/carController.js"));
    ({ validateCar } = await import("../../middleware/validate.js"));
    process.env.CLOUDINARY_CLOUD_NAME = "x"; process.env.CLOUDINARY_API_KEY = "x"; process.env.CLOUDINARY_API_SECRET = "x";
    psql(`insert into users (id, email, name, role, status) values ('${DEALER}', 'rehearsal-dealer@example.test', 'Eric Kamau', 'dealer', 'approved') on conflict (id) do nothing`);
  });
  beforeEach(() => { psql("delete from listing_entitlement_reservations; delete from cars"); psql("delete from dealer_subscriptions"); globalThis.__required = false; globalThis.__sub = false; });

  // The multipart body the browser sends: every value is a STRING.
  // Like vehicleApi.createCar: empty values are NOT sent at all.
  const formBody = (o = {}) => Object.fromEntries(Object.entries({ title: "Toyota Axio 2015", brand: "Toyota", model: "Axio", year: "2015", price: "1500000", mileage: "82000", fuel: "Petrol", transmission: "Automatic", color: "White", condition: "Ex-Japan", city: "Nairobi", description: "Clean car", ...o }).filter(([, v]) => v !== "" && v !== undefined));
  const run = async (body) => {
    const req = { method: "POST", user: { id: DEALER, role: "dealer" }, body, files: [{ path: "/tmp/kayad-a.jpg", originalname: "a.jpg", mimetype: "image/jpeg" }], get: () => undefined };
    const r = { code: 200, body: null, headersSent: false, status(c) { this.code = c; return this; }, json(b) { this.body = b; this.headersSent = true; return this; } };
    let nexted = false;
    validateCar(req, r, () => { nexted = true; });
    if (!nexted) return { stage: "validation", code: r.code, body: r.body };
    await createCar(req, r);
    return { stage: "controller", code: r.code, body: r.body, cause: globalThis.__errs.splice(0).join(" | ") };
  };
  const rows = () => Number(psql("select count(*) from cars").trim());

  test("FREE mode: the exact dealer-form payload creates a row", async () => {
    const r = await run(formBody());
    expect({ code: r.code, msg: r.body?.message, cause: r.cause }).toEqual({ code: 201, msg: undefined, cause: '' });
    expect(rows()).toBe(1);
  });
  test("REQUIRED mode with a subscription: atomic function creates a row", async () => {
    globalThis.__required = true; globalThis.__sub = true;
    psql(`insert into dealer_subscriptions (dealer, plan_id, plan_name, status, listing_max, amount, starts_at, expires_at) values ('${DEALER}','p','Starter','active',5, 0, now(), now() + interval '30 days')`);
    const r = await run(formBody());
    expect({ code: r.code, msg: r.body?.message, cause: r.cause }).toEqual({ code: 201, msg: undefined, cause: '' });
    expect(rows()).toBe(1);
  });
  test("EVERY field the API accepts at once creates a row", async () => {
    const r = await run(formBody({ bodyType: "Sedan", engine: "1500cc", drivetrain: "FWD", vin: "JTDBR32E720012345", chassisNumber: "NZE141-1234567", registrationNumber: "KDA123A", dealerPhone: "0712345678", features: ["ABS", "Airbags"], address: "Mombasa Road", allowBuy: "true", allowBid: "false", escrowEnabled: "false", auctionStatus: "none", coverImage: "0" }));
    expect({ code: r.code, cause: r.cause }).toEqual({ code: 201, cause: "" });
  });
  test("clients that still send logbookNo / ntsaStatus (no such columns) are not broken by them", async () => {
    const r = await run({ ...formBody(), logbookNo: "LB123", ntsaStatus: "verified" });
    expect({ code: r.code, cause: r.cause }).toEqual({ code: 201, cause: "" });
  });
  test.each([["FREE", false], ["SUBSCRIPTION-REQUIRED", true]])("%s mode: the same VIN twice -> clear 409, not a 500", async (_n, required) => {
    if (required) {
      globalThis.__required = true; globalThis.__sub = true;
      psql(`insert into dealer_subscriptions (dealer, plan_id, plan_name, status, listing_max, amount, starts_at, expires_at) values ('${DEALER}','p','Starter','active',0, 0, now(), now() + interval '30 days')`);
    }
    const o = { vin: "JTDBR32E720099999" };
    expect((await run(formBody(o))).code).toBe(201);
    const second = await run(formBody(o));
    expect(second.code).toBe(409);
    expect(second.body.code).toBe("DUPLICATE_VIN");
    expect(second.body.message).toMatch(/VIN/);
    expect(rows()).toBe(1);
  });
  test.each([
    ["model", { model: "" }, /Model is required/],
    ["year", { year: "" }, /Year is required/],
    ["price", { price: "" }, /Price is required/],
    ["price zero", { price: "0" }, /Price/],
    ["mileage beyond the integer column", { mileage: "99999999999" }, /Mileage/],
    ["year out of range", { year: "1800" }, /Year/],
  ])("blank/invalid %s is a clear 400 from validation, never a database 500", async (_n, over, re) => {
    const r = await run(formBody(over));
    expect({ stage: r.stage, code: r.code }).toEqual({ stage: "validation", code: 400 });
    expect(String(r.body.errors)).toMatch(re);
    expect(rows()).toBe(0);
  });
  test.each([
    ["no optional details at all", { mileage: "", fuel: "", transmission: "", color: "", condition: "", city: "", description: "" }],
    ["comma-formatted numbers", { price: "1,500,000", mileage: "82,000" }],
    ["Locally Assembled", { condition: "Locally Assembled" }],
    ["Locally Used", { condition: "Locally Used" }],
    ["New Import", { condition: "New Import" }],
    ["Petrol", { fuel: "Petrol" }],
  ])("valid: %s", async (_n, over) => {
    const r = await run(formBody(over));
    expect({ code: r.code, cause: r.cause }).toEqual({ code: 201, cause: "" });
    expect(rows()).toBe(1);
  });

  describe("editing a listing (PUT /api/cars/:id)", () => {
    let updateCar;
    beforeAll(async () => { ({ updateCar } = await import("../../controllers/carController.js")); });
    const edit = async (id, body) => {
      const req = { method: "PUT", params: { id }, user: { id: DEALER, role: "dealer" }, body, files: [], get: () => undefined };
      const r = { code: 200, body: null, headersSent: false, status(c) { this.code = c; return this; }, json(b) { this.body = b; this.headersSent = true; return this; } };
      let nexted = false;
      validateCar(req, r, () => { nexted = true; });
      if (!nexted) return { stage: "validation", code: r.code, body: r.body };
      await updateCar(req, r);
      return { stage: "controller", code: r.code, body: r.body, cause: globalThis.__errs.splice(0).join(" | ") };
    };
    const seed = async () => {
      const c = await run(formBody());
      expect(c.code).toBe(201);
      return psql("select id from cars limit 1").trim();
    };
    test("price (comma-formatted), title, fuel, condition and city edits persist", async () => {
      const id = await seed();
      const r = await edit(id, { price: "1,650,000", title: "Toyota Axio 2015 NEW", fuel: "Petrol", condition: "Locally Used", city: "Mombasa" });
      expect({ code: r.code, cause: r.cause }).toEqual({ code: 200, cause: "" });
      expect(psql(`select price||'|'||title||'|'||fuel||'|'||condition||'|'||location_city from cars where id='${id}'`).trim()).toBe("1650000|Toyota Axio 2015 NEW|Petrol|Locally Used|Mombasa");
    });
    test("a blank required field on edit is a clear 400 and the row is unchanged", async () => {
      const id = await seed();
      const r = await edit(id, { model: "" });
      expect(r.code).toBe(400);
      expect(psql(`select model from cars where id='${id}'`).trim()).toBe("Axio");
    });
    test("editing does not drop the photos", async () => {
      const id = await seed();
      await edit(id, { title: "Renamed vehicle" });
      expect(psql(`select jsonb_array_length(images) from cars where id='${id}'`).trim()).toBe("1");
    });
  });
});
