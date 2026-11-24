# Permission and security audit (2026-11-24, completion phase)

Principle applied: change authorization only where current behaviour is demonstrably inconsistent with the existing model. No role, permission or hierarchy was added or elevated.

## A. Security-log and automation reads
| Endpoint | Finding | Evidence | Action | State |
|---|---|---|---|---|
| `GET /api/security-logs`, `/summary` | **Confirmed defect.** The console gates the page with `VIEW_LOGS` (`PAGE_PERMISSIONS`), but the API accepted ANY staff role, so marketing, ad_manager, hr and ghost_checker (no `VIEW_LOGS`) could call it directly. | `roles.js` ROLE_PERMISSIONS; routes/securityLogRoutes.js; journey 27 F1-F2 | Added `requirePermission(PERM.VIEW_LOGS)` on exactly these two routes (shared `adminOnly` untouched). Holders of the permission (moderator, escrow_officer, technical_support, accounts, admin, superadmin, per-user grants) are unaffected. | Fixed and verified (journey 27 F1/F2; jest `adminConsoleCompletionGuards`) |
| `GET /api/security-logs/my` | Own activity only; open to any signed-in account by design | journey 27 F3 | Unchanged except the audit-log fallback for a missing `security_logs` table | Existing and confirmed correct |
| `/api/automation/*` reads | **Intentional.** Router comment records Phase 15: reads were open to ANY signed-in account; the staff gate was added deliberately. The studio has no `PAGE_PERMISSIONS` entry, so UI and server agree (any staff). | routes/automationRoutes.js; journey 27 F7 | Preserved | Existing and confirmed correct |

## B. CMS reads
| Finding | Evidence | Action | State |
|---|---|---|---|
| Everything after `router.use(protect)` in `cmsRoutes.js` (pages incl. `?status=draft`, campaigns, banners, media, revisions, A/B tests, analytics, dashboard stats) was readable by any signed-in account (buyer/dealer). Only `admin`/`superadmin` can write (`editor`/`publisher`/`creator` are not platform roles) and every consumer is under `/admin/cms`. Public rendering uses the routes BEFORE `protect` (published page by slug, content, FAQs, analytics tracking), which still work without signing in. | routes/cmsRoutes.js; `src/services/cmsApi.js` consumers; journey 27 F4-F6 | `router.use(protect, adminOnly)` for the authenticated block only. Write routes keep their stricter `allowRoles`. | Fixed and verified |

## C. Other server-side observations (no change; evidence recorded)
- `adminOnly` means "any platform staff" (shared by many routes): unchanged by design (journey 14 asserts staff-role x write-endpoint behaviour; anonymous 401, personal/dealer 403).
- Support follows its own capability model (agent = technical_support; oversight = admin/superadmin read-only): verified, journey 28 S3-S4.
- Feedback and announcements are `admin`/`superadmin` only on the server; the UI page-level gate lets other staff open the page and shows the API refusal honestly (journey 27 B4, C4).
- Moderator-openable pages whose APIs return 403 (users, cars, support, feedback, verifications, inspector applications, broadcast, featured vehicles, config, communications, provider governance): a **UI-mirror vs server mismatch** (page opens, data refused). Not a data leak. Aligning the UI mirror (`PAGE_PERMISSIONS`) would be a permission-model change: **Requires separate owner decision.**
- Decision authority: listing and dealer approvals remain owner-reserved server-side; there is no per-listing KAYARD approval gate for dealers or personal sellers.
- Dealer staff vs platform staff: dealer team members live in `dealer_teams`, are never counted as platform staff (journey 26), and are refused every admin API (journey 26 section 2).

## D. RLS
The new tables have RLS enabled with no client policy: no client (anon/authenticated) can read or write them; the backend service role only. `public.cars`, financial and identity tables were not touched.

## E. Not changed / not verified
Hosted behaviour; per-endpoint review of every studio router (several use only `protect` at router level with route-level role checks, e.g. config answers 403 to moderator); rate limits unchanged.


---
## Addendum — finalisation phase (2026-11-24, second pass)

### Full read-side role matrix (journey `29_permission_matrix`, 114/114 PASS, real HTTP, disposable DB)
Actors: anonymous, personal account, legacy seller account, dealer owner, dealer staff (viewer, via the real invitation flow), admin, Super Admin (owner), moderator, hr, marketing, technical_support. Status per endpoint (anon / personal / legacy / dealer / dealer staff / admin / superadmin / moderator / hr / marketing / technical_support):

| Endpoint | Statuses | Guard |
|---|---|---|
| `/api/security-logs`, `/summary` | 401 / 403 / 403 / 403 / 403 / 200 / 200 / 200 / 403 / 403 / 200 | VIEW_LOGS |
| `/api/automation/stats` | 401 / 403 ×4 / 503 ×6 | any staff (intentional; 503 = not provisioned) |
| `/api/cms/dashboard/stats` | 401 / 403 ×4 / 200 ×6 | any staff |
| `/api/reports/admin/all` | 401 / 403 ×4 / 200 / 200 / 200 / 403 / 403 / 403 | admin, superadmin, moderator |
| `/api/feedback/admin/all`, `/api/announcements` | 401 / 403 ×4 / 200 / 200 / 403 ×4 | admin, superadmin |
| `/api/config/stats` | 401 / 403 ×4 / 503 / 503 / 403 ×4 | admin, superadmin |
| `/api/admin/staff` | 401 / 403 ×4 / 403 / 200 / 403 ×4 | Super Admin + owner |
| `/api/support/staff/queue` | 401 / 403 ×4 / 200 / 200 / 403 / 403 / 403 / 200 | support agent or oversight |
Public CMS reads (`/api/cms/faqs`, `/api/cms/content`) remain 200 anonymously; `/api/cms/pages` is not anonymous. Raw matrix: `ci/db-journeys/out/permission-matrix-read.json`.

### Concerns re-checked
| Concern | Result | Status |
|---|---|---|
| Security-log reads | VIEW_LOGS enforced; hr/marketing 403, moderator 200 | Fixed and verified |
| Automation `adminOnly` | any staff may read; non-staff 403; deliberate and unchanged | Existing and confirmed correct |
| Authenticated CMS reads | staff only; public routes unchanged | Fixed and verified |
| Moderator UI vs server | UI corrected for the 5 sidebar pages; server unchanged | Fixed and verified (vitest + sweep) |
| Server authorisation of write endpoints | covered by journey 14 (admin write matrix) | Existing and confirmed correct |

### Residual (UI-only, no data exposure)
By direct URL a moderator can still open these 7 pages, whose data calls answer 403 and show an honest failure: `/admin/users`, `/admin/inspector-applications`, `/admin/featured-vehicles`, `/admin/config`, `/admin/communications`, `/admin/provider-governance`, plus `/admin` health tile (`/api/ecp/health`). Tightening the route guard further is a cosmetic follow-up; the server already refuses. Status: Not verified as a UI change; Requires separate owner decision whether to harden the route guard.

### Dealer and personal accounts
Personal accounts, legacy sellers, dealer owners and dealer staff received 403 on every platform-staff endpoint above. Dealer staff were never counted as KAYARD platform staff on the dashboard (journey 26). Personal registration remains approval-free; dealer onboarding verification unchanged.
