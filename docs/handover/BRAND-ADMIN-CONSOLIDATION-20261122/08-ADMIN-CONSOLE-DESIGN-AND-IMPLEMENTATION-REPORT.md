# 08 - Admin Console design and implementation report

## Scope decision (read first)
The brief asks for a premium, real-data-only command centre with rationalised navigation. This phase **did not redesign the Admin Console**. It audited the existing one (which is already a real-data command centre, `AdminDashboard` + `features/admin-command-centre.*`), fixed defects found by inspection and evidence, and recorded the rationalisation as a decision for the owner. Reasons: the console has about 52 routes, 17 of them without a nav link (D-21), several overlapping overview trees (doc 06 row 21), and permission mismatches between UI and API (doc 11). Re-grouping navigation or deleting surfaces without usage data and an owner decision would risk removing working functions. Nothing here is a claim that the "premium redesign" deliverable is complete: it is PARTIAL.

## What exists (verified)
- 7 sidebar groups: Command Centre, Marketplace, Accounts & Onboarding, Finance, Customer Care, Growth & Insight, Platform & Security. The brief's proposed groups map onto these; they are not additional modules.
- Landing page: welcome hero with quick actions, KPI strip (Total Users, Active Staff, Verified Dealers, Vehicles, Live Auctions, Open Escrows), business-flow shortcuts, Approval Workflows, System Health, Recent Vehicle Submissions, Customer & Risk Operations, Live Auctions, Recent Activity, Team, RBAC counts, My Account, Department, System Alerts, Provider Status. Panels say "No ... returned" or "not verified" rather than inventing values (real-data-only behaviour observed).
- Real-data labelling: "Connected to current admin data sources", last-checked time, auto-sync every 60 s with pause and Refresh, "Counts reflect only the current loaded user sample, not total role membership".

## Changes made in this phase
| Change | Evidence |
|---|---|
| **Dashboard layout defect fixed**: the business-flow block lacked a full-width grid span; it took column 1 and pushed the main panels into the 238 px rail column (page about 10,600 px tall, per-letter word breaks, links 9 px wide), rail placed at the bottom. One rule added: `.kayad-command-overview>.kayad-command-business-flow{grid-column:1/-1}`. Page now about 1,900 px | screenshots/admin-dashboard-after-layout-fix.png; guard test `adminCommandOverviewLayout.test.ts`; DOM measurements in this session |
| Quick-action tiles no longer break words mid-word; actions panel widened with auto-fit grid | CSS, screenshots |
| Dark logo variant for the navy sidebar/header (`BrandMark tone="dark"`) | doc 02; derived asset needs owner approval |
| Skip link and `id=main-content` on the admin shell | doc 12 A-01 |
| Admin Reports no longer shows zero counts on failure; retry performs a real second request | tests added |
| Security log fallback to audit logs fixed (ReferenceError `action is not defined`) | regression test, 3 tests, 2 fail on old code |
| XOS Experience Studio crash (temporal-dead-zone) fixed | render test |
| Contrast fixes (alerts, help text, group labels, nav, empty state) and focus ring | doc 12 |
| Scrollable alert/audit panels now keyboard reachable (`role=region`, `tabIndex=0`) | OperationsControlRoom |

## Not done / open (owner decisions or larger work)
- Navigation rationalisation and removal of overlapping overview trees (D-21: 17 unlinked routes). Needs usage data and a decision on which surfaces are authoritative.
- UI/API permission mismatches (for example ghost_checker sees Support Tickets that its API refuses; least-privilege observations in doc 11): the server is correct (it denied), the UI over-lists. Fixing the nav to hide what the API refuses was not done to avoid changing authority displays unreviewed.
- Missing hosted tables/columns for reports, feedback, announcements, automation tasks, feature flags and `bids.is_suspicious` (D-20): pages degrade with honest errors; not a UI fix.
- Admin dark mode: not supported (doc 14).
- Admin console at 1440 px and the brief's other widths: no horizontal overflow at all nine widths (doc 12). Visual review at each width was done only at 820 and 360 screenshots.
- Recent Vehicle Submissions shows raw lowercase statuses (draft/hidden/available): copy fix pending.
