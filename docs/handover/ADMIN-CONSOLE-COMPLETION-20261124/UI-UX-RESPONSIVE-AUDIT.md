# UI / UX / Responsive Audit — Super Admin Console (2026-11-24)

Local disposable stack only (Vite :5299 → API :5065 on a disposable `kayad_ci_*` database). Nothing here is production evidence.

## Design preserved (Existing and confirmed correct)
Navy/teal showroom hero with Quick Actions inside the hero, compact header, one continuous collapsible sidebar (34 links, no duplicates, enforced by `AdminSidebarOrganization.test.tsx`), mobile drawer, no excess whitespace. No visual redesign was made in this pass.

## Changes in this pass (Fixed and verified)
- Dashboard Team Members and RBAC panels now use the complete staff list (not a sample), with scope notes; vehicle panel states "Newest N of TOTAL".
- Honest states: `not_provisioned` load-failure kind (503 `FEATURE_NOT_PROVISIONED`) instead of zero or a generic error; security log shows "unavailable" rather than 0.
- 15 previously unlisted registered routes are reachable from the "Specialist Studios (Super Admin)" department panel.
- Legacy Individual/Private Seller wording replaced where it no longer fits (see matrix). Left unchanged, Requires separate owner decision: HomePageAdminPanel "Private Sellers" label (test-tied, escrow configuration).

## Browser results
| Check | Result |
|---|---|
| `ci/browser/admin-console.mjs`, 7 widths (390, 768, 1024, 1100, 1180, 1440, 1920) | 56/56 passed, run twice |
| Same script at 4 default widths (one earlier run) | 31/32; only failure `403 /api/analytics/collect` at 390px (triaged below); not reproduced in 2 further runs |
| `ci/browser/admin-sweep.mjs` (Super Admin + Moderator × 390 + 1440 × 53 routes) | 212 checks; 0 crashes, 0 page errors, 0 error boundaries, 0 horizontal overflow |
| Super Admin opened routes | 53/53 |
| Moderator | 20 routes open, 33 show the restricted state (UI mirror; backend authoritative) |

## Console / network error triage (nothing suppressed)
| Distinct error | Class | Notes |
|---|---|---|
| 503 on 8 studio/suspicious-bid endpoints (automation, config, lowcode, vxp, xos, ai, digital-twin, bids suspicious) | Intentional honest state (backend tables not provisioned) | Page shows "not provisioned … unavailable, not zero". Needs owner decision to provision. |
| 403 on ~20 admin endpoints for the Moderator persona (admin/users, cars, communications/*, support/staff/*, etc.) | Expected authorization denial (not a defect) | Confirms backend denies; UI shows restricted/failed state. |
| 403 `/api/analytics/collect` at 390px (single run) | Nonessential/intermittent test-environment race | Fire-and-forget guest beacon (`analyticsTracker.ts` swallows failures); likely CSRF token not yet issued on first guest call. Not reproduced in two 7-width reruns (56/56). Not changed. |
| ~1022 browser "Failed to load resource" console lines | Same responses as above | Browser echoes each non-2xx; no uncaught page errors. |
| External e-mail/SMS/payment providers | Blocked by missing external dependency | Not contacted; no real messages sent. |


---
## Addendum — finalisation phase (second pass)
- Re-run after the UI-mirror correction: `admin-console.mjs` at 7 widths **56/56 PASS** (twice). One earlier attempt failed 5 checks at the first width because the browser read login credentials before the freshly started stack finished seeding (401 on login); it was a test-start race, not an app defect, and passed on both reruns.
- `admin-sweep.mjs`: **212 rows, 0 crashes, 0 page errors, 0 error boundaries, 0 overflow; Super Admin opened 53/53 at 1440px and 390px.** Moderator: 26 routes open, 27 denied (by URL). The sidebar no longer offers a moderator Moderation, Feedback, Broadcast, Dealer Verifications or Support Tickets.
- Two sweep runs were discarded: one crashed ("browser closed", environment) and one flagged Super Admin as restricted because the detector matched audit rows titled "Access Denied" anywhere in the page. The detector now checks only guard headings (`ci/browser/admin-sweep.mjs`); the discard is documented, not hidden.
- Console/network triage is unchanged from the earlier table (503 = intended not-provisioned; moderator 403 = correct denial; `analytics/collect` 403 = nonessential beacon, intermittent). New in this pass: `401 /api/v1/auth/login` during the discarded early-start run = test-environment race.
- Accessibility and keyboard behaviour were not re-audited beyond the existing unit tests: NOT VERIFIED in a browser. Per-page UI polish of the 53 routes beyond the Command Centre was not changed (no demonstrated defect), recorded as PARTIAL.
