import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

// AA-S1: /api/marketplace-health summary/trends/alerts expose fraud, dispute and
// financial metrics and must never be reachable without protect + adminOnly.
const src = fs.readFileSync(path.resolve("routes/marketplaceHealthRoutes.js"), "utf8");

describe("marketplace health routes authorization (AA-S1)", () => {
  for (const route of ["/summary", "/trends", "/alerts"]) {
    it(`GET ${route} requires protect and the admin/superadmin guard`, () => {
      const line = src.split("\n").find((l) => l.includes(`router.get("${route}"`));
      expect(line).toBeDefined();
      expect(line).toMatch(/protect/);
      expect(line).toMatch(/healthViewers/);
      expect(src).toMatch(/healthViewers\s*=\s*allowRoles\("admin",\s*"superadmin"\)/);
    });
  }
  it("has no router.get without protect", () => {
    const gets = src.split("\n").filter((l) => /router\.get\(/.test(l));
    for (const l of gets) expect(l).toMatch(/protect/);
  });
});
