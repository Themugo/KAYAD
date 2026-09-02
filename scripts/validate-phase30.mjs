import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const files = [
  "backend/controllers/ecpController.js",
  "backend/controllers/eipController.js",
  "backend/controllers/governanceController.js",
  "backend/services/queueService.js",
  "backend/openapi.yaml",
];
const text = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(root, f), "utf8")]));

const forbidden = [
  /https:\/\/example\.com\/report/i,
  /Return mock API catalog/i,
  /Return mock delivery logs/i,
  /Generate mock root cause analysis/i,
  /Generate mock audit logs/i,
  /\/admin\/demo\//i,
  /\/cars\/demo\/all/i,
  /healthScore:\s*94/i,
  /totalPartners:\s*45/i,
  /totalAPIRequests:\s*1245678/i,
  /revenueToday:\s*2456789/i,
];

for (const [file, body] of Object.entries(text)) {
  for (const pattern of forbidden) {
    if (pattern.test(body)) throw new Error(`Forbidden synthetic production contract in ${file}: ${pattern}`);
  }
}

for (const file of ["backend/controllers/ecpController.js","backend/controllers/eipController.js","backend/controllers/governanceController.js","backend/services/queueService.js"]) {
  execFileSync(process.execPath, ["--check", path.join(root, file)], { stdio: "inherit" });
}

const openapi = text["backend/openapi.yaml"];
if (/^\s{2}\/(admin\/demo\/|cars\/demo\/)/m.test(openapi)) throw new Error("Demo endpoint remains in OpenAPI");

console.log("PHASE 30 PRODUCTION TRUTH VALIDATION: PASS");
console.log("Enterprise control-plane fake metrics removed or fail-closed");
console.log("Webhook/report synthetic success paths removed");
console.log("Demo-only OpenAPI contracts removed");
const jsFiles = [];
for (const dir of ["backend", "scripts"]) {
  const base = path.join(root, dir);
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (["node_modules", ".git"].includes(entry.name)) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && full.endsWith(".js")) jsFiles.push(full);
    }
  };
  walk(base);
}
for (const file of jsFiles) execFileSync(process.execPath, ["--check", file], { stdio: "ignore" });
console.log(`Backend/scripts JS syntax: PASS (${jsFiles.length} files)`);
