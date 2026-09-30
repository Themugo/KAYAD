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
