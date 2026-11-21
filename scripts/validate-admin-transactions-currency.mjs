import fs from 'node:fs';
import assert from 'node:assert/strict';
const file = fs.readFileSync('src/pages/admin/AdminTransactions.jsx', 'utf8');
const checks = [
  ['uses explicit KES display formatter', file.includes('return `KES ${amount.toLocaleString')],
  ['missing amount is unavailable, not zero', file.includes("if (value === null || value === undefined || value === '') return 'Unavailable'")],
  ['rejects non-finite amount', file.includes("if (!Number.isFinite(amount)) return 'Unavailable'")],
  ['summary uses safe currency formatter', file.includes('formatTransactionKES(summary.totalCollected ?? summary.totalRevenue)')],
  ['row amount uses safe currency formatter', file.includes('{formatTransactionKES(p.amount)}')],
  ['detail amount uses safe currency formatter', file.includes("{ label: 'Amount', val: formatTransactionKES(selected.amount) }")],
  ['no imported legacy formatKES helper', !file.includes("import { adminPaymentsAPI, formatKES }")],
  ['refresh and retry preserved', file.includes('onClick={load}') && file.includes('Retry')],
  ['transaction API preserved', file.includes('adminPaymentsAPI.list(params)')],
  ['reconciliation evidence labels preserved', file.includes('evidence_unavailable:')],
  ['status filters preserved', file.includes('All Status') && file.includes('value="success"') && file.includes('value="pending"') && file.includes('value="failed"')],
  ['type filters preserved', file.includes('All Types') && file.includes('value="bid"') && file.includes('value="purchase"') && file.includes('value="escrow"')],
  ['no hard-coded dollar currency literal', !file.includes("'$'") && !file.includes('\"$\"') && !/\$\s*\d/.test(file)],
];
let failed = 0;
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); if (!pass) failed++; }
assert.equal(failed, 0, `${failed} checks failed`);
console.log(`${checks.length}/${checks.length} checks passed`);
