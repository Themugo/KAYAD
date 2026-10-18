// ============================================================
// STAGE 4 (2026-10-18) — Workstream G: feature-flag schema dependency.
//
// FACTS established from the repository (no hosted database consulted):
//   - no migration, schema file or runbook CREATEs or ALTERs public.feature_flags;
//   - the 2026-10-11 reconciliation recorded it as "in no migration and not in
//     production" (docs/audits/21-ROUTE-SCHEMA-TRIAGE-20261011.md);
//   - services/featureFlagService.js calls FeatureFlag.* static helpers
//     (getByKey, isEnabled, evaluate, toggle...) that models/FeatureFlag.js
//     (createModel) does not define, and does not import FeatureFlag at all;
//   - middleware/featureFlag.js (which fails OPEN by design) is mounted nowhere.
// Consequence: the feature-flag endpoints cannot work on any database built from
// the repository, and nothing in production request handling depends on them.
// These tests pin that state and the safer Stage 3A attribution behaviour so a
// future change (adding the table, wiring the middleware) is a deliberate decision.
// The hosted table structure is NOT guessed here.
// ============================================================
import { jest, describe, test, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const backend = path.join(repoRoot, "backend");
const read = (p) => fs.readFileSync(path.join(repoRoot, p), "utf8");

const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "tests", ".git", "coverage"].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc); else if (e.name.endsWith(".js")) acc.push(full);
  }
  return acc;
};

describe("S4-G-01 schema: nothing in the repository defines public.feature_flags", () => {
  test("no migration creates or alters feature_flags", () => {
    const dir = path.join(repoRoot, "supabase/migrations");
    const hits = fs.readdirSync(dir).filter((f) => f.endsWith(".sql") && /feature_flags/i.test(fs.readFileSync(path.join(dir, f), "utf8")));
    expect(hits).toEqual([]);
  });
  test("therefore no repository evidence exists for created_by / updated_by on that table", () => {
    const dir = path.join(repoRoot, "supabase/migrations");
    const sql = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    expect(/ALTER TABLE\s+(public\.)?feature_flags/i.test(sql)).toBe(false);
  });
});

describe("S4-G-02 attribution: handlers do not write unverified created_by / updated_by", () => {
  test("create and update pass NO actor id when the principal only has `id` (pre-Stage-2 behaviour)", async () => {
    const createFlag = jest.fn(async () => ({ key: "k" }));
    const updateFlag = jest.fn(async () => ({ key: "k" }));
    const noop = () => jest.fn(async () => ({}));
    jest.unstable_mockModule("../../services/featureFlagService.js", () => ({
      createFlag, updateFlag, getFlag: noop(), getAllFlags: noop(), getFlagsByCategory: noop(), deleteFlag: noop(), toggleFlag: noop(),
      getFlagStats: noop(), getFlagsByEnvironment: noop(), getFlagsByRole: noop(), getFlagCategories: noop(), batchEvaluateFlags: noop(),
      getEnabledFlagsForUser: noop(), evaluateFlag: noop(),
    }));
    jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
    const c = await import("../../controllers/featureFlagController.js");
    const mkRes = () => { const r = { code: 200 }; r.status = (x) => { r.code = x; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
    await c.createFlagHandler({ user: { id: "11111111-1111-4111-8111-111111111111" }, body: { key: "k" } }, mkRes());
    await c.updateFlagHandler({ user: { id: "11111111-1111-4111-8111-111111111111" }, params: { key: "k" }, body: { description: "d" } }, mkRes());
    expect(createFlag).toHaveBeenCalledWith({ key: "k" }, undefined);
    expect(updateFlag).toHaveBeenCalledWith("k", { description: "d" }, undefined);
  });
});

describe("S4-G-03 runtime: the flag subsystem is not operational and not relied upon", () => {
  test("the service uses FeatureFlag.* helpers that the model does not define", async () => {
    const svc = read("backend/services/featureFlagService.js");
    const used = [...new Set([...svc.matchAll(/FeatureFlag\.(\w+)\(/g)].map((m) => m[1]))];
    expect(used.length).toBeGreaterThan(0);
    const { createModel } = await import("../../models/_base.js");
    const model = createModel("FeatureFlag");
    const missing = used.filter((m) => typeof model[m] !== "function");
    // `distinct` is generic and exists; every domain helper does not.
    expect(missing).toEqual(expect.arrayContaining(["getByKey", "isEnabled", "evaluate", "toggle", "getEnabledFlags"]));
    expect(/import\s+FeatureFlag\s/.test(svc)).toBe(false);
  });
  test("no route or controller mounts the (fail-open) flag middleware", () => {
    const users = walk(backend).filter((f) => !f.endsWith(path.join("middleware", "featureFlag.js")) && /middleware\/featureFlag(\.js)?["']/.test(fs.readFileSync(f, "utf8")));
    expect(users.map((f) => path.relative(backend, f))).toEqual([]);
  });
  test("STAGE 4A (G4): the service now fails CLOSED (false) on error; it never answers 'enabled' from a broken store", () => {
    const svc = read("backend/services/featureFlagService.js");
    expect(svc).toMatch(/isFlagEnabled[\s\S]*?return false;/);
    expect(svc).toMatch(/evaluateFlag[\s\S]*?return false;/);
    expect(/Return true by default/.test(svc)).toBe(false);
  });
});
