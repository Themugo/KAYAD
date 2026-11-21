// Regression for the P0 "Route not found: /api/v1/auth/csrf" incident.
// authRoutes.js once used `authLimiter` without importing it. The module threw
// ReferenceError at import time, the backend crashed on boot, Render kept the
// previous build, and that build answered with the notFound 404.
// This test imports the REAL router, mounts it on the canonical chain
// (/api/v1 -> /auth -> /csrf) behind the real csrfToken middleware, and makes a
// real HTTP request. It fails if the import breaks or the route disappears.
process.env.NODE_ENV ||= "test";
process.env.JWT_SECRET ||= "test-jwt-secret-test-jwt-secret-1234";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret-test-refresh-1234";
process.env.SESSION_SECRET ||= "test-session-secret-test-session-1234";

import express from "express";
import cookieParser from "cookie-parser";

describe("canonical CSRF bootstrap runtime path", () => {
  let server;
  let base;

  beforeAll(async () => {
    const { default: authRoutes } = await import("../routes/authRoutes.js");
    const { csrfToken } = await import("../middleware/csrf.js");
    const { default: notFound } = await import("../middleware/notFound.js");

    const app = express();
    app.use(cookieParser());
    app.use(csrfToken);
    const v1 = express.Router();
    v1.use("/auth", authRoutes);
    app.use("/api/v1", v1);
    app.use(notFound);

    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("GET /api/v1/auth/csrf returns 200, a token, headers and the cookie", async () => {
    const res = await fetch(`${base}/api/v1/auth/csrf`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-kayad-canonical-route")).toBe("/api/v1/auth/csrf");
    expect(res.headers.get("x-kayad-api-contract")).toBe("v1");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    const cookies = res.headers.getSetCookie().join(";");
    expect(cookies).toContain("XSRF-TOKEN=");
  });

  it("unknown auth routes still 404 (route is not a catch-all)", async () => {
    const res = await fetch(`${base}/api/v1/auth/definitely-missing`);
    expect(res.status).toBe(404);
  });
});
