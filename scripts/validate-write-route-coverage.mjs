import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const register = resolve(root, "docs/handover/API_VALIDATION_GAP_REGISTER_20261109.csv");
assert.ok(existsSync(register), "API validation gap register must exist");
const rows = readFileSync(register, "utf8").trim().split(/\r?\n/).slice(1).map((line) => {
  const [method, path, routeFile, lineNo, riskClass] = line.split(",");
  return { method, path, routeFile, lineNo: Number(lineNo), riskClass };
}).filter((row) => row.riskClass === "write_without_schema");

const grouped = new Map();
for (const row of rows) grouped.set(row.routeFile, [...(grouped.get(row.routeFile) || []), row]);
let covered = 0;
const failures = [];
for (const [routeFile, expected] of grouped) {
  const sourcePath = resolve(root, "backend/routes", routeFile);
  assert.ok(existsSync(sourcePath), `Missing route file: ${routeFile}`);
  const source = readFileSync(sourcePath, "utf8");
  const actual = [...source.matchAll(/router\.(post|put|patch|delete)\s*\(([^\n]*)/gi)]
    .filter((match) => /validateWritePayload/.test(match[2]));
  covered += actual.length;
  if (actual.length !== expected.length) failures.push(`${routeFile}: expected ${expected.length}, found ${actual.length}`);
  if (!/from\s+[\"']\.\.\/middleware\/validateWritePayload\.js[\"']/.test(source)) failures.push(`${routeFile}: missing validator import`);
}
assert.equal(rows.length, 76, "Expected the original 76-endpoint remediation baseline");
assert.equal(covered, 76, "Every identified write endpoint must use the request-boundary validator");
assert.deepEqual(failures, [], failures.join("\n"));
console.log(`PASS: ${covered}/${rows.length} previously unvalidated write endpoints now pass through validateWritePayload.`);
console.log("NOTE: Domain-specific required fields and authorization remain enforced by controller/domain validation and are not replaced by this bounded request-envelope guard.");
