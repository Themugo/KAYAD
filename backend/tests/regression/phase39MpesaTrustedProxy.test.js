import { afterEach, describe, expect, it } from "@jest/globals";
import express from "express";
import { mpesaIpWhitelist } from "../../middleware/mpesaSecurity.js";

const ENV_KEYS = ["NODE_ENV", "MPESA_ENV", "MPESA_SKIP_IP_CHECK", "MPESA_TRUSTED_PROXY_CIDRS"];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("Phase 39 R25 — M-Pesa callback trusts only explicitly configured proxy peers", () => {
  it("rejects a forged Safaricom X-Forwarded-For when the immediate peer is not a trusted proxy", () => {
    process.env.NODE_ENV = "production";
    process.env.MPESA_ENV = "production";
    delete process.env.MPESA_SKIP_IP_CHECK;
    delete process.env.MPESA_TRUSTED_PROXY_CIDRS;

    const req = {
      ip: "196.201.214.200", // Simulates a misleading req.ip from unsafe proxy trust.
      socket: { remoteAddress: "10.30.1.10" },
      headers: { "x-forwarded-for": "196.201.214.200" },
    };
    const res = makeResponse();
    let nextCalled = false;

    mpesaIpWhitelist(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ResultCode: 1, ResultDesc: "Rejected" });
  });

  it("uses req.ip only when the immediate socket peer belongs to configured trusted proxy CIDRs", () => {
    process.env.NODE_ENV = "production";
    process.env.MPESA_ENV = "production";
    process.env.MPESA_TRUSTED_PROXY_CIDRS = "10.20.0.0/16";
    delete process.env.MPESA_SKIP_IP_CHECK;

    const req = {
      ip: "196.201.214.200",
      socket: { remoteAddress: "10.20.1.10" },
      headers: { "x-forwarded-for": "198.51.100.77, 196.201.214.200" },
    };
    const res = makeResponse();
    let nextCalled = false;

    mpesaIpWhitelist(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(res.body).toBeUndefined();
  });

  it("fails closed when the configured trusted-proxy CIDR is malformed", () => {
    process.env.NODE_ENV = "production";
    process.env.MPESA_ENV = "production";
    process.env.MPESA_TRUSTED_PROXY_CIDRS = "not-a-cidr";
    delete process.env.MPESA_SKIP_IP_CHECK;

    const req = {
      ip: "196.201.214.200",
      socket: { remoteAddress: "10.20.1.10" },
      headers: { "x-forwarded-for": "196.201.214.200" },
    };
    const res = makeResponse();
    let nextCalled = false;

    mpesaIpWhitelist(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(res.body).toEqual({ ResultCode: 1, ResultDesc: "Rejected" });
  });

  it("blocks a real HTTP request that forges a whitelisted address when no trusted proxy CIDR is configured", async () => {
    process.env.NODE_ENV = "production";
    process.env.MPESA_ENV = "production";
    delete process.env.MPESA_SKIP_IP_CHECK;
    delete process.env.MPESA_TRUSTED_PROXY_CIDRS;

    const app = express();
    app.set("trust proxy", 1);
    app.post("/callback", mpesaIpWhitelist, (_req, res) => res.status(204).end());
    const server = app.listen(0, "127.0.0.1");

    try {
      await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
      });
      const address = server.address();
      const response = await fetch(`http://127.0.0.1:${address.port}/callback`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "196.201.214.200" },
        body: "{}",
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ResultCode: 1, ResultDesc: "Rejected" });
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
