import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Repo root, independent of the directory the runner was started from (backend/ in CI).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("production runtime correction contract", () => {
  it("contains the canonical service-role runtime privilege migration", () => {
    const migration = fs.readFileSync(
      path.join(root, "supabase/migrations/20260929100000_production_service_role_runtime_integrity.sql"),
      "utf8",
    );
    expect(migration).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;");
    expect(migration).toContain("ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public");
    expect(migration).toContain("notify_on_price_drop BOOLEAN NOT NULL DEFAULT false");
    expect(migration).toContain("public.cars");
    expect(migration).toContain("public.saved_searches");
  });

  it("normalizes nested Date filters before Supabase/PostgREST serialization", () => {
    const source = fs.readFileSync(path.join(root, "backend/db/index.js"), "utf8");
    expect(source).toContain("const normalizeFilterValue = (value) => value instanceof Date ? value.toISOString() : value;");
    expect(source).toContain("query.gte(col, normalizeFilterValue(val))");
    expect(source).toContain("query.lte(col, normalizeFilterValue(val))");
    expect(source).toContain("map(normalizeFilterValue)");
  });
});
