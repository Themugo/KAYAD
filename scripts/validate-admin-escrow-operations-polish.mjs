import fs from 'node:fs';
const source = fs.readFileSync('src/pages/admin/AdminEscrows.jsx', 'utf8');
const checks = [
  ['escrow view permission remains required', source.includes('userHasPermission(user, PERM.VIEW_ESCROW)') && source.includes('if (!canView) return')],
  ['canonical escrow API remains in use', source.includes('escrowAPI.operationsDashboard') && source.includes('escrowAPI.all') && source.includes('escrowAPI.operationsCase')],
  ['queue response shape is validated', source.includes('Escrow queue returned an unexpected response.')],
  ['dashboard response shape is validated', source.includes('Escrow dashboard returned an unexpected response.')],
  ['load failures have a visible error state', source.includes('Escrow data could not be verified') && source.includes('role="alert"')],
  ['empty queue is not shown after load failure', source.includes('escrows.length === 0 && !loadError') && source.includes('Queue unavailable')],
  ['retry and refresh controls exist', source.includes('Retry loading') && source.includes('Refresh data')],
  ['last successful refresh is visible', source.includes('Last successful refresh:')],
  ['request sequence prevents stale queue updates', source.includes('requestSequence.current') && source.includes('sequence !== requestSequence.current')],
  ['case response requires an escrow record', source.includes('!data.escrow')],
  ['case errors can be retried', source.includes('Retry case details')],
  ['case request sequence prevents stale detail updates', source.includes('caseSequence.current')],
  ['missing exposure is not rendered as zero', source.includes("typeof amount === 'number' && Number.isFinite(amount)") && source.includes('Exposure unavailable')],
  ['missing amounts are not rendered as zero', source.includes("e.amount !== null && e.amount !== undefined && e.amount !== '' && Number.isFinite(Number(e.amount))") && source.includes("selectedEscrow?.amount !== null")],
  ['money-moving actions remain guarded against concurrent requests', source.includes('if (busy) return') && source.includes('disabled={!!busy}')],
  ['reconciliation permission remains enforced in UI', source.includes('canReconcile &&') && source.includes('escrowAPI.runOperationsReconciliation')],
  ['anomaly scan remains permission-gated', source.includes('canOperate &&') && source.includes('escrowAPI.runOperationsAnomalyScan')],
  ['canonical release/refund/payout endpoints retained', source.includes('escrowAPI.release(id)') && source.includes('escrowAPI.refund(id') && source.includes('escrowAPI.initiateEscrowPayout(id)')],
  ['emergency close remains permission and reason controlled', source.includes('canEmergency && selectedEscrow?.status === \'released\'') && source.includes('reason.trim().length < 10')],
  ['no new backend route or data store added by page polish', !source.includes('fetch(\'/api/new-escrow') && !source.includes('localStorage.setItem')],
];
const failed = checks.filter(([, ok]) => !ok);
console.log(`Admin escrow operations polish: ${checks.length - failed.length}/${checks.length} PASS`);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
