// End-to-end registration contract: real CSRF middleware, real authRoutes,
// real validation, real controller and model layer, against a fake PostgREST
// that enforces the schema from supabase/migrations.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ||= "test-jwt-secret-test-jwt-secret-1234";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret-test-refresh-1234";
process.env.SESSION_SECRET ||= "test-session-secret-test-session-1234";
delete process.env.BREVO_API_KEY;
delete process.env.REQUIRE_EMAIL_VERIFICATION;

import express from "express";
import cookieParser from "cookie-parser";
import { startFakePostgrest } from "../helpers/fakePostgrest.js";

describe("registration repair: broken registration function, retry and recovery", () => {
  let fake, server, base;
  const brokenFunctions = {};

  beforeAll(async () => {
    fake = await startFakePostgrest({ brokenFunctions });
    process.env.SUPABASE_URL = fake.url;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const { initSupabase } = await import("../../utils/supabase.js");
    initSupabase();
    const { default: authRoutes } = await import("../../routes/authRoutes.js");
    const { csrfToken, csrfProtection } = await import("../../middleware/csrf.js");
    const { default: notFound } = await import("../../middleware/notFound.js");
    const { default: errorHandler } = await import("../../middleware/errorHandler.js");
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(csrfToken);
    app.use("/api/v1", csrfProtection);
    const v1 = express.Router();
    v1.use("/auth", authRoutes);
    app.use("/api/v1", v1);
    app.use(notFound);
    app.use(errorHandler);
    await new Promise((r) => (server = app.listen(0, "127.0.0.1", r)));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((r) => server.close(r));
    await fake.close();
  });

  const post = async (payload) => {
    const res = await fetch(`${base}/api/v1/auth/csrf`);
    const { csrfToken: token } = await res.json();
    const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    return fetch(`${base}/api/v1/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie, "x-csrf-token": token },
      body: JSON.stringify(payload),
    });
  };
  const good = (email) => ({ name: "Repair Test", email, password: "Str0ng!Pass", role: "user" });

  afterEach(() => { delete brokenFunctions.kayad_register_identity_atomic; });

  it("placeholder function (2F005, no RETURN) -> honest 503 with a stable code, and nothing is persisted", async () => {
    brokenFunctions.kayad_register_identity_atomic = "no_return";
    const res = await post(good("placeholder@example.com"));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.code).toBe("DATABASE_MIGRATION_REQUIRED");
    expect(JSON.stringify(body)).not.toMatch(/2F005|RETURN|function/i); // no internals leak to the browser
    expect((fake.db.users || []).some((u) => u.email === "placeholder@example.com")).toBe(false);
    expect((fake.db.user_auth || []).length).toBe((fake.db.users || []).length);
  });

  it("function that returns no user row (HTTP 200, null body) is never reported as a created account", async () => {
    brokenFunctions.kayad_register_identity_atomic = "empty";
    const res = await post(good("emptybody@example.com"));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.code).toBe("DATABASE_MIGRATION_REQUIRED");
    expect(body.user).toBeUndefined();
  });

  it("retry after the function is repaired succeeds with the same payload and creates exactly one account", async () => {
    brokenFunctions.kayad_register_identity_atomic = "no_return";
    expect((await post(good("retry@example.com"))).status).toBe(503);
    delete brokenFunctions.kayad_register_identity_atomic;
    const ok = await post(good("retry@example.com"));
    expect(ok.status).toBe(201);
    expect((await ok.json()).user.email).toBe("retry@example.com");
    expect(fake.db.users.filter((u) => u.email === "retry@example.com")).toHaveLength(1);
    expect((await post(good("retry@example.com"))).status).toBe(409); // existing (unverified) account -> duplicate, not a second row
    expect(fake.db.users.filter((u) => u.email === "retry@example.com")).toHaveLength(1);
  });

  it("unified account: the retired individual_seller role still yields a personal account", async () => {
    const res = await post({ ...good("legacyseller@example.com"), role: "individual_seller" });
    expect(res.status).toBe(201);
    expect(fake.db.users.find((u) => u.email === "legacyseller@example.com").role).toBe("user");
  });
});
