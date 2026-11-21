// STAGE 5F.5 (D-6): every PERMISSIONS.<KEY> referenced anywhere in backend source must resolve to a real permission string.
// An undefined key made the admin path-layer guard a silent no-op for audit-log, support/chat, inspection and staff paths.
import { describe, test, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { PERMISSIONS } = await import("../../middleware/rbac.js");
const { PERM } = await import("../../config/roles.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (["node_modules", "tests", "coverage", "uploads"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (p.endsWith(".js")) out.push(p);
  }
  return out;
};
const files = walk(root);

describe("permission keys", () => {
  test("every PERMISSIONS.KEY used in source is defined", () => {
    const missing = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/\bPERMISSIONS\.([A-Z_]+)\b/g)) if (PERMISSIONS[m[1]] === undefined) missing.push(`${path.relative(root, f)}:${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
  test("every PERM.KEY used in source is defined", () => {
    const missing = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/\bPERM\.([A-Z_]+)\b/g)) if (PERM[m[1]] === undefined) missing.push(`${path.relative(root, f)}:${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
  test("every PERMISSIONS value is a known permission string", () => {
    const known = new Set(Object.values(PERM));
    expect(Object.entries(PERMISSIONS).filter(([, v]) => !known.has(v)).map(([k]) => k)).toEqual([]);
  });
  test("string-literal requirePermission('x') arguments are known permissions", () => {
    const known = new Set(Object.values(PERM));
    const bad = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/requirePermission\(\s*['"]([a-z_]+)['"]/g)) if (!known.has(m[1])) bad.push(`${path.relative(root, f)}:${m[1]}`);
    }
    expect(bad).toEqual([]);
  });
});
