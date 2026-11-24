# Permission and workflow audit (2026-11-24)

## Identity separation (verified in code + journey 26)
- Personal account: role `user`, buy and sell, free, no approval (`submitApplication` returns 409 `SELLER_APPROVAL_NOT_REQUIRED`); admin can suspend/revoke/restore with history.
- Dealer: separate business identity; onboarding and verification before verified status; team members live in `dealer_teams` and are never counted as platform staff (Active Staff counts only `STAFF_ROLES`, not banned).
- Platform staff: roles in `backend/config/roles.js`; UI mirror `PAGE_PERMISSIONS`/`SUPERADMIN_ONLY` is cosmetic, backend guards are authoritative.

## Moderator probe (sweep, role = moderator: MANAGE_MODERATION, VIEW_LOGS)
Pages denied: 33. Pages that open: 20. Server responses observed: 403 on users, cars, support, feedback, verifications, inspector applications, announcements, featured campaigns, config, communications, provider governance. Server-guard findings:
1. `adminOnly` (middleware/auth.js) accepts ANY staff role. `/api/security-log` (+summary) and `/api/automation/*` reads therefore reach every staff role (moderator, marketing, hr...). Writes on automation/CMS use role lists. Concern: broader read exposure than the role catalog suggests. NOT changed (weakening or tightening shared middleware affects all staff roles; needs owner decision and a permission-per-endpoint test). Recommended: replace with `requirePermission(VIEW_LOGS)` for security log and a superadmin/admin gate for automation.
2. `/api/cms/*` authenticated reads use `protect` only (no staff check); admin CMS pages are page-level only. Writes are role-gated (`admin/superadmin/editor/publisher`). Concern: authenticated non-staff users can read draft CMS list endpoints. NOT changed; needs owner confirmation of intended exposure.
3. Reviews/chats admin pages: moderator opens them but the endpoints found are own-data (`/my`, user chats); no staff-wide data leak seen, but the pages lack a working moderation data source for staff. Recorded in matrix as missing workflow.
4. `/api/reports/admin/all` is role-gated (admin/superadmin/moderator) and returns 500 only because the reports table is missing (schema gap).

## Workflow trace status
VERIFIED locally (journey 26 + existing journeys 35/35): dealer onboarding/verification, personal account administration (suspend/restore), staff invitation/enrolment/role assignment/offboarding, listing submission/moderation, offers/settlement, leads, escrow guards (financial logic untouched).
PARTIAL/NOT VERIFIED end to end: featured vehicles, auctions/bids, inspections/NTSA, support tickets, reviews/feedback, market data/ads, panic room, site designs, platform recovery — either depend on schema-gap tables or were verified only to page-open/permission level (see matrix). Hosted behaviour, email delivery, PR 266: NOT VERIFIED.

## Defects corrected / intentionally unchanged
Corrected: hero/layout, sidebar badges (real counts only), header workspace + bell, Dealers/Personal Accounts wording, Active Staff metric, failure classifier for fetch-client errors, Live Auctions note.
Unchanged by design: escrow/payment/ledger/auction logic, route contracts, schema-gap pages, sample-based dashboard panels, inert legacy `privateSellerRegistration` setting (labelled legacy), shared `adminOnly`/CMS guards (owner decision above).
