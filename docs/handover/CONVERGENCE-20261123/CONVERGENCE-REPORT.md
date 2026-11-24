# KAYARD KE — Dealer Command Centre, Inventory & Employment: convergence report

All evidence is LOCAL (disposable PostgreSQL + PostgREST + loopback stubs). Nothing was deployed, committed, pushed or applied to a hosted database. PR 266 stays NOT VERIFIED.

## 1. Initial audit (source-first; the earlier ZIPs were not assumed present)
| Area (prompt §) | Finding | Action |
|---|---|---|
| Business model (§2) | Dealer registration/onboarding free; admin approval via existing owner-reserved workflow; no per-listing KAYARD approval; personal accounts ungated; dealer-listing-policy `subscriptionRequired=false` by default and admin-switchable. Verified by journey 24 (previous task). | None (preserved) |
| Dashboard hero/top bar/identity (§3) | Present from the dealer-launch task: compact top bar, "Run your dealership from one place", shortcuts, KPI tiles with loading / unavailable / partial / honest-empty states (CommandCentrePanel). No hardcoded figures. | None |
| Sidebar (§4) | One full-height card with brand, user, Add a Vehicle, five groups, Help & support, Sign out, mobile drawer. **Groups could not be collapsed.** | **Fixed** |
| Photos (§5.1) | Add (multi-file), previews, validation, remove with confirm, poster, persist — implemented and working. Reorder exists server-side only; no drag UI; no byte-level progress (spinner + busy state). | Verified in a real browser; reorder UI/progress bars deferred |
| Multi-select / bulk (§5.3) | Backend status bulk existed; **no UI, no bulk delete**, and a delete-only staff member could change status. | **Fixed** |
| Staff identity / numbers / Basic Staff Access / custom roles (§6.1–6.5) | Already built (staff code + concurrency-safe numbers, `basic_staff` zero-permission default, role CRUD, overreach checks, owner protection). | None |
| Temporary duties with expiry (§6.4) | **Missing.** | **Built** |
| Business e-mail (§6.2) | Recorded contact only; no mailbox provisioning, no verification workflow. | Documented, deferred |
| Invitation + employment lifecycle (§6.6, §7) | Journeys 17, 21, 22 pass unchanged. | None |
| Vehicle requests to KAYARD (§8) | Built in the dealer-launch task (support case, status visible). | None |

## 2. Defects found
1. Sidebar groups static (no independent collapse, no `aria-expanded`, no auto-expand of the active group).
2. No inventory multi-select UI; no bulk remove; bulk status route admitted delete-only staff.
3. No way to lend duties temporarily; the only option was changing the role.
4. (Harness) browser scripts used fixed sleeps and raced the dev server and the public listing cache; made wait-based.

## 3. Corrections and files changed
Backend: `controllers/dealerPlatformController.js` (bulkDeleteListings, bulk status needs canEditCars for staff, temporary-duty handlers), `routes/dealerPlatformRoutes.js` (`POST /inventory/bulk-delete`, `GET/POST /team/:id/temporary-duties`, `DELETE /team/:id/temporary-duties/:grantId`), `middleware/dealerOrgAccess.js` (effective permissions = role + active lent duties; fails closed), `services/dealerTemporaryDuties.service.js` (new).
Migration (NOT applied anywhere): `supabase/migrations/20261123220000_dealer_temporary_duties.sql` (one new table with RLS, employment-event type list gains two values).
Frontend: `pages/dealer/dashboard/DealerDashboard.tsx` (collapsible groups, bulk selection UI), `pages/dealer/dashboard/team/TemporaryDuties.tsx` (new), `team/StaffDetail.tsx`, `team/teamShared.ts`, `services/dealerPlatformApi.js`, `styles/dark-theme.generated.css`.
Tests: `backend/tests/regression/dealerTemporaryDuties.test.js` (new), `ci/db-journeys/25_temporary_duties_bulk.mjs` (new, in run.sh), `ci/browser/convergence.mjs` (new), `ci/browser/dealer-launch.mjs` (robustness + group selector), `src/__tests__/pages/dealer/DealerLaunchUi.test.tsx`, `DealerWorkspaceNavigation.test.tsx`, `StaffEmployment.test.tsx`.

## 4. Design improvements
Sidebar group headings are real buttons (chevron, `aria-expanded`, `aria-controls`, keyboard focus ring); each group opens/closes alone, remembers its state per browser, and the group holding the active page always re-opens. Collapsed-icon mode and mobile drawer unchanged; Sign out and Help stay in the fixed footer. Inventory gains a select-all/clear toolbar with a live count, itemised success/failure report, confirm-before-remove, and a 390 px layout with no horizontal overflow.

## 5. Inventory and photo management
Bulk remove runs each id through the single canonical `deleteCar` (ownership, auction/settlement lock, idempotency, listing count, cache invalidation, audit). The route requires `canDeleteCars`; ids that are not the dealership's are reported `NOT_FOUND` and never touched; max 50 per request; partial failures are listed per vehicle. Bulk status now additionally requires `canEditCars` for staff. Selection only ever contains vehicles visible under the current filter. Photos: verified end-to-end in a browser (two files selected, previews, upload stored, poster stored, remove stored, still correct after refresh).

## 6. Role and permission matrix
| Permission | Basic Staff Access | Viewer | Lot agent | Sales agent | Finance officer | Manager | Owner | Can be lent temporarily |
|---|---|---|---|---|---|---|---|---|
| Add vehicles (canListCars) | – | – | ✓ | ✓ | – | ✓ | ✓ | ✓ |
| Edit vehicles / photos (canEditCars) | – | – | ✓ | ✓ | – | ✓ | ✓ | ✓ |
| Remove vehicles, bulk remove (canDeleteCars) | – | – | – | – | – | ✓ | ✓ | ✓ |
| Earnings (canViewEarnings) | – | – | – | – | ✓ | ✓ | ✓ | ✓ (granter must hold it) |
| Approve deals (canApproveDeals) | – | – | – | – | ✓ | ✓ | ✓ | ✓ |
| Enquiries (canChatBuyers) | – | – | – | ✓ | – | ✓ | ✓ | ✓ |
| Dealership settings (canEditSettings) | – | – | – | – | – | ✓ (built-in Manager) | ✓ | **Never** |
| Team management (canManageTeam) | – | – | – | – | – | – (owner only by default) | ✓ | **Never** |
Built-in roles are as defined in `dealerTeamRoles.service.js`; custom roles pick any subset of the same eight permissions, subject to the overreach rules below.
Basic Staff Access = zero permissions: own staff profile only. Banking, ownership and payouts are never role- or duty-grantable below the owner. Rules enforced in the backend: only the 6 operational duties; granter must hold what they lend; nobody grants to themselves; a member who holds permissions the granter lacks (or a manager) cannot be managed by a non-owner; an expiry is mandatory (≤ 90 days); expired/revoked grants stop counting with no job; a removed member has no access whatever grants exist. Custom roles: unchanged from the employment work (create/edit/assign; overreach refused).

## 7. Staff numbering and business e-mail
Unchanged and verified earlier: a per-dealership staff code plus a counter row allocates numbers under a lock when an invitation is accepted; numbers are unique per dealership and never reused after offboarding. The server supplies the staff display name (business name plus staff number) shown in the roster. The invitee's verified login e-mail is never replaced. A business e-mail is a recorded contact only (no mailbox is created, no verification, no sending from the dealership domain); it is labelled as such. Mailbox provisioning/verification is deferred.

## 8. Invitation and employment lifecycle
Invite (Basic Staff Access default) → public preview (dealership + role) → register or link the verified identity → accept (single-use, race- and replay-safe; wrong account refused with a masked hint) → staff number issued → employer assigns role / lends temporary duties / revokes → suspend, terminate or resign → membership access ends, records and attribution are kept, personal account untouched, multiple dealership memberships stay separate. Covered by journeys 17, 21, 22, 25.

## 9. Test commands and results
See TEST-RESULTS.md (filled from the final run).

## 10. Remaining blockers / limitations
- The new migration is not applied anywhere. Until it is, `activeDutyPermissions` fails closed (no extra permissions) and the Temporary duties panel shows an error rather than data.
- Hosted RLS, mail delivery, Cloudinary and Render/Vercel behaviour NOT VERIFIED.
- Staff using the separate Dealership Workspace screen do not yet have bulk controls there (backend still enforces).

## 11. Intentionally deferred
Photo drag-reorder UI and upload progress bars; mailbox provisioning / domain verification; "Coming soon" labelling of Auctions and Inspections (these pages read real data, so they were left reachable); admin configuration redesign (explicitly out of scope).
