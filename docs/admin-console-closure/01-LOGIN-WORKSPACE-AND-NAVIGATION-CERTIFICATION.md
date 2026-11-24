# 01 — Login landing, workspace and Admin navigation

## Root cause (verified)
`getPostAuthPath` honoured any stored/explicit `next` for every role, so a Super Admin carrying a stale `next=/dashboard` (personal workspace) landed on **My Account**.

## Fix (`src/utils/authRoutes.ts`)
Redirect priority, implemented and unit-tested:
1. A requested destination that is valid, same-origin **and authorised for the role** (staff may use an `/admin/*` target only if `canOpenAdminPage`).
2. Role landing (staff → `/admin`; dealer → dealer workspace).
3. Account-type default (personal → `/dashboard`).

Personal-workspace `next` is ignored for staff (`isPersonalWorkspacePath`); `/admin` `next` is ignored for non-staff. Open-redirect and cross-origin values fall through to rule 2/3.

## Navigation (`PageJourneyNavigation`, `AdminLayout`, `App.tsx`)
Admin pages show Back, Forward, Dashboard, breadcrumb root link (to `/admin`), and a staff "Admin Console" return button from the personal workspace. Present on all 53 routes (shell asserted by the sweep: `shell:true` for every superadmin and moderator row where access is allowed).

## Evidence
| Evidence | Result |
|---|---|
| `src/__tests__/utils/authIntent.test.ts` "role-aware landing" | pass |
| `src/__tests__/components/PageJourneyNavigationAdmin.test.tsx` | pass |
| Browser `ci/browser/admin-closure.mjs` J1–J22 | 31/32 on first run; J5 assertion corrected; rerun recorded in 18 |
| Sweep (53 routes × SA/moderator × 1440/390) | `docs/admin-console-closure/evidence/sweep/sweep.json` |

Level: LOCALLY TESTED + ISOLATED-DB TESTED (browser against disposable stack). Not production verified.
