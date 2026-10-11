#!/usr/bin/env node
// Legacy public chat assets -> Cloudinary `authenticated` delivery. ASSET-SPECIFIC, MANIFEST-DRIVEN, NEVER DELETES.
//
// Step 0  inventory (read-only):  node backend/scripts/chat-attachment-inventory.mjs --out=inv.json
// Step 1  human review of inv.json (candidates only = kayad/chat public assets NOT used by any vehicle listing).
// Step 2  plan (default, no changes):  node backend/scripts/migrate-chat-attachments-private.mjs --manifest=inv.json
//           -> verifies each candidate's CURRENT state with the Cloudinary Admin API (read-only) and prints the plan.
// Step 3  backup: export the candidates (Cloudinary console / Admin API backup) BEFORE applying.
// Step 4  apply (explicit):  ... --manifest=inv.json --apply --confirm=<number of candidates>
//           -> rename(publicId, publicId, {type:"upload", to_type:"authenticated", invalidate:true, overwrite:false})
//              one asset at a time; writes a result log that is also the rollback list.
// Step 5  verify:  ... --manifest=inv.json --verify   (every candidate must now report type=authenticated)
// Rollback: ... --rollback=<result-log.json> --confirm=<n>  (rename back with to_type:"upload").
//
// Guarantees: only public ids listed as candidates in the reviewed manifest; never a folder-wide or global setting;
// never `destroy`; vehicle/shared assets are excluded by the inventory; aborts on the first unexpected state.
// NOT EXECUTED in the audit environment (no Cloudinary credentials): status BLOCKED until run in staging.
import fs from "node:fs";
import { v2 as cloudinary } from "cloudinary";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const flag = (n) => process.argv.includes(`--${n}`);
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
const die = (m) => { console.error(m); process.exit(2); };

const rollbackPath = arg("rollback");
if (rollbackPath) {
  const log = JSON.parse(fs.readFileSync(rollbackPath, "utf8")).filter((r) => r.action === "made-authenticated");
  if (Number(arg("confirm")) !== log.length) die(`--confirm=${log.length} required to roll back ${log.length} assets`);
  for (const r of log) {
    await cloudinary.uploader.rename(r.publicId, r.publicId, { type: "authenticated", to_type: "upload", invalidate: true, overwrite: false });
    console.log(`restored public delivery: ${r.publicId}`);
  }
  process.exit(0);
}

const manifestPath = arg("manifest") || die("--manifest=<reviewed inventory json> is required");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.mode !== "inventory-read-only" || !Array.isArray(manifest.candidates)) die("not an inventory manifest");
const candidates = manifest.candidates.filter((c) => /^kayad\/chat\//.test(c.publicId));
if (candidates.length !== manifest.candidates.length) die("manifest contains non-chat public ids - refusing");

const stateOf = async (publicId) => {
  for (const type of ["upload", "authenticated"]) {
    try { const r = await cloudinary.api.resource(publicId, { type, resource_type: "image" }); return { type: r.type, bytes: r.bytes }; } catch { /* try next */ }
  }
  return { type: "missing" };
};

if (flag("verify")) {
  let bad = 0;
  for (const c of candidates) { const s = await stateOf(c.publicId); if (s.type !== "authenticated") { bad++; console.log(`NOT PRIVATE: ${c.publicId} (${s.type})`); } }
  console.log(JSON.stringify({ verified: candidates.length, notPrivate: bad }));
  process.exit(bad ? 1 : 0);
}

const plan = [];
for (const c of candidates) plan.push({ ...c, current: (await stateOf(c.publicId)).type });
console.log(JSON.stringify({ candidates: plan.length, byCurrentType: plan.reduce((a, p) => ((a[p.current] = (a[p.current] || 0) + 1), a), {}) }));
if (!flag("apply")) { console.log("PLAN ONLY (no changes). Re-run with --apply --confirm=<n> after backup."); process.exit(0); }
const todo = plan.filter((p) => p.current === "upload");
if (Number(arg("confirm")) !== todo.length) die(`--confirm=${todo.length} required (assets currently public)`);
const results = [];
const logPath = `chat-attachment-migration-result-${Date.now()}.json`;
for (const p of todo) {
  try {
    await cloudinary.uploader.rename(p.publicId, p.publicId, { type: "upload", to_type: "authenticated", invalidate: true, overwrite: false });
    results.push({ publicId: p.publicId, action: "made-authenticated", at: new Date().toISOString() });
  } catch (e) {
    results.push({ publicId: p.publicId, action: "failed", error: String(e?.error?.message || e?.message || e) });
    fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
    die(`aborted on first failure: ${p.publicId} (partial log ${logPath})`);
  }
  fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
}
console.log(`done: ${results.length} assets; result/rollback log ${logPath}. Now run --verify.`);
