import fs from "node:fs";
const page=fs.readFileSync("src/pages/admin/AdminCars.jsx","utf8");
const backend=fs.readFileSync("backend/routes/adminRoutes.js","utf8");
const checks=[
 ["listing page uses existing admin API",/adminAPI\.cars\(params\)/.test(page)],
 ["API failures are surfaced separately from empty state",/setLoadError\(/.test(page)&&/Could not load listings/.test(page)],
 ["malformed listing responses are rejected",/isListingArray\(listingData\)/.test(page)],
 ["total metric uses server total",/value: hasLoaded \? total/.test(page)],
 ["stale responses are guarded",/requestSequence\.current/.test(page)],
 ["refresh is exposed and guarded",/aria-label="Refresh listings"/.test(page)&&/disabled=\{loading\}/.test(page)],
 ["empty state only appears after successful valid load",/!loading && !loadError && hasLoaded && cars\.length === 0/.test(page)],
 ["admin listing UI does not expose seller inventory deletion",!/deleteCar|adminAPI\.deleteCar/.test(page)],
 ["backend admin delete explicitly requires listing owner",/LISTING_OWNER_ACTION_REQUIRED/.test(backend)&&/only the listing owner may remove a vehicle/.test(backend)],
 ["moderation uses dedicated endpoint and authority",/\/cars\/:id\/moderate/.test(backend)&&/requireDecisionAuthority\("listing"\)/.test(backend)],
];
let failed=0; for(const [n,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${n}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} checks passed`);process.exitCode=failed?1:0;
