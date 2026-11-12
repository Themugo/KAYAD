// Dealer registration contract (scenarios 1-3) through the REAL CSRF, routes, validation, controller and model layer against a fake
// PostgREST that enforces the repo schema and mirrors kayad_register_identity_atomic (users + user_auth + the trigger-created dealers row).
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "test-jwt-secret-test-jwt-secret-1234";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret-test-refresh-1234";
process.env.SESSION_SECRET ||= "test-session-secret-test-session-1234";
delete process.env.BREVO_API_KEY;
delete process.env.REQUIRE_EMAIL_VERIFICATION;

import express from "express";
import cookieParser from "cookie-parser";
import { startFakePostgrest } from "../helpers/fakePostgrest.js";

const PASS = "Str0ng!Pass";
const boot = async (fakeOptions) => {
  const fake = await startFakePostgrest(fakeOptions);
  process.env.SUPABASE_URL = fake.url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  const { initSupabase } = await import("../../utils/supabase.js");
  initSupabase();
  const { default: authRoutes } = await import("../../routes/authRoutes.js");
  const { csrfToken, csrfProtection } = await import("../../middleware/csrf.js");
  const { default: notFound } = await import("../../middleware/notFound.js");
  const { default: errorHandler } = await import("../../middleware/errorHandler.js");
  const app = express();
  app.use(express.json()); app.use(cookieParser()); app.use(csrfToken); app.use("/api/v1", csrfProtection);
  const v1 = express.Router(); v1.use("/auth", authRoutes); app.use("/api/v1", v1); app.use(notFound); app.use(errorHandler);
  let server; await new Promise((r) => (server = app.listen(0, "127.0.0.1", r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (payload) => {
    const c = await fetch(`${base}/api/v1/auth/csrf`); const { csrfToken: token } = await c.json();
    const cookie = c.headers.getSetCookie().map((x) => x.split(";")[0]).join("; ");
    return fetch(`${base}/api/v1/auth/register`, { method: "POST", headers: { "content-type": "application/json", cookie, "x-csrf-token": token }, body: JSON.stringify(payload) });
  };
  return { fake, post, close: async () => { await new Promise((r) => server.close(r)); await fake.close(); } };
};

describe("dealer registration creates the expected pending records (scenarios 1, 2, 3)", () => {
  let h;
  beforeAll(async () => { h = await boot(); });
  afterAll(async () => { await h.close(); });
  const body = (o = {}) => ({ name: "Makena Otieno", email: "makena@example.com", password: PASS, role: "dealer", businessName: "Makena Dealers", location: "Nairobi", phone: "0712345678", ...o });

  it("valid registration: one pending user, one credential row, one dealer profile (not approved); no verification yet; no second seller record", async () => {
    const res = await h.post(body());
    expect(res.status).toBe(201);
    const u = h.fake.db.users.find((x) => x.email === "makena@example.com");
    expect(u).toMatchObject({ role: "dealer", status: "pending", email_verified: false, business_name: "Makena Dealers", location: "Nairobi" });
    expect(h.fake.db.user_auth.filter((a) => a.user_id === u.id)).toHaveLength(1);
    const dealers = h.fake.db.dealers.filter((d) => d.user === u.id);
    expect(dealers).toHaveLength(1);
    expect(dealers[0].approved).toBe(false);
    expect((h.fake.db.dealer_verifications || []).filter((v) => v.user === u.id)).toHaveLength(0); // created by onboarding submission, not registration
  });

  it.each([
    ["missing business name", { businessName: undefined }],
    ["blank business name", { businessName: "   " }],
    ["missing location", { location: undefined }],
    ["weak password", { password: "short" }],
    ["invalid e-mail", { email: "not-an-email" }],
  ])("invalid registration (%s) is rejected and leaves no user, credential or dealer rows", async (_n, over) => {
    const usersBefore = (h.fake.db.users || []).length; const authBefore = (h.fake.db.user_auth || []).length; const dealersBefore = (h.fake.db.dealers || []).length;
    const res = await h.post(body({ email: `inv${Math.random().toString(36).slice(2)}@example.com`, ...over }));
    expect(res.status).toBe(400);
    expect((h.fake.db.users || []).length).toBe(usersBefore);
    expect((h.fake.db.user_auth || []).length).toBe(authBefore);
    expect((h.fake.db.dealers || []).length).toBe(dealersBefore);
  });

  it("duplicate e-mail (any case) ⇒ 409 and still exactly one account, credential and dealer row", async () => {
    expect((await h.post(body({ email: "dup@example.com" }))).status).toBe(201);
    for (const e of ["dup@example.com", "DUP@Example.com"]) expect((await h.post(body({ email: e }))).status).toBe(409);
    const u = h.fake.db.users.filter((x) => x.email === "dup@example.com");
    expect(u).toHaveLength(1);
    expect(h.fake.db.user_auth.filter((a) => a.user_id === u[0].id)).toHaveLength(1);
    expect(h.fake.db.dealers.filter((d) => d.user === u[0].id)).toHaveLength(1);
  });

  it("concurrent retries of the same registration create exactly one dealer", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => h.post(body({ email: "race-dealer@example.com" }))));
    expect(results.map((r) => r.status).filter((s) => s === 201)).toHaveLength(1);
    const u = h.fake.db.users.filter((x) => x.email === "race-dealer@example.com");
    expect(u).toHaveLength(1);
    expect(h.fake.db.dealers.filter((d) => d.user === u[0].id)).toHaveLength(1);
  });

  it("a client cannot register as approved or as staff", async () => {
    for (const role of ["admin", "superadmin"]) expect((await h.post(body({ email: `${role}@example.com`, role }))).status).toBe(400);
    const res = await h.post(body({ email: "sneaky@example.com", status: "approved", approved: true }));
    expect(res.status).toBe(201);
    const u = h.fake.db.users.find((x) => x.email === "sneaky@example.com");
    expect(u.status).toBe("pending");
    expect(h.fake.db.dealers.find((d) => d.user === u.id).approved).toBe(false);
  });
});

describe("registration when the database migration is missing (the hosted condition)", () => {
  let h;
  beforeAll(async () => { h = await boot({ missingFunctions: ["kayad_register_identity_atomic"] }); });
  afterAll(async () => { await h.close(); });
  it("fails with 503 DATABASE_MIGRATION_REQUIRED and creates nothing", async () => {
    const res = await h.post({ name: "Late", email: "late@example.com", password: PASS, role: "dealer", businessName: "Late Motors", location: "Mombasa" });
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("DATABASE_MIGRATION_REQUIRED");
    expect(h.fake.db.users || []).toHaveLength(0);
    expect(h.fake.db.dealers || []).toHaveLength(0);
  });
});
