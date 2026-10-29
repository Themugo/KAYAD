import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const pagePath = path.join(root, "src/pages/admin/AdminCars.jsx");
const page = fs.readFileSync(pagePath, "utf8");
const backendPath = path.join(root, "backend/routes/adminRoutes.js");
const backend = fs.readFileSync(backendPath, "utf8");

const checks = [
  ["listing page uses existing admin API", /adminAPI\.cars\(params\)/.test(page)],
  ["API failures are surfaced separately from empty state", /setLoadError\(message\)/.test(page) && /Could not load listings/.test(page)],
  ["maintenance requires explicit maintenance evidence", /code === 'SYSTEM_MAINTENANCE' \|\| body\.maintenance === true/.test(page)],
  ["401 and 403 are distinguished", /status === 401/.test(page) && /status === 403/.test(page)],
  ["malformed listing responses are rejected", /isListingArray\(listingData\)/.test(page)],
  ["total metric uses server total, not current page length", /value: hasLoaded \? total/.test(page) && !/total:\s*cars\.length/.test(page)],
  ["page metrics explicitly disclose page-level scope", /note: 'On this page'/.test(page)],
  ["status normalizer supports canonical and legacy field names", /auctionStatus \?\? car\?\.auction_status \?\? car\?\.status/.test(page)],
  ["stale responses are guarded by request sequence", /requestSequence\.current/.test(page)],
  ["refresh is exposed and guarded while loading", /aria-label="Refresh listings"/.test(page) && /disabled=\{loading\}/.test(page)],
  ["empty state only appears after successful valid load", /!loading && !loadError && hasLoaded && cars\.length === 0/.test(page)],
  ["delete action remains on existing protected admin API", /adminAPI\.deleteCar\(id\)/.test(page)],
  ["backend listing endpoint returns paginated total", /router\.get\(\s*["']\/cars["'][\s\S]*?pagination:[\s\S]*?total/.test(backend)],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
