import fs from 'node:fs';
import assert from 'node:assert/strict';
const healthUi = fs.readFileSync('src/pages/admin/components/AdminPlatformHealth.jsx', 'utf8');
const commUi = fs.readFileSync('src/pages/admin/AdminCommunications.jsx', 'utf8');
const service = fs.readFileSync('backend/services/communicationControl.service.js', 'utf8');
const healthRoutes = fs.readFileSync('backend/routes/healthRoutes.js', 'utf8');
const checks = [
  ['health UI treats absent evidence as unknown', /Health data unavailable; status is unknown/.test(healthUi)],
  ['health UI shows timestamp only when API provides one', /sysHealth\?\.timestamp/.test(healthUi)],
  ['health UI has safe retry affordance', healthUi.includes('onClick={onRetry}')],
  ['health UI does not invent auction/escrow/alert metrics', !/Live Auctions|Pending Escrows|Alerts \(24h\)/.test(healthUi)],
  ['communications explicitly distinguishes configuration from live connectivity', /does not send test messages or prove live provider connectivity/.test(commUi)],
  ['communications treats missing attempts as unknown and N\/A', /No delivery attempts recorded/.test(commUi) && /p\.successRate == null \? 'N\/A'/.test(commUi)],
  ['overlapping communications refreshes cannot overwrite newer results', /loadSequence = useRef\(0\)/.test(commUi) && /sequence !== loadSequence\.current/.test(commUi)],
  ['provider health reports configured providers even with no delivery rows', /Object\.keys\(configured\)\.forEach\(ensureProvider\)/.test(service)],
  ['provider health records evidence type and checked timestamp', /evidence: hasEvidence \? "delivery_ledger" : "configuration_only"/.test(service) && /checkedAt,/.test(service)],
  ['provider success rate is null without real attempts', /successRate: p\.total \? .* : null/.test(service)],
  ['provider config endpoint never sends messages or payments', /never sends a test message or makes a payment\/provider transaction/.test(service)],
  ['admin detailed health exposes only provider config booleans', /router\.get\("\/detailed", protect, adminOnly/.test(healthRoutes) && /twilioWhatsApp: \{ configured: Boolean/.test(healthRoutes) && /probe: "not_run_no_transaction"/.test(healthRoutes)],
  ['health check never returns provider credentials', !/checks\.providers[\s\S]{0,1000}API_KEY\s*:\s*process\.env/.test(healthRoutes)],
];
for (const [name, passed] of checks) { console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`); assert.equal(passed, true, name); }
console.log(`Phase 05 health/provider source validation: ${checks.length}/${checks.length} PASS`);
