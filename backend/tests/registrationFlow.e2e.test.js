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
import { startFakePostgrest } from "./helpers/fakePostgrest.js";

describe("registration e2e (csrf -> register)", () => {
  let fake, server, base;

  beforeAll(async () => {
    fake = await startFakePostgrest();
    process.env.SUPABASE_URL = fake.url;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const { initSupabase } = await import("../utils/supabase.js");
    initSupabase();
    const { default: authRoutes } = await import("../routes/authRoutes.js");
    const { csrfToken, csrfProtection } = await import("../middleware/csrf.js");
    const { default: notFound } = await import("../middleware/notFound.js");
    const { default: errorHandler } = await import("../middleware/errorHandler.js");
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

  const bootstrap = async () => {
    const res = await fetch(`${base}/api/v1/auth/csrf`);
    const body = await res.json();
    const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    return { token: body.csrfToken, cookie };
  };

  const post = async (payload, { csrf = true } = {}) => {
    const { token, cookie } = await bootstrap();
    return fetch(`${base}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        ...(csrf ? { "x-csrf-token": token } : {}),
      },
      body: JSON.stringify(payload),
    });
  };

  it("rejects registration without a CSRF header", async () => {
    const res = await post({ name: "No Csrf", email: "nocsrf@example.com", password: "Str0ng!Pass" }, { csrf: false });
    expect(res.status).toBe(403);
  });

  it("registers a buyer and persists users + user_auth rows", async () => {
    const res = await post({ name: "Buyer One", email: "Buyer.One@Example.com", password: "Str0ng!Pass", role: "user", phone: "0712345678" });
    const body = await res.json();
    if (res.status !== 201) console.error("REGISTER FAILED", res.status, body, JSON.stringify(fake.log.slice(-4)));
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe("buyer.one@example.com");
    expect(body.user.role).toBe("user");
    expect(fake.db.users.find((u) => u.email === "buyer.one@example.com").status).toBe("approved");
    expect(fake.db.user_auth).toHaveLength(1);
    expect(fake.db.user_auth[0].password).not.toBe("Str0ng!Pass");
  });

  it("registers a dealer as pending with business details", async () => {
    const res = await post({ name: "Dealer One", email: "dealer@example.com", password: "Str0ng!Pass", role: "dealer", businessName: "Gari Motors", location: "Nairobi" });
    const body = await res.json();
    if (res.status !== 201) console.error("DEALER FAILED", res.status, body);
    expect(res.status).toBe(201);
    const row = fake.db.users.find((u) => u.email === "dealer@example.com");
    expect(row.status).toBe("pending");
    expect(row.business_name).toBe("Gari Motors");
  });

  it("rejects duplicates with 409 and weak passwords with 400", async () => {
    expect((await post({ name: "Dup", email: "dealer@example.com", password: "Str0ng!Pass" })).status).toBe(409);
    expect((await post({ name: "Weak", email: "weak@example.com", password: "weak" })).status).toBe(400);
  });

  it("does not block or roll back registration when email delivery fails", async () => {
    const realFetch = global.fetch;
    process.env.BREVO_API_KEY = "test-brevo-key";
    process.env.BREVO_FROM_EMAIL = "noreply@kayad.space";
    global.fetch = (url, opts) =>
      String(url).startsWith("https://api.brevo.com/")
        ? Promise.resolve(new Response(JSON.stringify({ message: "unauthorized" }), { status: 401 }))
        : realFetch(url, opts);
    try {
      const res = await post({ name: "Mail Down", email: "maildown@example.com", password: "Str0ng!Pass" });
      expect(res.status).toBe(201);
      expect(fake.db.users.some((u) => u.email === "maildown@example.com")).toBe(true);
    } finally {
      global.fetch = realFetch;
      delete process.env.BREVO_API_KEY;
      delete process.env.BREVO_FROM_EMAIL;
    }
  });

  it("uses the atomic RPC with the exact argument contract of the migration", () => {
    const rpcCall = fake.log.find((l) => l.method === "RPC" && l.fn === "kayad_register_identity_atomic");
    expect(Object.keys(rpcCall.args).sort()).toEqual(
      ["p_business_name","p_email","p_email_verify_expire","p_email_verify_token","p_location","p_name","p_password_hash","p_phone","p_referred_by","p_role"].sort(),
    );
  });
});

describe("registration when the RPC migration is not applied", () => {
  it("returns 503 DATABASE_MIGRATION_REQUIRED, not an opaque 500", async () => {
    const fake2 = await startFakePostgrest({ missingFunctions: ["kayad_register_identity_atomic"] });
    process.env.SUPABASE_URL = fake2.url;
    const { initSupabase } = await import("../utils/supabase.js");
    initSupabase();
    const { default: authRoutes } = await import("../routes/authRoutes.js");
    const { csrfToken } = await import("../middleware/csrf.js");
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(csrfToken);
    app.use("/api/v1/auth", authRoutes);
    const srv = await new Promise((r) => { const x = app.listen(0, "127.0.0.1", () => r(x)); });
    const b = `http://127.0.0.1:${srv.address().port}`;
    try {
      const c = await (await fetch(`${b}/api/v1/auth/csrf`)).json();
      const res = await fetch(`${b}/api/v1/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "No Migration", email: "nomig@example.com", password: "Str0ng!Pass" }),
      });
      const body = await res.json();
      expect(res.status).toBe(503);
      expect(body.code).toBe("DATABASE_MIGRATION_REQUIRED");
      expect(c.csrfToken).toBeTruthy();
    } finally {
      await new Promise((r) => srv.close(r));
      await fake2.close();
    }
  });
});
