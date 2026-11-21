/**
 * V14 runtime/deployment preflight.
 * Read-only: validates the release contract without contacting or mutating production data.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const checks = [];
const check = (name, ok, detail = "") => {
  checks.push([name, Boolean(ok), detail]);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const version = process.versions.node.split(".").map(Number);
const min = [22, 22, 2];
const versionOk = version[0] > min[0] || (version[0] === min[0] && (version[1] > min[1] || (version[1] === min[1] && version[2] >= min[2])));
check("Node runtime meets production contract", versionOk, `running ${process.versions.node}, required >=22.22.2`);
check("package engine preserves production contract", pkg.engines?.node === ">=22.22.2", `configured ${pkg.engines?.node || "missing"}`);
check("live API harness exists", fs.existsSync(path.join(root, "scripts/certify-v14-live-api.mjs")));
const liveHarness = fs.readFileSync(path.join(root, "scripts/certify-v14-live-api.mjs"), "utf8");
check("live API harness is read-only after authentication", !liveHarness.includes('method: "PUT"') && !liveHarness.includes('method: "PATCH"') && !liveHarness.includes('method: "DELETE"') && (liveHarness.match(/method: "POST"/g) || []).length === 1 && liveHarness.includes("/api/v1/auth/login"));
check("live API harness uses canonical profile endpoint", fs.readFileSync(path.join(root, "scripts/certify-v14-live-api.mjs"), "utf8").includes("/api/v1/auth/profile"));
check("live API harness has no duplicate profile check", (fs.readFileSync(path.join(root, "scripts/certify-v14-live-api.mjs"), "utf8").match(/\/api\/v1\/auth\/profile/g) || []).length === 1);
check("production API default is canonical", fs.readFileSync(path.join(root, "scripts/certify-v14-live-api.mjs"), "utf8").includes("https://api.kayad.space"));
check("production backend has no HTTP 501 placeholders", (() => {
  const dir = path.join(root, "backend");
  const files = [];
  const walk = (d) => {
    for (const name of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, name.name);
      if (name.isDirectory()) walk(full);
      else if (/\.(js|mjs|cjs)$/.test(name.name)) files.push(full);
    }
  };
  walk(dir);
  return !files.some((f) => fs.readFileSync(f, "utf8").includes("res.status(501)"));
})());
check("holistic source gate exists", fs.existsSync(path.join(root, "scripts/validate-v14-holistic.mjs")));
check("live certification contract gate exists", fs.existsSync(path.join(root, "scripts/validate-v14-live-certification-contract.mjs")));

const failures = checks.filter(([, ok]) => !ok);
console.log(`\nV14 runtime preflight: ${checks.length - failures.length}/${checks.length} PASS`);
if (failures.length) process.exit(1);
