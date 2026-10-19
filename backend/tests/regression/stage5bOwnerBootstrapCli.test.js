// STAGE 5B — bootstrap CLI guard rails (no database is reachable in this test; every refusal happens before any connection). EVIDENCE TIER: R (spawned process).
import { describe, test, expect } from "@jest/globals";
import { spawnSync } from "child_process"; import path from "path";
const script = path.resolve(process.cwd(), "scripts/owner-bootstrap.mjs");
const run = (args) => spawnSync(process.execPath, [script, ...args], { env: { PATH: process.env.PATH, NODE_ENV: "test", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", WEBHOIST_EMAIL: "a@example.test,b@example.test" }, encoding: "utf8", timeout: 30000 });
describe("owner-bootstrap CLI refuses unsafe invocations (exit 2) before touching anything", () => {
  test.each([
    ["no mode", []],
    ["--apply without operator", ["--apply", "--confirm-host", "x"]],
    ["--apply without confirm-host", ["--apply", "--operator", "me"]],
    ["--emergency without incident reference", ["--emergency", "--operator", "me", "--confirm-host", "x"]],
    ["unknown flag", ["--plan", "--password", "hunter2"]],
  ])("%s", (_n, args) => {
    const r = run(args);
    expect(r.status).toBe(2);
    expect(r.stdout + r.stderr).not.toMatch(/hunter2|eyJ[A-Za-z0-9_-]{10,}/);
  });
});
