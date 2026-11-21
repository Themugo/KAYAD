import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const ui = fs.readFileSync(path.join(root, 'src/pages/admin/AdminMarketData.jsx'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'backend/routes/adminRoutes.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'src/api/api.exports.ts'), 'utf8');
const tests = fs.readFileSync(path.join(root, 'src/__tests__/pages/admin/AdminMarketData.test.jsx'), 'utf8');
const checks = [
  ['market data page exists', ui.length > 1000],
  ['API wrapper uses existing list route', api.includes("api.get('/admin/market-data', { params }).then(unwrap)")],
  ['API wrapper uses existing create route', api.includes("api.post('/admin/market-data', body).then(unwrap)")],
  ['API wrapper uses existing update route', api.includes("api.put(`/admin/market-data/${id}`, body).then(unwrap)")],
  ['API wrapper uses existing delete route', api.includes("api.delete(`/admin/market-data/${id}`).then(unwrap)")],
  ['API wrapper uses existing bulk route', api.includes("api.post('/admin/market-data/bulk', { entries }).then(unwrap)")],
  ['frontend validates success envelope', ui.includes('d.success !== true')],
  ['frontend validates entries array', ui.includes('!Array.isArray(d.entries)')],
  ['frontend validates pagination total', ui.includes('!Number.isFinite(Number(d.pagination.total))')],
  ['frontend has visible error state', ui.includes('role="alert"')],
  ['frontend has retry action', ui.includes('Retry loading market data')],
  ['frontend has explicit refresh', ui.includes('>Refresh</button>')],
  ['frontend guards stale responses', ui.includes('loadSequence.current')],
  ['frontend validates year range', ui.includes('year < 1900 || year > currentYear + 1')],
  ['frontend validates positive prices', ui.includes('v > 0')],
  ['frontend validates price ordering', ui.includes('low <= avg && avg <= high')],
  ['frontend validates sample size', ui.includes('Number.isInteger(sampleSize)')],
  ['frontend validates bulk JSON array', ui.includes('Array.isArray(parsed)')],
  ['frontend caps bulk input', ui.includes('parsed.length > 500')],
  ['frontend supports canonical record id', ui.includes('entry.id || entry._id')],
  ['backend has shared value validator', routes.includes('const validateMarketDataValues = (value) =>')],
  ['backend validates pagination lower bound', routes.includes('page < 1')],
  ['backend caps page size at 50', routes.includes('limit > 50')],
  ['backend escapes filter regex', routes.includes('escapeRegex(brand.trim())')],
  ['backend validates low-average-high order', routes.includes('prices[0] <= prices[1] && prices[1] <= prices[2]')],
  ['backend caps bulk import at 500', routes.includes('entries.length > 500')],
  ['backend rejects non-object bulk rows', routes.includes('Entry must be a JSON object')],
  ['backend avoids caching admin list response', routes.includes('res.set("Cache-Control", "no-store")')],
  ['regression test covers load failure', tests.includes('shows a retryable error instead of a false empty state')],
  ['regression test covers valid empty state', tests.includes('shows an empty state only after a valid successful response')],
  ['regression test covers malformed envelope', tests.includes('treats malformed response envelopes as errors')],
  ['regression test covers pagination', tests.includes('requests the next page using server-backed pagination')],
];
let failed = 0;
for (const [label, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
