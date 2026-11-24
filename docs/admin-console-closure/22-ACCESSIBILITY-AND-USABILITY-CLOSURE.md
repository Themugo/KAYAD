# 22 — Accessibility and usability closure

Standard targeted: WCAG 2.2 AA where applicable. **This document does not claim WCAG conformance.** Automated checks (axe-core 4, tags wcag2a/2aa/21a/21aa/22aa) find only a subset of issues; they are evidence, not certification.

## Findings fixed in this phase
| Finding (from the earlier scan) | Fix | Result |
|---|---|---|
| Contrast, `/admin/staff` (role chip #64748b on tint, 4.21:1) | `AdminStaffOrgChart` role colours darkened (#475569, #0f766e, #15803d, #1d6b62; brand teals/navy otherwise kept) | axe: 0 on `/admin/staff` |
| Contrast, `/admin/staff-permissions` (#5aafa4 on tint, 2.33:1, 2 nodes) | `ROLE_COLORS` darkened | 0 |
| Contrast, `/admin/communications` (white on #16a34a, 3.29:1) | "Active" switch `bg-[#166534]` | 0 |
| Target size, `/admin/vxp` (4 icon buttons 16×34 px) | all icon buttons in the studio toolbar `min 44×44` | 0 |
| No `<h1>` on `/admin/settings` | heading promoted to `<h1>` | keyboard probe `h1=1` |
| Modal dialogs (dealer verification) | `role="dialog"`, `aria-modal`, `aria-labelledby`, focus moves in, Tab trapped, Escape closes, focus returns to the opener, 44 px close button | vitest `DealerReinstatementWorkflow` (jsdom) |

Re-scan result (disposable stack, Super Admin, all 53 routes at 390 and 1440): see `evidence/a11y/a11y.json` — serious/critical axe findings: **0** after the fixes (final regression re-run recorded in doc 18). Overflow at 320/360/390/430/768/1280/1920 on 10 key routes: none.

## Verified by probe (`ci/browser/admin-a11y-extra.mjs`, `evidence/a11y/a11y-extra.json`)
* Controls without an accessible name (buttons, links, inputs, tabs, switches, visible) on all 53 routes: **0**.
* Back, Forward and Dashboard controls are real buttons/links with names ("Go to previous page", "Go forward to next page"); Back and Dashboard operated by keyboard (Enter) and navigated; Forward is disabled when there is nothing ahead (not exercised beyond that in this probe).
* Status/error regions (`role=status|alert`, `aria-live`) exist on the pages probed.
* Keyboard walk (Tab ×45) on 5 pages: visible focus indicator on every stop, no trap, `main` and `nav` landmarks, skip link, `lang="en"`.

## Not done / limits (honest)
* **No real screen reader (NVDA/JAWS/VoiceOver/TalkBack) was run.** The cloud environment has none. What exists is: accessible-name enumeration, ARIA role/state inspection, keyboard operation, and axe. A manual screen-reader pass on Staff, Staff Permissions, the dealer verification dialog and the reinstatement flow is **an open owner/QA action**.
* The dialog open-and-return-focus check ran in jsdom, not in the browser: the browser seed has no dealer verification row to open. Other modals in the console were not individually audited.
* Colour contrast of text over images/gradients and `:hover`/`:focus` states is not covered by axe.
* Touch-target size beyond VXP was checked only as "≥ 24 px" (WCAG 2.2 AA minimum) by axe.
