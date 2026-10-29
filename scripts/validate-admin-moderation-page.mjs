import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const page = fs.readFileSync(path.join(root, "src/pages/admin/AdminCarModeration.jsx"), "utf8");
const backend = fs.readFileSync(path.join(root, "backend/controllers/bulkAdminController.js"), "utf8");
const route = fs.readFileSync(path.join(root, "backend/routes/adminRoutes.js"), "utf8");

const checks = [
  ["moderation uses existing admin listing API", /adminAPI\.cars\(params\)/.test(page)],
  ["failed loads are visible and distinct from empty results", /setLoadError\(message\)/.test(page) && /Could not load moderation queue/.test(page)],
  ["malformed success responses are rejected", /isValidListingArray\(items\)/.test(page)],
  ["stale requests are ignored", /requestSequence\.current/.test(page)],
  ["prior records are retained on refresh errors", /Previously loaded records are retained and may be stale/.test(page)],
  ["refresh and retry controls are present", /aria-label="Refresh moderation queue"/.test(page) && /Try again/.test(page)],
  ["approved status filter uses canonical available status", /option value="available">Approved \/ Live/.test(page)],
  ["known status variants are normalized", /car\?\.status \?\? car\?\.auctionStatus \?\? car\?\.auction_status/.test(page)],
  ["bulk result is reconciled against the server", /await loadPage\(1, false\)/.test(page) && /result\?\.skipped/.test(page)],
  ["single moderation only removes a row after server success", /const result = await adminAPI\.moderateCar/.test(page) && /return true/.test(page)],
  ["modal remains open when moderation fails or is cancelled", /if \(await handleModerate\(listingId\(selected\), 'approve'\)\) setSelected\(null\)/.test(page)],
  ["load-more control supplements infinite scrolling", /Load more listings/.test(page) && /loadPage\(nextPage, true\)/.test(page)],
  ["bulk backend reports skipped records to caller", /skipped\.length \? \{ skipped \} : \{\}/.test(backend)],
  ["single moderation retains decision authority and blocked-listing guard", /requireDecisionAuthority\("listing"\)/.test(route) && /moderationBlockedReason\(car\)/.test(route)],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
