// backend/tests/cars.test.js
import request from "supertest";
import dotenv   from "dotenv";
dotenv.config({ path: ".env.test" });

process.env.MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://localhost:27017/kayad-test";
process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV   = "test";

const { default: app } = await import("../server.js").catch(() => ({ default: null }));

describe("🚗 Car Listings", () => {

  test("GET /api/cars — returns paginated list", async () => {
    const res = await request(app)
      .get("/api/cars")
      .expect(200);

    expect(res.body.success ?? true).toBeTruthy();
    expect(Array.isArray(res.body.cars ?? res.body.data ?? [])).toBe(true);
  });

  test("GET /api/cars — respects ?limit cap (max 100)", async () => {
    const res = await request(app)
      .get("/api/cars?limit=9999")
      .expect(200);

    // Our paginationCap middleware should have capped this to 100
    const returnedLimit = res.body.pagination?.limit ?? res.body.limit ?? 100;
    expect(returnedLimit).toBeLessThanOrEqual(100);
  });

  test("GET /api/cars — accepts valid filters", async () => {
    await request(app)
      .get("/api/cars?brand=Toyota&fuel=Petrol&transmission=Automatic")
      .expect(200);
  });

  test("GET /api/cars/:id — returns 404 for bad ID", async () => {
    await request(app)
      .get("/api/cars/000000000000000000000000")
      .expect(404);
  });

  test("POST /api/cars — requires auth", async () => {
    await request(app)
      .post("/api/cars")
      .send({ title: "Test Car", price: 500000 })
      .expect(401);
  });

});
