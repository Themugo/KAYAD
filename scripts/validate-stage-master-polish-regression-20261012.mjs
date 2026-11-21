#!/usr/bin/env node
// Repeatable source-level guard for the Master Polish Audit fixes
// (2026-10-12). Run with: node scripts/validate-stage-master-polish-regression-20261012.mjs
// Each check pins the specific defect found and fixed this pass so a future
// change cannot silently reintroduce it. This is a source-text guard, not a
// substitute for tsc/build/test — run those too (see KAYAD_VALIDATION_MATRIX.tsv).
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');

const notificationContext = read('src/context/NotificationContext.tsx');
const inspectionsView = read('src/features/InspectionsView.tsx');
const publicEscrowExplainer = read('src/features/escrow/PublicEscrowExplainer.tsx');
const supportFaq = read('src/features/SupportFAQ.tsx');
const supportFaqTest = read('src/__tests__/features/support/supportFaq.test.tsx');
const escrowDeepLinkTest = read('src/__tests__/features/escrowDeepLink.test.tsx');
const escrowView = read('src/features/EscrowView.tsx');
const auctionSoftDeleteTest = read('backend/tests/auction/auctionListSoftDelete.test.js');

const checks = [
  // F1: NotificationContext errorKind must keep its literal union type, not widen to string.
  ['NotificationContext.errorKind keeps an explicit literal-union type (fixes tsc TS2322)',
    /visibleErrorKind:\s*'fetch' \| 'action' \| null\s*=/.test(notificationContext)],

  // F2: InspectionsView must guard both branches identically.
  ['InspectionsView guards kayad.value the same way it guards provider.value (fixes unhandled rejection)',
    /kayad\.value\?\.orders/.test(inspectionsView) && /provider\.value\?\.bookings/.test(inspectionsView)],

  // F3: the two "open dashboard" CTAs on the public escrow page must not share one accessible name.
  ['Public escrow page does not render two buttons both named "Open your dashboard"',
    (() => {
      const matches = publicEscrowExplainer.match(/>Open your dashboard</g) || [];
      return matches.length === 1 && publicEscrowExplainer.includes('>Go to your account<');
    })()],

  // F4: category filter bar must expose tab semantics.
  ['SupportFAQ category filter uses role="tablist"/"tab" with aria-selected',
    /role="tablist"/.test(supportFaq) && /role="tab"/.test(supportFaq) && /aria-selected=\{active\}/.test(supportFaq)],
  ['supportFaq tests query the filter by role=tab, not the ambiguous role=button',
    supportFaqTest.includes("getByRole('tab', { name: /Account & access/i })") &&
    !supportFaqTest.includes("getByRole('button', { name: /Account & access/i })")],

  // F5: escrowDeepLink test must assert the CURRENT privacy boundary, not the removed inline-render capability.
  ['Public EscrowView still never references getMyEscrowOverview or escrowId (privacy boundary intact)',
    !/getMyEscrowOverview/.test(escrowView) && !/escrowId/.test(escrowView)],
  ['escrowDeepLink test asserts the public page renders no participant deal data',
    /does not render any participant deal inline/.test(escrowDeepLinkTest) &&
    /never calls getMyEscrowOverview from the public page/.test(escrowDeepLinkTest)],

  // F6: the auction soft-delete test's two sibling timestamp assertions must point the same direction.
  ['auctionListSoftDelete timestamp assertions are directionally consistent (both toBeLessThanOrEqual)',
    (() => {
      const startIdx = auctionSoftDeleteTest.indexOf('filter.auctionStartTime.$lte');
      const endIdx = auctionSoftDeleteTest.indexOf('filter.auctionEnd.$gt');
      if (startIdx === -1 || endIdx === -1) return false;
      const startLine = auctionSoftDeleteTest.slice(startIdx, startIdx + 80);
      const endLine = auctionSoftDeleteTest.slice(endIdx, endIdx + 80);
      return startLine.includes('toBeLessThanOrEqual') && endLine.includes('toBeLessThanOrEqual');
    })()],
];

let pass = 0;
for (const [label, ok] of checks) {
  assert.ok(ok, label);
  console.log(`PASS ${label}`);
  pass++;
}
console.log(`\nMaster polish regression guard: ${pass}/${checks.length} PASS`);
