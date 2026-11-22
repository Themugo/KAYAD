# 12 - Responsive and accessibility report (addendum item 2; brief section on responsiveness)

Status labels: VERIFIED (executed, evidence attached) / FAILED / BLOCKED / NOT TESTED.
Target: WCAG 2.2 AA. **This is not an accessibility certification.** It is an automated plus scripted-keyboard assessment. No screen reader or other assistive technology was available in this environment (see "Screen reader").

## 1. Method and evidence

| Check | Tool | Coverage | Evidence |
|---|---|---|---|
| Automated rules (axe-core 4.10.2, tags wcag2a/2aa/21aa/22aa) | Playwright | Public: 11 pages. Personal: 11 routes + all 12 sidebar sections at 1440 and 390 px. Dealer: 6 routes + all 15 sections at 1440 and 390 px. Admin: all 10 staff roles (earlier segment, doc 11) | evidence/a11y/pages-*-light.json, axe-sections-*.json |
| Keyboard (scripted Tab) | Playwright | 6 surfaces, up to 45 Tab stops each: focus visible, hidden-focus, trap, skip link; mobile drawer open/Escape/focus return | evidence/a11y/keyboard.json |
| Contrast, token pairs | WCAG 2.x relative-luminance formula | 29 brand/status pairs (section 3) | evidence/a11y/contrast-register.md/.json |
| Focus-ring contrast | Computed styles per focused element | 38 distinct ring/surface combinations | evidence/a11y/focus-colors.json |
| Responsive | Playwright | 6 surfaces x 9 widths (1440, 1280, 1024, 820, 768, 430, 390, 375, 360) = 54 runs: horizontal overflow; screenshots at 820 and 360 | evidence/a11y/responsive.json, screenshots/responsive/ |
| Dark mode | See doc 14 | Not supported; proposal only | screenshots/dark-*.png |

## 2. Results

**Automated (axe), final run on fixed code**: dealer 30/30 section views, 0 violations; personal 26/26 section views, 0 violations (after fixes below); public 11 pages: 1 rule outstanding (hero carousel dot target size, owner-approved homepage, see exceptions); personal and dealer route sweeps 0 violations.

**Responsive**: 54 of 54 runs have no horizontal page overflow. Raw count of controls under 24 px is in responsive.json (not an axe verdict; axe applies spacing and inline exceptions).

**Keyboard** (scripted; VERIFIED for the listed behaviour only):
- Every Tab stop on all 6 surfaces had a visible focus indicator (computed outline or shadow); none was hidden or zero-size; no keyboard trap within 45 stops.
- Skip link: present and first stop on personal and dealer workspaces; first stop on admin after this phase's fix; present on public pages but **not the first** Tab stop (a notices-pause control precedes it) - OBSERVATION.
- Mobile menu (390 px): Enter opens, focus moves into the drawer, Escape closes it, focus returns to the Toggle navigation button. VERIFIED.
- NOT TESTED by script: focus trap inside every modal/dialog (escrow ActionDialog, listing wizard dialogs, confirmation dialogs), Escape-to-close on each overlay, arrow-key behaviour of tabs/menus beyond what unit tests cover. Existing Vitest suites cover several dialogs; no page-by-page audit was run.

**Screen reader**: NOT TESTED. No NVDA/JAWS/VoiceOver/TalkBack was available. axe checks names, roles, labels, landmarks and ARIA validity, which is necessary but not equivalent to listening. Remaining work: manual pass with NVDA + Firefox/Chrome and VoiceOver + Safari over login, marketplace search, listing wizard, dealer inventory, banking form, escrow actions, admin dashboard. Status announcements: several pages already use role=alert/aria-live (verified present in markup and by the state probes), but announcement behaviour was not heard.

## 3. Measured contrast register (token pairs)

| Pair | Foreground | Background | Ratio | Required | Result |
|---|---|---|---|---|---|
| Body text on white | #0A3340 | #FFFFFF | 13.46:1 | 4.5:1 | PASS |
| Body text on page tint | #0A3340 | #F6FAF9 | 12.79:1 | 4.5:1 | PASS |
| Secondary text on white | #475569 | #FFFFFF | 7.58:1 | 4.5:1 | PASS |
| Secondary text on tint panel | #475569 | #F0F8F6 | 7.02:1 | 4.5:1 | PASS |
| Muted text (was #64748B) on tint panel | #64748B | #F0F8F6 | 4.41:1 | 4.5:1 | FAIL |
| Muted text (now #475569) on tint panel | #475569 | #F0F8F6 | 7.02:1 | 4.5:1 | PASS |
| Journey nav text (was #607780) on white | #607780 | #FFFFFF | 4.72:1 | 4.5:1 | PASS |
| Journey nav text (now #4A616A) on white | #4A616A | #FFFFFF | 6.54:1 | 4.5:1 | PASS |
| Empty-state text (was #94A3B8) on white | #94A3B8 | #FFFFFF | 2.56:1 | 4.5:1 | FAIL |
| Empty-state text (now #5B7079) on white | #5B7079 | #FFFFFF | 5.20:1 | 4.5:1 | PASS |
| Primary button: white on navy | #FFFFFF | #0A3340 | 13.46:1 | 4.5:1 | PASS |
| Teal action button: white on #13B8A6 | #FFFFFF | #13B8A6 | 2.49:1 | 4.5:1 | FAIL |
| Teal action button: navy on #13B8A6 | #0A3340 | #13B8A6 | 5.41:1 | 4.5:1 | PASS |
| Active step pill: white on #13B8A6 | #FFFFFF | #13B8A6 | 2.49:1 | 4.5:1 | FAIL |
| Completed step: teal-800 on teal-50 | #115E59 | #F0FDFA | 7.27:1 | 4.5:1 | PASS |
| Link / accent teal #176B87 on white | #176B87 | #FFFFFF | 6.02:1 | 4.5:1 | PASS |
| Sidebar group label white/65 on navy (approx #A6B8BF) | #A6B8BF | #0A3340 | 6.56:1 | 4.5:1 | PASS |
| Sidebar group label old white/40 (approx #6C8590) | #6C8590 | #0A3340 | 3.46:1 | 4.5:1 | FAIL |
| Error text #B42318 on white | #B42318 | #FFFFFF | 6.57:1 | 4.5:1 | PASS |
| Error banner rose-800 on rose-50 | #9F1239 | #FFF1F2 | 7.30:1 | 4.5:1 | PASS |
| Success: emerald-700 on white | #047857 | #FFFFFF | 5.48:1 | 4.5:1 | PASS |
| Success badge: white on emerald-700 (was 600) | #FFFFFF | #047857 | 5.48:1 | 4.5:1 | PASS |
| Success badge: white on emerald-600 (old) | #FFFFFF | #059669 | 3.77:1 | 4.5:1 | FAIL |
| Disabled step text slate-500 on slate-100 (disabled: exempt) | #64748B | #F1F5F9 | 4.34:1 | 4.5:1 | FAIL |
| Form border #CBD5E1 on white (UI component) | #CBD5E1 | #FFFFFF | 1.48:1 | 3:1 | FAIL |
| Form border #94A3B8 on white (UI component) | #94A3B8 | #FFFFFF | 2.56:1 | 3:1 | FAIL |
| Focus ring teal #13B8A6 on white | #13B8A6 | #FFFFFF | 2.49:1 | 3:1 | FAIL |
| Focus ring teal #13B8A6 on navy | #13B8A6 | #0A3340 | 5.41:1 | 3:1 | PASS |
| Dark-logo KE teal #2DD4BF on navy | #2DD4BF | #0A3340 | 7.23:1 | 3:1 | PASS |

Interpretation: rows marked "was/old" are the pre-fix values and are kept as evidence of what was fixed. The disabled-control row is exempt from WCAG contrast (1.4.3 disabled exception). `#CBD5E1` form borders (1.48:1) are the Tailwind default used widely; whether each input is still identifiable without the border (1.4.11) was not assessed per form. This is recorded as an OPEN item rather than a pass.

### Focus indicator contrast
Before: 3 px teal at 55% alpha, measured about 2.4 to 2.5:1 on white/tint surfaces (below 3:1). After: dark teal #0F766E (5.5:1 on white) with a white halo in the global base rule, auth, role cards, public shell, navigation and market toolbar. Re-measure: 30 of 38 ring/surface combinations at or above 3:1. The 8 remaining readings (focus-colors.json) are measured against the focused element's own fill, while the ring sits outside it on the page surface plus white halo, so they overstate the problem; they were not individually resolved. A teal ring remains on the approved homepage category tiles (exception, owner approval needed).

## 4. Defect and remediation register

| ID | Severity | Finding | Status |
|---|---|---|---|
| A-01 | Serious | Admin console had no skip link / main target (WCAG 2.4.1) | FIXED: SkipLink + `id=main-content`; verified first Tab stop and focus lands on main |
| A-02 | Serious | White text on teal #13B8A6 = 2.49:1 (active step pill, bid/review buttons, car card badges, escrow mode badge) | FIXED: navy text (5.41:1); hover keeps white on #176B87. Hero hover state left (homepage) |
| A-03 | Serious | Default focus ring about 2.4:1 | FIXED (global); see residual above |
| A-04 | Serious | Scrollable listing-steps strip had no focusable content on step 1 (axe scrollable-region-focusable, 390 px) | FIXED: group role with tabindex 0 |
| A-05 | Serious | Help text #64748B on #F0F8F6 = 4.41:1 (personal Account) | FIXED #475569 (7.0:1) |
| A-06 | Serious | Earlier this phase: five contrast failures, nav toggle target size, scrollable alerts regions | FIXED (see doc 11/14 and git diff) |
| A-07 | Critical (layout) | Admin dashboard main panels squeezed into the 238 px rail column, page about 10,600 px tall, words broken per letter, links 9 px wide | FIXED: `.kayad-command-business-flow{grid-column:1/-1}`; page now about 1,900 px; guard test added. Pre-existing in the baseline, found by full-page inspection |
| A-08 | Medium | Dealer Settings verification card had no retry | FIXED + test |
| A-09 | Medium | Dealer sections show 403 as a generic failure with a retry that cannot succeed | OPEN (design change across 15 sections; recommended shared component) |
| A-10 | Low | Public pages: skip link not the first Tab stop | OPEN |
| A-11 | Low | `#CBD5E1` form borders 1.48:1 | OPEN, needs per-form review |
| A-12 | Low | Hero carousel dots 20x36 px (target size 2.5.8) and teal focus ring on homepage tiles | EXCEPTION: approved homepage, owner approval needed. A min-width 24 px fix is trivial once approved |
| A-13 | Info | Admin recent-vehicle statuses show raw lowercase values (draft, hidden, available) | OPEN (copy) |

## 5. Outstanding exceptions and remaining work
- Screen-reader testing (NOT TESTED); modal/overlay focus-trap audit per dialog; per-form input-border identifiability; dark mode (not supported, proposal in doc 14, needs approval before any implementation).
- Axe finds roughly a third of WCAG issues; passing axe is not compliance.
- Responsive: layout overflow only; touch-target quality, text zoom to 200% and reflow at 320 px were NOT TESTED.
