import fs from "node:fs";
const checks = [
  ["seller edit snapshots before mutation", "backend/controllers/carController.js", ["const oldData = car.toObject();", "await logVehicleEdited(car, oldData, req.user, req);"], []],
  ["seller deletion decrements retained listing count only", "backend/controllers/carController.js", ['select("listingCount")', "listingCount - 1"], ["trialListingsUsed - 1"]],
  ["admin delete route refuses seller inventory deletion", "backend/routes/adminRoutes.js", ["LISTING_OWNER_ACTION_REQUIRED", "only the listing owner may remove a vehicle"], ["$inc: { listingCount: -1 }"]],
];
let failed = 0;
for (const [name, file, required, forbidden] of checks) {
 const s=fs.readFileSync(file,"utf8"); const missing=required.filter(x=>!s.includes(x)); const bad=forbidden.filter(x=>s.includes(x));
 const ok=!missing.length&&!bad.length; console.log(`${ok?"PASS":"FAIL"} ${name}`); if(!ok){failed++; if(missing.length)console.log(" missing:",missing);if(bad.length)console.log(" forbidden:",bad);}
}
console.log(`\n${checks.length-failed}/${checks.length} checks passed`); process.exitCode=failed?1:0;
