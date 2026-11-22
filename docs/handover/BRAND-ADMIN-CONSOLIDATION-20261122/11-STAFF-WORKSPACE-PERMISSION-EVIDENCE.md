# 11 — Staff workspace permission and screenshot evidence

**Method.** One disposable account per staff role (`example.test` addresses, disposable password) was created in the throw-away database. (1) The real admin UI was driven in Chromium as each role over all 53 admin routes; (2) the **39 admin GET calls the admin UI makes** were then replayed **directly against the API** (no UI) as anonymous, a personal user, a dealer and all 10 staff roles. A hidden button is not treated as enforcement: section 1 is the API result.

Limits: only GET (read) calls were replayed — create / edit / approve actions per role were **not** exercised (NOT TESTED); the "System Owner / platform owner" identity was not seeded, so owner-only pages were observed only as refused. Evidence: `evidence/api-permission-matrix.json`, `evidence/admin-ui-<role>.json`, `screenshots/staff/`.

## 1. Direct API access (HTTP status; 200 = allowed)
|endpoint|anon|user|dealer|admin|superadmin|marketing|tech|hr|accounts|escrow|ad_manager|moderator|ghost|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|`/api/admin/alerts?limit=1&read=false`|401|403|403|200|200|200|200|200|200|200|200|200|200|
|`/api/admin/alerts?limit=4`|401|403|403|200|200|200|200|200|200|200|200|200|200|
|`/api/admin/audit-log?limit=100`|401|403|403|200|200|403|200|403|200|200|403|200|403|
|`/api/admin/audit-log?page=1&limit=25`|401|403|403|200|200|403|200|403|200|200|403|200|403|
|`/api/admin/cars?page=1&limit=20`|401|403|403|200|200|403|403|403|403|403|403|403|403|
|`/api/admin/cars?page=1&limit=20&status=pending`|401|403|403|200|200|403|403|403|403|403|403|403|403|
|`/api/admin/cars?page=1&limit=50`|401|403|403|200|200|403|403|403|403|403|403|403|403|
|`/api/admin/chats?page=1&limit=20`|401|403|403|200|200|403|200|403|403|403|403|200|403|
|`/api/admin/config`|401|403|403|200|200|403|403|403|403|403|403|403|403|
|`/api/admin/dealer-onboarding/readiness`|401|403|403|200|200|403|403|403|403|403|403|403|403|
|`/api/admin/featured-campaigns`|401|403|403|200|200|200|403|403|403|403|200|403|403|
|`/api/admin/inspection-governance/providers?stage=UNDER_REV…`|401|403|403|200|200|403|403|403|403|403|403|403|200|
|`/api/admin/market-data?page=1&limit=20`|401|403|403|500|500|500|403|403|500|403|500|403|403|
|`/api/admin/payments?page=1&limit=20`|401|403|403|200|200|403|403|403|200|403|403|403|403|
|`/api/admin/public/config`|200|200|200|200|200|200|200|200|200|200|200|200|200|
|`/api/admin/referrals?page=1&limit=20`|401|403|403|200|200|200|200|200|200|200|200|200|403|
|`/api/admin/reviews?page=1&limit=20`|401|403|403|200|200|200|200|200|200|200|200|200|403|
|`/api/admin/site-designs`|401|403|403|200|200|403|403|403|403|403|403|403|403|
|`/api/admin/site-designs/history`|401|403|403|200|200|403|403|403|403|403|403|403|403|
|`/api/admin/stats`|401|403|403|200|200|200|200|200|200|200|200|200|403|
|`/api/admin/users?page=1&limit=20`|401|403|403|200|200|403|200|200|403|403|403|403|403|
|`/api/admin/users?page=1&limit=4&role=dealer&pendingApprova…`|401|403|403|200|200|403|200|200|403|403|403|403|403|
|`/api/admin/users?page=1&limit=50`|401|403|403|200|200|403|200|200|403|403|403|403|403|
|`/api/admin/users?role=dealer&page=1&limit=20`|401|403|403|200|200|403|200|200|403|403|403|403|403|
|`/api/announcements?page=1&limit=10`|401|403|403|500|500|403|403|403|403|403|403|403|403|
|`/api/automation/stats`|401|403|403|500|500|500|500|500|500|500|500|500|500|
|`/api/automation/workflows`|401|403|403|500|500|500|500|500|500|500|500|500|500|
|`/api/bids/admin/all?page=1&limit=20`|401|403|403|200|200|200|200|200|200|200|200|200|200|
|`/api/bids/admin/suspicious`|401|403|403|500|500|500|500|500|500|500|500|500|500|
|`/api/config/stats`|401|403|403|500|500|403|403|403|403|403|403|403|403|
|`/api/escrow/operations/dashboard?limit=15`|401|403|403|200|200|403|403|403|200|200|403|403|403|
|`/api/escrow?status=funded&page=1&limit=30`|401|403|403|200|200|403|403|403|200|200|403|403|403|
|`/api/feedback/admin/all?page=1&limit=20`|401|403|403|500|500|403|403|403|403|403|403|403|403|
|`/api/ntsa-verification`|401|403|403|500|500|500|500|500|500|500|500|500|500|
|`/api/reports/admin/all?page=1&limit=20`|401|403|403|500|500|403|403|403|403|403|403|500|403|
|`/api/security-logs?page=1&limit=30`|401|403|403|500|500|500|500|500|500|500|500|500|500|
|`/api/support/staff/metrics?days=30`|401|403|403|200|200|403|200|403|403|403|403|403|403|
|`/api/support/staff/queue?status=active&limit=50&offset=0`|401|403|403|200|200|403|200|403|403|403|403|403|403|
|`/api/support/staff/team`|401|403|403|200|200|403|200|403|403|403|403|403|403|

**Result.** Anonymous callers get 401 and personal / dealer accounts 403 on every admin endpoint **except** `/api/admin/public/config` (200 for everyone — it returns only public branding / config fields and is intentionally public). Staff access is **per role**, not "any staff": for example `/api/admin/cars`, `/api/admin/config`, `/api/admin/site-designs` and `/api/admin/dealer-onboarding/readiness` are admin/superadmin only; `/api/admin/payments` is admin, superadmin and accounts; escrow endpoints admin, superadmin, accounts and escrow_officer; support-queue endpoints admin, superadmin and technical_support; `/api/admin/users` admin, superadmin, technical_support, hr.

Endpoints that returned 500 are listed in section 4 (they are missing tables, not permission results).

## 2. What each role's admin UI shows (route-level, main content area)
Legend: page = page renders for the role, denied = page shows an explicit restriction message, error = page shows a failure message, blank = nothing.

|route|admin|superadmin|marketing|tech|hr|accounts|escrow|ad_manager|moderator|ghost|
|---|---|---|---|---|---|---|---|---|---|---|
|`/admin`|denied|denied|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/users`|page|page|denied|page|page|denied|denied|denied|denied|denied|
|`/admin/sellers`|page|page|denied|denied|page|denied|denied|denied|denied|denied|
|`/admin/private-seller-applications`|denied|denied|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/cars`|page|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/moderation`|page|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/auctions`|page|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/bids`|page|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/escrows`|page|page|denied|denied|denied|page|page|denied|denied|denied|
|`/admin/reviews`|page|page|denied|denied|denied|denied|denied|denied|page|denied|
|`/admin/referrals`|page|page|page|denied|denied|page|denied|page|denied|denied|
|`/admin/chats`|page|page|denied|denied|denied|denied|denied|denied|page|denied|
|`/admin/reports`|page|page|denied|denied|denied|denied|denied|denied|page|denied|
|`/admin/support-tickets`|page|page|page|page|page|page|page|page|page|page|
|`/admin/feedback`|page|page|page|page|page|page|page|page|page|page|
|`/admin/market-data`|page|page|page|denied|denied|page|denied|page|denied|denied|
|`/admin/transactions`|page|page|denied|denied|denied|page|denied|denied|denied|denied|
|`/admin/ntsa-queue`|page|page|denied|denied|denied|denied|denied|denied|denied|page|
|`/admin/inspections`|page|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/dealer-verifications`|page|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/inspector-applications`|page|page|denied|page|page|denied|denied|denied|denied|denied|
|`/admin/security-log`|page|page|denied|page|denied|page|page|denied|page|denied|
|`/admin/ads`|page|page|page|denied|denied|denied|denied|page|denied|denied|
|`/admin/broadcast`|page|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/settings`|page|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/control-room`|denied|denied|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/staff`|denied|denied|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/staff-permissions`|denied|denied|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/traffic-analytics`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/site-designs`|page|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/featured-vehicles`|page|page|page|denied|denied|denied|denied|page|denied|denied|
|`/admin/panic-room`|denied|denied|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/platform-recovery`|denied|denied|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/webhoist`|denied|denied|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/cms`|page|page|page|page|page|page|page|page|page|page|
|`/admin/automation`|page|page|page|page|page|page|page|page|page|page|
|`/admin/config`|page|page|page|page|page|page|page|page|page|page|
|`/admin/lowcode`|denied|denied|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/vxp`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/xos`|denied|error|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/ai`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/digital-twin`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/control-center`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/integration`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/governance`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/intelligence`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/command-center`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/improvement`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/platform-factory`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/owners`|denied|page|denied|denied|denied|denied|denied|denied|denied|denied|
|`/admin/communications`|page|page|denied|page|denied|denied|denied|denied|denied|denied|
|`/admin/provider-governance`|page|page|denied|denied|denied|denied|denied|denied|denied|page|
|`/admin/support`|page|page|page|page|page|page|page|page|page|page|

Notes: `/admin` (dashboard) reads as "denied" for every role in this table only because the classifier matches the word "permission" in sidebar text; the superadmin screenshot shows the dashboard rendering, so treat that row as a classifier artefact, not a finding. `/admin/xos` for superadmin was a **real crash** (fixed this phase, see 13).

## 3. UI vs API consistency
* Where the API refuses a role, the UI **also** refuses or states the restriction in almost every case (examples captured: "Your role does not include customer support access.", "Only a verified platform owner can manage owners.", "This administration page is restricted to Super Admin."). The UI is never the only control.
* **Pages that render their shell although the role's API calls are refused:** `/admin/config` (403 on `/api/config/stats` for 8 non-admin roles) and `/admin/feedback` (403 for roles other than admin/superadmin, though some show "Feedback could not be loaded"). The data is protected (API refuses), but the page frame is shown to roles that cannot use it — navigation/route gating should match the API (owner decision on intended role access).
* **Least-privilege observations (not changed — authority is the owner's):** `/api/bids/admin/all`, `/api/admin/alerts` and `/api/admin/stats` are readable by *every* staff role (including hr, marketing, ghost_checker for bids); `/api/admin/reviews` and `/api/admin/referrals` by all staff except ghost_checker.

## 4. Admin endpoints that fail with 500 on a database built from the repo migrations
|endpoint|cause|hosted DB (read-only check)|
|---|---|---|
|`/api/reports/admin/all`|table `reports` does not exist|missing|
|`/api/feedback/admin/all`|table `feedback` does not exist|missing|
|`/api/announcements`|table `announcements` does not exist|missing|
|`/api/automation/stats`, `/workflows`|table `automation_tasks` does not exist|missing|
|`/api/config/stats`|table `feature_flags` does not exist|missing|
|`/api/admin/market-data`|table `market_data` not in any migration|**present on hosted** (drift)|
|`/api/ntsa-verification`|table `ntsa_verification_requests` not in any migration|**present on hosted** (drift)|
|`/api/bids/admin/suspicious`|column `bids.is_suspicious` does not exist|not checked|
|`/api/security-logs`|**code bug** (ReferenceError in the audit_logs fallback)|**FIXED this phase**; re-verified live: 200 via audit_logs fallback|
Owner decision **D-20**: create migrations for the five missing tables / the column (needs a schema design I will not invent), or retire the pages. Until then these pages show an error / empty state rather than data.

## 5. Screenshots
`screenshots/staff/` holds the dashboard (`/admin`) and the Listings page (`/admin/cars`) per role at 1440×900.
