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

describe("registration safety: escalation, normalisation, concurrency", () => {
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

  const PASS = "Str0ng!Pass";

  it("never lets a client self-assign admin/staff roles: the request is refused and nothing is created", async () => {
    for (const [i, role] of ["admin", "superadmin", "escrow_officer", "broker", "ghost_checker", { $ne: null }].entries()) {
      const res = await post({ name: "Esc " + i, email: `esc${i}@example.com`, password: PASS, role });
      expect(res.status).toBe(400); // zod role enum is dealer | individual_seller | user
      expect((fake.db.users || []).find((u) => u.email === `esc${i}@example.com`)).toBeUndefined();
    }
  });

  it("an omitted or explicit \"user\" role registers an approved buyer, never a staff role", async () => {
    const a = await post({ name: "Plain Buyer", email: "plainbuyer@example.com", password: PASS });
    const b = await post({ name: "Explicit Buyer", email: "explicitbuyer@example.com", password: PASS, role: "user" });
    expect([a.status, b.status]).toEqual([201, 201]);
    for (const e of ["plainbuyer@example.com", "explicitbuyer@example.com"]) {
      const row = fake.db.users.find((u) => u.email === e);
      expect(row.role).toBe("user");
      expect(row.status).toBe("approved");
      expect(row.email_verified).toBe(false);
    }
  });

  it("a private seller is created pending-approval (not approved) and not email-verified", async () => {
    const res = await post({ name: "Priv Seller", email: "privseller@example.com", password: PASS, role: "individual_seller", phone: "0712345678" });
    // Seller registration is owner-policy controlled: either it is open (201, pending) or it is refused with a stable code.
    // It must never succeed as an already-approved / verified seller.
    if (res.status === 201) {
      const row = fake.db.users.find((u) => u.email === "privseller@example.com");
      expect(row.role).toBe("individual_seller");
      expect(row.status).toBe("pending");
      expect(row.email_verified).toBe(false);
    } else {
      expect([403, 503]).toContain(res.status);
      expect((fake.db.users || []).find((u) => u.email === "privseller@example.com")).toBeUndefined();
    }
  });

  it("treats case/whitespace variants of an existing email as the same identity (409, one row)", async () => {
    expect((await post({ name: "Norm", email: "norm@example.com", password: PASS })).status).toBe(201);
    for (const variant of ["NORM@example.com", "Norm@Example.COM"]) {
      expect((await post({ name: "Norm Again", email: variant, password: PASS })).status).toBe(409);
    }
    // Whitespace-padded input is refused at validation (the SPA trims before sending); it never creates a row either way.
    expect((await post({ name: "Norm Pad", email: "  norm@example.com  ", password: PASS })).status).toBe(400);
    const rows = fake.db.users.filter((u) => u.email === "norm@example.com");
    expect(rows).toHaveLength(1);
    expect(fake.db.user_auth.filter((a) => a.user_id === rows[0].id)).toHaveLength(1);
  });

  it("concurrent submissions of the same identity create exactly one account and one credential row", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () => post({ name: "Race", email: "race@example.com", password: PASS })),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(5);
    const rows = fake.db.users.filter((u) => u.email === "race@example.com");
    expect(rows).toHaveLength(1);
    expect(fake.db.user_auth.filter((a) => a.user_id === rows[0].id)).toHaveLength(1);
  });

  it("does not echo the password, hash or verification token in any registration response", async () => {
    const res = await post({ name: "Leak Check", email: "leak@example.com", password: PASS });
    const text = await res.text();
    expect(text).not.toContain(PASS);
    expect(text).not.toMatch(/\$2[aby]\$/);
    expect(text).not.toMatch(/verif\w*Token|emailVerifyToken|email_verify_token/i);
  });
});
