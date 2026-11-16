import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const block = source.slice(source.indexOf('// Super Admin featured campaigns:'), source.indexOf('// Public config is safe to read'));
const checks = [
  ['uses the canonical public featured-campaign ID feed', block.includes('getCurrentFeaturedCampaignCarIds()')],
  ['resolves campaign IDs through the canonical vehicle API', block.includes('getCarById(id)')],
  ['does not fetch while the document is hidden', block.includes("document.visibilityState === 'hidden'")],
  ['refreshes when the browser window regains focus', block.includes("window.addEventListener('focus', refreshWhenVisible)")],
  ['refreshes when the document becomes visible', block.includes("document.addEventListener('visibilitychange', refreshWhenVisible)")],
  ['retains the five-minute fallback interval', block.includes('5 * 60 * 1000')],
  ['uses a request version to prevent stale responses winning', block.includes('requestVersion') && block.includes('version !== requestVersion')],
  ['cleans up timer and event listeners', block.includes('window.clearInterval(timer)') && block.includes("window.removeEventListener('focus', refreshWhenVisible)") && block.includes("document.removeEventListener('visibilitychange', refreshWhenVisible)")],
  ['does not introduce a second event transport', !block.includes('new WebSocket') && !block.includes('new EventSource')],
];
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(ok, label);
}
console.log(`Homepage campaign refresh sync: ${checks.length}/${checks.length} PASS`);
