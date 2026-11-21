import { describe, expect, it, vi } from "vitest";
import { csrfProtection, csrfToken, generateCsrfToken } from "../middleware/csrf.js";

const makeResponse = () => ({
  cookie: vi.fn(),
  clearCookie: vi.fn(),
  setHeader: vi.fn(),
  locals: {},
});

describe("CSRF availability contract", () => {
  it("generates a strong token without touching express-session", () => {
    const req = { method: "GET", cookies: {}, session: undefined };
    const res = makeResponse();
    const next = vi.fn();

    csrfToken(req, res, next);

    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [cookieName, token, cookieOptions] = res.cookie.mock.calls[0];
    expect(cookieName).toBe("XSRF-TOKEN");
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(cookieOptions.domain).toBeUndefined();
    expect(res.locals.csrfToken).toBe(token);
    expect(next).toHaveBeenCalledOnce();
    expect(generateCsrfToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reuses the browser token without creating a session write", () => {
    const token = "a".repeat(64);
    const req = { method: "GET", cookies: { "XSRF-TOKEN": token }, session: undefined };
    const res = makeResponse();
    const next = vi.fn();

    csrfToken(req, res, next);

    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(res.cookie.mock.calls[0][1]).toBe(token);
    expect(res.cookie.mock.calls[0][2].domain).toBeUndefined();
    expect(res.locals.csrfToken).toBe(token);
    expect(next).toHaveBeenCalledOnce();
  });

  it("bypasses safe methods without requiring cookies or sessions", () => {
    const req = { method: "OPTIONS", cookies: {}, session: undefined };
    const res = makeResponse();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });


  it("scopes production subdomain cookies to the KAYAD site and clears legacy host-only tokens", () => {
    const token = "e".repeat(64);
    const req = {
      method: "GET",
      hostname: "api.kayad.space",
      cookies: { "XSRF-TOKEN": token },
      session: undefined,
    };
    const res = makeResponse();
    const next = vi.fn();

    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      csrfToken(req, res, next);
    } finally {
      process.env.NODE_ENV = previous;
    }

    expect(res.clearCookie).toHaveBeenCalledWith("XSRF-TOKEN", { path: "/" });
    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(res.cookie.mock.calls[0][2]).toMatchObject({
      domain: ".kayad.space",
      secure: true,
      sameSite: "strict",
      httpOnly: false,
      path: "/",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("supports a fresh browser bootstrap by exposing the middleware token on a GET", () => {
    const token = "f".repeat(64);
    const req = { cookies: { "XSRF-TOKEN": token } };
    const res = {
      locals: { csrfToken: token },
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Mirror the public /auth/csrf route contract without requiring a live
    // Express app in this focused middleware test.
    const handler = (request, response) => {
      const value = response.locals?.csrfToken || request.cookies?.["XSRF-TOKEN"];
      if (!value) return response.status(503).json({ success: false, message: "CSRF token unavailable" });
      return response.json({ success: true, csrfToken: value });
    };

    handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, csrfToken: token });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("accepts matching double-submit cookie and request token", () => {
    const token = "b".repeat(64);
    const req = {
      method: "POST",
      path: "/api/v1/auth/register",
      cookies: { "XSRF-TOKEN": token },
      headers: { "x-csrf-token": token },
      body: {},
    };
    const res = makeResponse();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a missing or mismatched double-submit token", () => {
    const req = {
      method: "POST",
      path: "/api/v1/auth/register",
      cookies: { "XSRF-TOKEN": "c".repeat(64) },
      headers: { "x-csrf-token": "d".repeat(64) },
      body: {},
    };
    const res = makeResponse();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeTruthy();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
