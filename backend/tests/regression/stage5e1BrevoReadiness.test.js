// STAGE 5E.1 — backend/scripts/brevo-readiness.mjs : read-only readiness report. fetch is injected; nothing leaves this process.
import { describe, test, expect } from "@jest/globals";
import { run } from "../../scripts/brevo-readiness.mjs";

const FIXTURE_KEY = "xkeysib-" + "fixture0not0a0credential0".repeat(2); // right SHAPE for the shape check, obviously synthetic, built at runtime
const base = { BREVO_API_KEY: FIXTURE_KEY, BREVO_FROM_EMAIL: "sender@example.test", FRONTEND_URL: "https://app.example.test" };
const exec = async (env, argv = [], fetchImpl) => { const lines = []; const code = await run({ env, argv, fetchImpl, out: (s) => lines.push(s) }); const text = lines.join("\n"); let json = null; try { json = JSON.parse(text); } catch { /* usage */ } return { code, text, json }; };
const res = (status, body) => ({ status, json: async () => body });
const mkFetch = (routes) => { const calls = []; const f = async (url, init) => { calls.push({ url, init }); const key = new URL(url).pathname.replace("/v3", ""); const r = routes[key]; if (r instanceof Error) throw r; return r ?? res(404, {}); }; f.calls = calls; return f; };

describe("offline mode", () => {
  test("makes no network call, reports presence/shape only, and never claims readiness", async () => {
    const f = mkFetch({}); const { code, json, text } = await exec(base, [], f);
    expect(code).toBe(0); expect(f.calls).toHaveLength(0);
    expect(json.mode).toBe("offline"); expect(json.config.apiKeyPresent).toBe(true); expect(json.config.apiKeyShapeLooksLikeBrevoV3).toBe(true);
    expect(json.readyForVerificationEmail).toBeNull(); expect(json.configurationLooksUsable).toBe(true);
    expect(text).not.toContain(FIXTURE_KEY); expect(json.config.fromMasked).toBe("se***@example.test");
  });
  test("no key, no from, no frontend: every gap is reported and the built-in default sender is flagged", async () => {
    const { json } = await exec({}, []);
    expect(json.config.apiKeyPresent).toBe(false); expect(json.config.fromIsBuiltInDefault).toBe(true); expect(json.config.gatewayTreatsEmailAsConfigured).toBe(false);
    expect(json.configurationLooksUsable).toBe(false); expect(json.notes.join(" ")).toMatch(/not visible/);
  });
  test("a key without BREVO_FROM_EMAIL: adapter would send, gateway would not treat email as configured", async () => {
    const { json } = await exec({ ...base, BREVO_FROM_EMAIL: "" }, []);
    expect(json.config.gatewayTreatsEmailAsConfigured).toBe(false); expect(json.config.fromIsBuiltInDefault).toBe(true); expect(json.configurationLooksUsable).toBe(false);
  });
  test("non-https FRONTEND_URL and wrong key shape are flagged", async () => {
    const WRONG = "wrong-shape-fixture"; // not the xkeysib- shape
    const { json } = await exec({ ...base, FRONTEND_URL: "http://app.example.test", BREVO_API_KEY: WRONG }, []);
    expect(json.config.frontendUrlIsHttps).toBe(false); expect(json.config.apiKeyShapeLooksLikeBrevoV3).toBe(false); expect(json.configurationLooksUsable).toBe(false);
  });
  test("unknown flags are refused with exit 2 and no network", async () => {
    const f = mkFetch({}); const { code } = await exec(base, ["--send-test-email"], f); expect(code).toBe(2); expect(f.calls).toHaveLength(0);
  });
});

describe("--live-readonly (GET only, injected fetch)", () => {
  const ok = { "/senders": res(200, { senders: [{ email: "sender@example.test", active: true }] }), "/senders/domains": res(200, { domains: [{ domain_name: "example.test", authenticated: true, verified: true }] }) };
  test("valid key + active sender: ready; only two GETs; the key is sent only as the api-key header and never printed", async () => {
    const f = mkFetch(ok); const { code, json, text } = await exec(base, ["--live-readonly"], f);
    expect(code).toBe(0); expect(json.readyForVerificationEmail).toBe(true);
    expect(f.calls.map((c) => c.init.method)).toEqual(["GET", "GET"]); expect(f.calls.map((c) => new URL(c.url).pathname)).toEqual(["/v3/senders", "/v3/senders/domains"]);
    expect(f.calls.every((c) => c.init.headers["api-key"] === FIXTURE_KEY && c.init.body === undefined)).toBe(true);
    expect(text).not.toContain(FIXTURE_KEY);
  });
  test("sender not listed but its domain is authenticated and verified: ready", async () => {
    const f = mkFetch({ ...ok, "/senders": res(200, { senders: [] }) }); expect((await exec(base, ["--live-readonly"], f)).json.readyForVerificationEmail).toBe(true);
  });
  test("sender unknown and domain unauthenticated: NOT ready, with an explanation", async () => {
    const f = mkFetch({ "/senders": res(200, { senders: [] }), "/senders/domains": res(200, { domains: [{ domain_name: "example.test", authenticated: false, verified: true }] }) });
    const { json } = await exec(base, ["--live-readonly"], f); expect(json.readyForVerificationEmail).toBe(false); expect(json.notes.join(" ")).toMatch(/neither an active Brevo sender/);
  });
  test("401 from Brevo: key not accepted, domains endpoint never queried, --require-ready exits 1", async () => {
    const f = mkFetch({ "/senders": res(401, { message: "Key not found" }) }); const r = await exec(base, ["--live-readonly", "--require-ready"], f);
    expect(r.json.live.keyAccepted).toBe(false); expect(r.json.live.senders.httpClass).toBe("401-auth"); expect(f.calls).toHaveLength(1); expect(r.code).toBe(1); expect(r.text).not.toContain("Key not found");
  });
  test("network failure or timeout: reported as not ready without leaking the error text", async () => {
    const f = mkFetch({ "/senders": new Error("connect ECONNREFUSED " + FIXTURE_KEY) }); const { json, text } = await exec(base, ["--live-readonly"], f);
    expect(json.readyForVerificationEmail).toBe(false); expect(json.live.error).toMatch(/network-or-timeout/); expect(text).not.toContain(FIXTURE_KEY);
  });
  test("no key: live mode makes no call", async () => {
    const f = mkFetch(ok); const { json } = await exec({ ...base, BREVO_API_KEY: "" }, ["--live-readonly"], f); expect(f.calls).toHaveLength(0); expect(json.readyForVerificationEmail).toBe(false);
  });
  test("--require-ready without --live-readonly exits 1 (offline can never certify readiness)", async () => {
    expect((await exec(base, ["--require-ready"], mkFetch({}))).code).toBe(1);
  });
});
