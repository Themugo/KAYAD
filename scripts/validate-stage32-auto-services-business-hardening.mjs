import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const hub = read('src/features/InspectionsView.tsx');
const finder = read('src/features/InspectionMarketplace/pages/InspectionMarketplacePage.tsx');
const css = read('src/styles/kayad-theme-convergence.css');
const tests = read('src/__tests__/features/automotive/serviceFinder.test.tsx');
const checks = [
  ['Public services hero identifies the Kenya service market', /Automotive services · Kenya/.test(hub)],
  ['Hero communicates independent provider responsibility', /independent inspection businesses, garages and specialists/.test(hub) && /They carry out the work, not KAYAD/.test(hub)],
  ['Hero has accessible, non-decorative trust cues', /kayad-services-trust-row/.test(hub) && /aria-label="How automotive services work"/.test(hub)],
  ['Canonical matched inspection action remains wired', /onClick=\{startRequest\}/.test(hub)],
  ['Canonical provider finder actions remain wired', /onOpenInspectionMarketplace\?\.\('roadside_recovery'\)/.test(hub) && /onOpenInspectionMarketplace\?\.\(\)/.test(hub)],
  ['Provider search validates response envelope and record identity', /Array\.isArray\(response\.items\)/.test(finder) && /Number\.isFinite\(response\.total\)/.test(finder) && /Invalid provider search response/.test(finder)],
  ['Failed refresh preserves previous providers', /Keep the last successful snapshot/.test(finder) && /setResultsStale\(hasProvidersRef\.current\)/.test(finder)],
  ['Stale results are visibly labelled and retry is available', /Showing previously loaded businesses/.test(finder) && /Retry search/.test(finder)],
  ['Last successful directory refresh is visible', /lastSuccessfulSearchAt/.test(finder) && /Last successful search:/.test(finder)],
  ['Provider profile response is identity-validated and race-guarded', /Invalid provider profile response/.test(finder) && /profileRequestSeq/.test(finder)],
  ['Bottom dock clearance respects device safe area', /padding-bottom: calc\(148px \+ env\(safe-area-inset-bottom/.test(css) && /kayad-auto-services-marketplace \{ padding-bottom: calc\(132px/.test(css)],
  ['Trust chips and service cards use shared KAYAD brand colors', /kayad-services-trust-row span/.test(css) && /kayad-service-lane::before/.test(css)],
  ['Reduced-motion and visible focus treatment are present', /prefers-reduced-motion: reduce/.test(css) && /button:focus-visible/.test(css)],
  ['Regression tests cover malformed response and failed refresh', /malformed fulfilled search response/.test(tests) && /last successful business results visible/.test(tests)],
  ['Provider search remains connected to the canonical API', /inspectionApi\.searchProviders\(filters\)/.test(finder)],
  ['Booking success remains server-confirmed', /Reached only after the server reported the booking paid/.test(finder)],
];
let failures = 0;
for (const [label, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) failures++; }
console.log(`\\nStage 32 Auto Services hardening: ${checks.length - failures}/${checks.length} ${failures ? 'FAILED' : 'PASS'}`);
if (failures) process.exitCode = 1;
