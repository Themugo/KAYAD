import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const navbar = read("src/components/Navbar.tsx");
const app = read("src/App.tsx");
const adminCarsUi = read("src/pages/admin/AdminCars.jsx");
const adminRoutes = read("backend/routes/adminRoutes.js");
const bulkRoutes = read("backend/routes/bulkAdminRoutes.js");
const bulkController = read("backend/controllers/bulkAdminController.js");
const duplicateController = read("backend/controllers/duplicateController.js");
const autoMergeWorkflow = path.join(root, ".github/workflows/dependabot-auto-merge.yml");
const gitPolicy = read("docs/handover/GIT_CONFLICT_AND_RELEASE_POLICY_20261114.md");

assert.ok(!navbar.includes('showUserDropdown') && !navbar.includes('kayad-account-panel') && navbar.includes('id="user-profile-menu-button"'),
  "The standalone account dropdown is retired; the avatar is a profile destination and account actions live in the hamburger drawer.");
assert.match(navbar, /id="kayad-mobile-drawer"/,
  "The unified mobile navigation drawer must remain present.");
assert.match(app, /pb-\[calc\(7rem\+env\(safe-area-inset-bottom\)\+12px\)\]/,
  "Public content must reserve sufficient room for the fixed mobile bottom navigation.");
assert.doesNotMatch(adminCarsUi, /Remove listing|handleDelete/,
  "Admin listing UI must not expose seller inventory deletion.");
assert.match(adminRoutes, /LISTING_OWNER_ACTION_REQUIRED/,
  "Single admin listing deletion must be refused.");
assert.match(bulkRoutes, /LISTING_OWNER_ACTION_REQUIRED/,
  "Bulk admin listing deletion must be refused.");
assert.match(duplicateController, /car\.status = "hidden"/,
  "Duplicate moderation must hide a listing without deleting seller inventory.");
assert.doesNotMatch(duplicateController, /car\.deletedAt = new Date\(\)/,
  "Duplicate moderation must not soft-delete seller-owned inventory.");
assert.match(adminRoutes, /await invalidatePublicListingCaches\(\)/,
  "Single listing moderation must invalidate public inventory caches.");
assert.match(bulkController, /await invalidatePublicListingCaches\(\)/,
  "Bulk listing moderation must invalidate public inventory caches.");
assert.equal(fs.existsSync(autoMergeWorkflow), false,
  "Dependabot auto-merge workflow must be removed; conflicts require human review.");
assert.match(gitPolicy, /Never use `git push --force`/,
  "Git policy must explicitly prohibit force-pushing to bypass conflicts.");

console.log("PASS: mobile single-menu/account flow, bottom-nav content clearance, seller inventory ownership, moderation cache invalidation, and no-auto-merge Git policy.");
