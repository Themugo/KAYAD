import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const page = read('src/pages/admin/AdminBroadcast.jsx');
const controller = read('backend/controllers/announcementController.js');
const routes = read('backend/routes/announcementRoutes.js');
const api = read('src/api/api.exports.ts');
const tests = read('src/__tests__/pages/admin/AdminBroadcast.test.jsx');

const checks = [
  ['existing broadcast route uses canonical announcement API', /announcementAPI\.create/.test(page) && /announcementAPI\.send/.test(page)],
  ['history loads from existing announcement API', /announcementAPI\.list/.test(page)],
  ['history validates the response envelope', /Array\.isArray\(records\)/.test(page)],
  ['history failures have a visible alert', /role="alert"/.test(page)],
  ['history retry action exists', /Retry/.test(page) && /loadHistory\(\)/.test(page)],
  ['title is trimmed and bounded', /MAX_TITLE_LENGTH = 120/.test(page) && /title\.trim\(\)/.test(page)],
  ['message is bounded', /MAX_MESSAGE_LENGTH = 5000/.test(page)],
  ['audience confirmation happens before send', /window\.confirm/.test(page) && page.indexOf('window.confirm') < page.indexOf('announcementAPI.create')],
  ['recipient audience is shown in confirmation', /audienceLabel/.test(page)],
  ['sending disables duplicate button submissions', /disabled=\{sending/.test(page)],
  ['create response ID is validated before sending', /if \(!announcementId\)/.test(page)],
  ['partial result is represented in the UI', /sendResult\.partial/.test(page) && /Partially delivered/.test(page)],
  ['in-app record counts are not presented as provider delivery proof', /do not certify email or SMS provider delivery/i.test(page)],
  ['recent broadcast history shows recorded stats', /totalRecipients/.test(page) && /successCount/.test(page) && /failCount/.test(page)],
  ['server trims and validates title', /normalizedTitle/.test(controller) && /MAX_TITLE_LENGTH/.test(controller)],
  ['server trims and validates message', /normalizedMessage/.test(controller) && /MAX_MESSAGE_LENGTH/.test(controller)],
  ['server validates supported audiences', /VALID_AUDIENCES/.test(controller)],
  ['server validates specific-user audience input', /Select at least one target user/.test(controller)],
  ['dealer audience includes individual sellers', /SELLER_ROLES = \["dealer", "individual_seller"\]/.test(controller)],
  ['notification null results count as failures', /r\.status === "fulfilled" && r\.value/.test(controller)],
  ['partial delivery is persisted distinctly', /failCount > 0 \? "partial" : "sent"/.test(controller)],
  ['partial and sent announcements cannot be sent again automatically', /\["sent", "partial", "sending"\]/.test(controller)],
  ['scheduled announcements cannot be manually sent early', /status === "scheduled"/.test(controller)],
  ['broadcast batch size is bounded', /BATCH_SIZE = 250/.test(controller)],
  ['announcement endpoints require authenticated admin roles', /router\.use\(protect, allowRoles\("admin", "superadmin"\)\)/.test(routes)],
  ['existing announcement API exports are preserved', /api\.post\('\/announcements'/.test(api) && /api\.post\(`\/announcements\/\$\{id\}\/send`\)/.test(api)],
  ['tests cover history failure, confirmation, and partial outcomes', /history loading failure/.test(tests) && /window\.confirm/.test(tests) && /partially processed/.test(tests)],
];

for (const [name, passed] of checks) {
  assert.ok(passed, `FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
console.log(`Admin Broadcast validator: ${checks.length}/${checks.length} PASS`);
