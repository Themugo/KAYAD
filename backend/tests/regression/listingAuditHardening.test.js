// Listing audit hardening (found by the real-schema rehearsal, tests/rehearsal/listingRealSchema.test.js):
// the database requires model/year/price, so a blank one must be a clear 400 (not an opaque 500); database rejections become 4xx;
// every dealer create/update route validates input; fields without a column cannot break a write.
import { describe, test, expect, jest } from "@jest/globals";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";

const { createCarSchema, updateCarSchema } = await import("../../validation/car.schema.js");
const { describeListingDbError } = await import("../../controllers/carController.js");
const carRoutes = (await import("../../routes/carRoutes.js")).default;
const dealerPlatformRoutes = (await import("../../routes/dealerPlatformRoutes.js")).default;

const ok = { title: "Toyota Axio", brand: "Toyota", model: "Axio", year: "2015", price: "1,500,000" };
const errorsOf = (o) => { const r = createCarSchema.safeParse(o); return r.success ? null : r.error.flatten().fieldErrors; };

describe("create validation mirrors the database NOT NULL columns", () => {
  test("a complete payload is valid and numbers are cleaned", () => {
    const r = createCarSchema.safeParse(ok);
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ year: 2015, price: 1500000 });
  });
  test.each([["model", "Model is required"], ["year", "Year is required"], ["price", "Price is required"]])("a missing %s is rejected with a clear message", (field, msg) => {
    const { [field]: _gone, ...rest } = ok;
    expect(errorsOf(rest)?.[field]).toContain(msg);
  });
  test("a blank (whitespace) model is rejected", () => {
    expect(errorsOf({ ...ok, model: "   " })?.model).toBeTruthy();
  });
  test("mileage larger than any real vehicle (and than the integer column) is rejected", () => {
    expect(errorsOf({ ...ok, mileage: "99999999999" })?.mileage).toBeTruthy();
    expect(createCarSchema.safeParse({ ...ok, mileage: "250,000" }).success).toBe(true);
  });
  test("price zero / negative / absurd and year out of range are rejected", () => {
    for (const o of [{ price: "0" }, { price: "-5" }, { price: "100000001" }, { year: "1899" }, { year: "2031" }]) expect(createCarSchema.safeParse({ ...ok, ...o }).success).toBe(false);
  });
  test("fields with NO database column (logbookNo, ntsaStatus) are stripped instead of breaking the insert", () => {
    const r = createCarSchema.safeParse({ ...ok, logbookNo: "LB1", ntsaStatus: "verified" });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty("logbookNo");
    expect(r.data).not.toHaveProperty("ntsaStatus");
  });
  test("edits stay partial: only the fields sent are checked", () => {
    expect(updateCarSchema.safeParse({ price: "2,000,000" }).success).toBe(true);
    expect(updateCarSchema.safeParse({}).success).toBe(true);
    expect(updateCarSchema.safeParse({ model: "" }).success).toBe(false);
  });
});

describe("database rejections become clear 4xx answers", () => {
  test.each([
    [{ code: "23502", message: 'null value in column "year" of relation "cars" violates not-null constraint' }, 400, "LISTING_FIELD_REQUIRED", /Year is required/],
    [{ code: "23502", message: 'null value in column "model" of relation "cars" violates not-null constraint' }, 400, "LISTING_FIELD_REQUIRED", /Model is required/],
    [{ code: "23505", message: 'duplicate key value violates unique constraint "idx_cars_vin_unique"' }, 409, "DUPLICATE_VIN", /VIN/],
    [{ code: "22003", message: 'value "99999999999" is out of range for type integer' }, 400, "LISTING_NUMBER_OUT_OF_RANGE", /too large/],
    [{ code: "22P02", message: 'invalid input syntax for type numeric: "1,500,000"' }, 400, "LISTING_VALUE_INVALID", /format/],
  ])("%j", (err, status, code, re) => {
    const d = describeListingDbError(err);
    expect(d).toMatchObject({ status, code });
    expect(d.message).toMatch(re);
  });
  test("an unknown error is NOT disguised as user input", () => {
    expect(describeListingDbError(new Error("connection reset"))).toBeNull();
    expect(describeListingDbError({ code: "PGRST204", message: "Could not find the 'x' column" })).toBeNull();
  });
});

const handlersOf = (router, method, path) => {
  const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
  return layer ? layer.route.stack.map((s) => s.handle.name) : [];
};
describe("every dealer create/update route validates the vehicle payload", () => {
  test("POST /api/cars and PUT /api/cars/:id", () => {
    expect(handlersOf(carRoutes, "post", "/")).toContain("validateCar");
    expect(handlersOf(carRoutes, "put", "/:id")).toContain("validateCar");
  });
  test("POST /dealer-platform/inventory and PUT /dealer-platform/inventory/:listingId (previously unvalidated)", () => {
    const post = handlersOf(dealerPlatformRoutes, "post", "/inventory");
    const put = handlersOf(dealerPlatformRoutes, "put", "/inventory/:listingId");
    expect(post).toContain("validateCar");
    expect(put).toContain("validateCar");
    // validation must run after the multipart body is parsed and before the controller
    expect(post.indexOf("validateCar")).toBeGreaterThan(post.findIndex((n) => /multer|array/i.test(n) || n === "handleUploadError"));
  });
});
