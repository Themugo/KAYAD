import { describe, it, expect } from "@jest/globals";
import fs from "fs";
const sql = fs.readFileSync(new URL("../../../supabase/migrations/20261112090000_dealer_business_name_uniqueness.sql", import.meta.url), "utf8");
describe("G-24 migration is additive and safe", () => {
  it("never deletes or rewrites data", () => { expect(sql).not.toMatch(/\b(delete\s+from|drop\s+table|truncate|update\s+public\.)/i); });
  it("only creates the index when existing data is clean, normalised and partial", () => {
    expect(sql).toMatch(/IF EXISTS \(SELECT 1 FROM public\.dealer_business_name_conflicts\)/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS dealers_business_name_unique/);
    expect(sql).toMatch(/WHERE public\.kayad_normalize_business_name\(business_name\) IS NOT NULL/);
  });
  it("review views are not exposed to anon/authenticated", () => { expect(sql).toMatch(/REVOKE ALL ON public\.dealer_business_name_conflicts.*FROM PUBLIC, anon, authenticated/); });
  it("is the newest migration, preserving order", () => {
    const files = fs.readdirSync(new URL("../../../supabase/migrations/", import.meta.url)).sort();
    expect(files[files.length - 1]).toBe("20261112090000_dealer_business_name_uniqueness.sql");
  });
});
