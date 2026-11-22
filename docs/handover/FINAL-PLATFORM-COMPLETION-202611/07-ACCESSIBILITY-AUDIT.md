# 07 - Accessibility audit

**No WCAG conformance or certification is claimed.** Automated checks find roughly a third of issues; passing axe is not compliance.

Full method, results, contrast register and defect list: `BRAND-ADMIN-CONSOLIDATION-20261122/12-RESPONSIVE-AND-ACCESSIBILITY-REPORT.md` and `evidence/a11y/` (axe-core 4.10.2, WCAG 2.0/2.1/2.2 A and AA tags, Playwright, real backend).

| Check | Status |
|---|---|
| axe: dealer 30/30 section views, personal 26/26 section views: 0 violations | VERIFIED on the code that became 0400502; NOT re-run on this phase's changes |
| axe: public pages | 1 rule outstanding: hero carousel dot target size (homepage-affecting, OWNER DECISION REQUIRED) |
| axe: admin routes | covered in the previous report; skip link and `#main-content` added there |
| Keyboard operation, visible focus (global ring, measured contrast) | VERIFIED previous phase (`keyboard.json`, `focus-colors.json`) |
| Contrast token register | VERIFIED previous phase; teal ring on homepage tiles pending approval |
| This phase's UI changes (403/401 messages on dealer sections, removed duplicate component) | role="alert" messages reuse the existing alert container; not re-scanned with axe: IMPLEMENTED BUT NOT VERIFIED for axe |
| **Screen reader (NVDA, JAWS, VoiceOver, TalkBack)** | **NOT TESTED** - none available in this environment. Manual pass required |
| Dark-mode contrast | not applicable: dark mode not implemented (doc 06) |

## Unresolved
1. Screen-reader pass on dealer, personal, admin and public journeys.
2. Hero dot target size and homepage tile focus colour: need owner approval because the approved homepage composition must not change.
3. Re-run axe on final code before release (command and scripts: `/tmp/audit/section-axe.cjs`, scratch; to be rebuilt from the report's method if the sandbox is gone).
