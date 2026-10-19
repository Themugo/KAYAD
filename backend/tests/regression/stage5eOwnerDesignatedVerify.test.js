// STAGE 5E — `owner-bootstrap.mjs --verify-designated`: an offline, boolean-only check that the CONFIGURED designated owner addresses are
// exactly the ones the operator expects. Needed because --plan masks identities ("ow***@…"), so a one-letter spelling difference between the
// configured and the intended address is invisible. EVIDENCE TIER: R (spawned process). No database, no network, no service key.
import { describe, test, expect } from "@jest/globals";
import { spawnSync } from "child_process"; import path from "path";
const script = path.resolve(process.cwd(), "scripts/owner-bootstrap.mjs");
const run = (configured, args) => spawnSync(process.execPath, [script, ...args], {
  env: { PATH: process.env.PATH, NODE_ENV: "test", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", WEBHOIST_EMAIL: configured }, encoding: "utf8", timeout: 30000,
});
const json = (r) => JSON.parse(r.stdout);

describe("owner-bootstrap --verify-designated", () => {
  test("exact configuration → every expected address is configuredExactly, nothing unexpected", () => {
    const r = run("owner-one@kayad-test.example,owner-two@kayad-test.example", ["--verify-designated", "owner-one@kayad-test.example,owner-two@kayad-test.example"]);
    expect(r.status).toBe(0);
    const j = json(r);
    expect(j.configuredCount).toBe(2);
    expect(j.expected.map((e) => e.configuredExactly)).toEqual([true, true]);
    expect(j.configuredButNotExpectedCount).toBe(0);
  });

  test("a one-letter spelling difference is caught even though --plan-style masking would hide it", () => {
    const r = run("owner-one@kayad-test.example,ownr-two-typo@kayad-test.example", ["--verify-designated", "owner-one@kayad-test.example,owner-two@kayad-test.example"]);
    const j = json(r);
    expect(j.expected.map((e) => e.configuredExactly)).toEqual([true, false]);
    expect(j.configuredButNotExpectedCount).toBe(1);
    // the two masked identities of the typo'd pair are indistinguishable, which is exactly why this mode exists
    expect(j.expected[1].identity).toBe("ow***@kayad-test.example");
  });

  test("never prints a configured value (only the masked form of what the operator typed)", () => {
    const r = run("hidden-configured-value@kayad-test.example", ["--verify-designated", "other@kayad-test.example"]);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).not.toContain("hidden-configured-value");
    expect(json(r).expected[0].configuredExactly).toBe(false);
  });

  test("uses the runtime normalisation: case, surrounding space and full-width look-alikes", () => {
    const r = run("  Owner-One@Kayad-Test.Example ", ["--verify-designated", "ｏｗｎｅｒ-one@kayad-test.example"]);
    expect(json(r).expected[0].configuredExactly).toBe(true);
  });

  test("works with no database or service key, writes nothing, and an empty argument is refused (exit 2)", () => {
    expect(run("a@example.test", ["--verify-designated", "a@example.test"]).status).toBe(0);
    expect(run("a@example.test", ["--verify-designated", ""]).status).toBe(2);
    expect(run("a@example.test", ["--verify-designated"]).status).toBe(2);
  });

  test("an unconfigured deployment reports configuredCount 0 and false for everything (missing configuration grants nothing)", () => {
    const r = run("", ["--verify-designated", "a@example.test"]);
    const j = json(r);
    expect(j.configuredCount).toBe(0);
    expect(j.expected[0].configuredExactly).toBe(false);
  });

  test("the other modes still refuse without a database (unchanged behaviour)", () => {
    expect(run("a@example.test", ["--plan"]).status).toBe(2);
    expect(run("a@example.test", []).status).toBe(2);
  });
});
