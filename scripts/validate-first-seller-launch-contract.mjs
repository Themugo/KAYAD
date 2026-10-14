import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const gateway = read('backend/services/communicationGateway.service.js');
const auth = read('backend/controllers/authController.js');
const events = read('backend/services/communicationEvents.service.js');
const tests = read('backend/tests/communications/recordDelivery.test.js');
const checks = [
  ['verification tokens are not persisted in delivery body metadata', /SECRET_BEARING_EVENTS[\s\S]*account\.email_verification[\s\S]*account\.password_reset/.test(gateway) && /persistedDeliveryMetadata\(\{ eventType, metadata, subject, message, text, html \}\)/.test(gateway)],
  ['sensitive delivery metadata explicitly records body omission', /sensitiveBodyOmitted: true/.test(gateway)],
  ['sensitive metadata validates values and excludes subject/body persistence', /SAFE_TRACE_ID/.test(gateway) && /typeof safe\[key\] === \"boolean\"/.test(gateway) && /return \{ \.\.\.safeMetadata, sensitiveBodyOmitted: true \}/.test(gateway)],
  ['provider acceptance is not logged as confirmed delivery', /Communication accepted by provider/.test(gateway) && !/Communication delivered/.test(gateway)],
  ['verification and reset regression tests cover raw-token omission', /verification delivery persists no rendered token-bearing body/.test(tests) && /password-reset delivery persists no rendered token-bearing body/.test(tests) && /correlationId: \"RAW_BEARER_SECRET\"/.test(tests)],
  ['pending seller notification uses canonical rollout event', /eventType: COMMUNICATION_EVENTS\.DEALER_SUBMITTED/.test(auth) && /DEALER_SUBMITTED: "dealer\.submitted"/.test(events)],
  ['seller notification preserves source-event trace without using a second event ID', /sourceEvent: "seller\.approval_pending"/.test(auth)],
  ['registration delivery remains asynchronous after atomic identity creation', /void deliver\(verificationPayload\)/.test(auth)],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`\nFIRST-SELLER LAUNCH SOURCE CONTRACT: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
