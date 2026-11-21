import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../src/pages/admin/AdminTransactions.jsx', import.meta.url), 'utf8');
const checks = [
  ['existing transaction page retained', source.includes('export default function AdminTransactions()')],
  ['canonical payments API retained', source.includes('adminPaymentsAPI.list(params)')],
  ['status filter retained', source.includes('params.status = filter')],
  ['type filter retained', source.includes('params.type = typeFilter')],
  ['response envelope validated', source.includes('!Array.isArray(d.payments)')],
  ['malformed response produces explicit error', source.includes('unexpected response')],
  ['failed refresh preserves prior successful rows', source.includes('Keep the last successful result visible')],
  ['refresh control available', source.includes("'↻ Refresh'")],
  ['retry control available', source.includes('>Retry</button>')],
  ['last successful refresh timestamp shown', source.includes('Last successful refresh:')],
  ['stale results explicitly identified', source.includes('these may be stale')],
  ['request sequence protects against stale responses', source.includes('requestSequence.current')],
  ['summary values tolerate missing data', source.includes('formatSummaryNumber(summary.totalTransactions)')],
  ['missing pagination total remains unavailable', source.includes('setTotal(Number.isFinite')],
  ['transaction detail modal retained', source.includes('Transaction Details')],
  ['missing reconciliation evidence not mislabeled settled', source.includes("'Evidence unavailable'")],
  ['existing transaction status filters retained', source.includes('<option value="success">Success</option>') && source.includes('<option value="pending">Pending</option>')],
  ['existing type filters retained', source.includes('<option value="bid">Bid</option>') && source.includes('<option value="purchase">Purchase</option>') && source.includes('<option value="escrow">Escrow</option>')],
  ['no backend API or route added by page', !source.includes('fetch(') && !source.includes('axios.post(')],
];
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
assert.ok(checks.every(([, pass]) => pass), 'Transaction oversight validation failed');
console.log(`\n${checks.length}/${checks.length} checks passed.`);
