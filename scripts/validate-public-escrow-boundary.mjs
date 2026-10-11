import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8');
const publicView = read('src/features/EscrowView.tsx');
const explainer = read('src/features/escrow/PublicEscrowExplainer.tsx');
const participantDesk = read('src/features/escrow/ParticipantEscrowDesk.tsx');
const buyerPortal = read('src/features/OwnershipPlatform/pages/BuyerPlatform.tsx');
const dealerPortal = read('src/pages/dealer/dashboard/DealerDashboard.tsx');
const nav = read('src/components/navigation/navConfig.ts');
const navLocation = read('src/utils/navLocation.ts');
const legacy = read('src/pages/EscrowPage.jsx');
const app = read('src/App.tsx');
const footer = read('src/components/Footer.tsx');
const layoutFooter = read('src/components/layout/Footer.tsx');
const tests = read('src/__tests__/components/EscrowView.test.tsx');
const checks = [
  ['public view never imports participant or operations desks', !/ParticipantEscrowDesk|EscrowOperationsDesk|getMyEscrowOverview|getOperationsDashboard/.test(publicView)],
  ['public view has no private tabs', !/role="tablist"|My escrow deals|Operations/.test(publicView)],
  ['public view requests only the public program endpoint', /getEscrowProgram\(\)/.test(publicView)],
  ['participant desk is mounted in buyer and dealer portals', /ParticipantEscrowDesk/.test(buyerPortal) && /ParticipantEscrowDesk/.test(dealerPortal) && /getMyEscrowOverview/.test(participantDesk)],
  ['staff operations have a dedicated protected portal', /'escrow-operations'/.test(app) && /isEscrowStaffRole\(authUser\?\.role\)/.test(app) && /EscrowOperationsDesk/.test(app)],
  ['signed-in CTA routes to role-appropriate dashboard', /dealer-dashboard/.test(publicView) && /buyer-platform/.test(publicView) && /escrow-operations/.test(publicView)],
  ['public copy does not promise automatic release timing', !/automatic release window|eligible for automatic release/i.test(explainer)],
  ['public explainer describes funding method from published rules', /Funding method/.test(explainer) && /fundingMethods/.test(explainer)],
  ['public navigation exposes only the public escrow information destination', !/Protected deals|escrow:deals|escrow:create/.test(nav) && !/children:\s*\[/.test(nav.slice(nav.indexOf("id: 'escrow'"), nav.indexOf("id: 'support'")))],
  ['legacy escrow tab URLs normalize to the public page', /'escrow:deals': 'escrow'/.test(navLocation) && /'escrow:operations': 'escrow'/.test(navLocation)],
  ['legacy escrow page redirects to canonical public page', /Navigate to="\/?\?nav=escrow"/.test(legacy) && !/escrowAPI\.mine|Every purchase.*protected/.test(legacy)],
  ['shared public footer uses Escrow Services label', /Escrow Services/.test(footer) && /Escrow Services/.test(layoutFooter)],
  ['global app footer uses Escrow Services label', /Escrow Services/.test(app)],
  ['regression tests assert public/private separation', /never requests deal or operations data/.test(tests) && /ParticipantEscrowDesk/.test(tests) && /EscrowOperationsDesk/.test(tests)],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
assert.equal(checks.filter(([, ok]) => ok).length, checks.length, 'Public escrow boundary checks failed');
console.log(`\n${checks.length}/${checks.length} public escrow boundary checks passed.`);
