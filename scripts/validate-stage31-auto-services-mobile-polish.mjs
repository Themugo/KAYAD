import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const inspections = read('src/features/InspectionsView.tsx');
const marketplace = read('src/features/InspectionMarketplace/pages/InspectionMarketplacePage.tsx');
const modal = read('src/features/InspectionsView/ProviderApplicationModal.tsx');
const css = read('src/styles/kayad-theme-convergence.css');
const api = read('src/features/InspectionMarketplace/services/api.ts');
const checks = [
 ['Auto Services public page uses a dedicated styling scope', /kayad-auto-services-view/.test(inspections) && /data-kayad-surface="auto-services"/.test(inspections)],
 ['Service discovery keeps existing matched-inspection and provider-selection actions', /onClick=\{startRequest\}/.test(inspections) && /onOpenInspectionMarketplace\?\.\('pre_purchase_inspection'\)/.test(inspections)],
 ['Provider discovery remains on canonical search API', /inspectionApi\.searchProviders\(filters\)/.test(marketplace)],
 ['Provider discovery preserves loading, stale-result, error and true-empty states', /setLoadError\('We could not refresh the business directory/.test(marketplace) && /Showing previously loaded businesses/.test(marketplace) && /Businesses could not be loaded/.test(marketplace) && /providers\.length === 0/.test(marketplace) && /Array\.isArray\(response\.items\)/.test(marketplace)],
 ['Filters still use canonical service taxonomy and backend parameters', /automotiveApi\.getServiceTaxonomy\(\)/.test(marketplace) && /ProviderFilters filters=\{filters\}/.test(marketplace)],
 ['Provider application registration uses canonical existing API', /inspectionApi\.registerProvider\(/.test(modal)],
 ['Provider capabilities remain declared through canonical taxonomy API', /automotiveApi\.declareCapability\(/.test(modal) && /taxonomy\?\.categories/.test(modal)],
 ['Provider onboarding explains account, business and review steps', /aria-label="Provider onboarding steps"/.test(modal) && /KAYAD reviews your application/.test(modal)],
 ['Provider phone field is semantically required and validated', /required className=/.test(modal) && /isPlausiblePhone\(form\.phone\)/.test(modal)],
 ['Application errors do not expose raw backend exception messages', /Check your connection and try again/.test(modal) && !/setError\(err instanceof Error/.test(modal)],
 ['Mobile refinements are scoped to max-width 639px', /@media \(max-width: 639px\)/.test(css) && /kayad-auto-services-marketplace/.test(css)],
 ['Desktop provider marketplace and shared KAYAD theme remain the base', /linear-gradient\(118deg, #12576D 0%, #176B87 100%\)/.test(css) && /max-width: 639px/.test(css)],
 ['Reduced-motion preference is respected for the Auto Services surface', /prefers-reduced-motion: reduce/.test(css) && /kayad-auto-services-view/.test(css)],
 ['Provider registration and booking API contract file remains present', /registerProvider/.test(api) && /searchProviders/.test(api)],
];
let failures = 0;
for (const [label, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`); if (!pass) failures++; }
console.log(`\nStage 31 Auto Services mobile source checks: ${checks.length - failures}/${checks.length} ${failures ? 'FAILED' : 'PASS'}`);
if (failures) process.exitCode = 1;
