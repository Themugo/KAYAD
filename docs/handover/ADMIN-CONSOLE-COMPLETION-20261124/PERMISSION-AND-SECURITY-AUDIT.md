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
