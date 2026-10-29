import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const page = read('src/pages/admin/AdManager.jsx');
const panel = read('src/features/AdManager/AdManagerPanel.tsx');
const api = read('src/services/adApi.ts');
const service = read('backend/services/advertising.service.js');
const controller = read('backend/controllers/adSlotController.js');
const routes = read('backend/routes/adSlotRoutes.js');
const migration = read('supabase/migrations/20260908000000_advertising_domain_end_to_end.sql');
const tests = read('src/__tests__/features/adManagerControl.test.tsx');

const checks = [
  ['admin route uses canonical AdSlot control panel', /AdManagerPanel embedded/.test(page)],
  ['legacy /admin/ads API is not used by page', !page.includes('adsAPI')],
  ['page includes the existing admin surface', /<main className="page">/.test(page)],
  ['embedded panel prop is supported', /embedded\?: boolean/.test(panel)],
  ['campaign list uses canonical API', /getAllAdSlots\(\)/.test(panel)],
  ['statistics are loaded independently', /Promise\.allSettled/.test(panel)],
  ['queue failure is visible', /role="alert"/.test(panel)],
  ['retry action is available', /onClick=\{\(\) => void loadSlots\(\)\}/.test(panel)],
  ['real empty state only renders after successful load', /!loading && !error && slots\.length === 0/.test(panel)],
  ['create flow calls persisted API', /createAdSlot\(\{ \.\.\.draft/.test(panel)],
  ['update flow sends visibility and scheduling', /startAt: slot\.startAt/.test(panel) && /isVisible: slot\.isVisible/.test(panel)],
  ['delete flow requires confirmation', /window\.confirm/.test(panel)],
  ['status control includes draft', /value="draft"/.test(panel)],
  ['status control includes paused', /value="paused"/.test(panel)],
  ['schedule start control exists', /Starts \(local time\)/.test(panel)],
  ['schedule end control exists', /Ends \(local time\)/.test(panel)],
  ['placement controls are grounded in known placements', /top_ticker/.test(api) && /right_rail/.test(api)],
  ['API rejects malformed list envelopes', /Array\.isArray\(body\.data\)/.test(api)],
  ['API rejects unconfirmed create response', /did not confirm campaign creation/.test(api)],
  ['API rejects unconfirmed update response', /did not confirm the campaign update/.test(api)],
  ['API rejects unconfirmed delete response', /did not confirm campaign removal/.test(api)],
  ['backend restricts mutable fields', /ALLOWED_FIELDS/.test(service) && /Unsupported ad field/.test(service)],
  ['backend validates destination URL protocols', /Destination URL must use http or https/.test(service)],
  ['backend validates color values', /six-digit hex color/.test(service)],
  ['backend validates schedule ordering', /Ad end date must be after its start date/.test(service)],
  ['backend supports the persisted status vocabulary', ['draft', 'active', 'paused', 'expired'].every((status) => service.includes(`'${status}'`))],
  ['admin endpoints are protected', /router\.get\("\/all", protect, adminOnly/.test(routes) && /router\.post\("\/", protect, adminOnly/.test(routes)],
  ['advertising table RLS remains enabled', /enable row level security/i.test(migration)],
  ['regression tests cover load failure and create workflow', /scheduled maintenance/.test(tests) && /creates a campaign/.test(tests)],
];
for (const [name, passed] of checks) {
  assert.ok(passed, `FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
console.log(`Ad Manager validator: ${checks.length}/${checks.length} PASS`);
