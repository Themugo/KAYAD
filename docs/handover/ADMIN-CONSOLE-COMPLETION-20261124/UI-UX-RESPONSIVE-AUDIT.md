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
