# 26 — Final security certification (local / disposable DB)

Scope: Admin Console and the governance decisions OD-1…OD-3. **This is not a penetration test and not a production certification.** Evidence is HTTP-level against a disposable database plus unit/component tests.

## 1. Role/permission matrix — expected vs actual (real HTTP, claims taken from the database, not role names)
| Capability | anon | personal | dealer owner | dealer staff | moderator | ordinary Admin | technical_support (no grant) | technical_support / moderator **with** `view_system_health` | owner SA | second SA |
|---|---|---|---|---|---|---|---|---|---|---|
| `GET /api/admin/system/health`, `/api/ecp/health` | 401 | 403 | 403 | 403 | 403 | 403 | 403 | **200** | 200 | 200 |
| Submit dealer reinstatement request | 401 | 403 | 403 | 403 | 403 | **201** | 403 | 403 | n/a (decides) | n/a |
| Decide suspension / reinstatement request | 401 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | **200** | **200** |
| Direct dealer reinstate / `approve` on suspended / un-ban | 401 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | allowed (reinstate: Super Admin) | allowed |
| Ad-slot / campaign writes | 401 | 403 | 403 | 403 | 403 | 200 (`manage_ads`) | 403 | — | 200 | 200 |
| Dealer payout-account review | 401 | 403 | 403 | 403 | 403 | 4xx/200 (`manage_payments` — admin holds it) | 403 | — | 200 | 200 |
| End auction / change auction platform policy | 401 | 403 | 403 | 403 | 403 | allowed (`manage_auctions` / `manage_platform`) | 403 | — | allowed | allowed |
| Grant/revoke staff permissions | 401 | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 200 (System Owner only) | **403** `SYSTEM_OWNER_REQUIRED` |
Evidence: journeys 29, 32, 33, 34; backend Jest role/route matrix `stage5f5RoleRouteMatrix` (system-health row tightened to "no default role"); jest `systemHealthPermission`.

## 2. Frontend vs backend
The browser UI hides tiles/pages by the same permission mirror (`src/utils/permissions.ts`) but **every decision above is enforced on the server**; the frontend never grants anything. System-health tile renders only with `view_system_health` and makes no request otherwise (vitest `adminHealthTileGate`). Moderators see the access-denied state on 33 of 53 routes, and journey 32 T3 proves the server also refuses the endpoints unique to those routes.

## 3. Other controls
* **Cross-tenant**: dealer isolation (journey 16) and dealer-staff refusals above. Reinstatement acts on a single verification id; listings, team and users are untouched (journey 33 C7).
* **Replay / concurrency**: decisions are claim-based; 4 simultaneous decisions → one winner; replay 409 (journey 33 D7–D9).
* **No flash of protected content**: route guards render the denied state before any data request (sweep: moderator restricted rows have zero failed protected API calls).
* **Error bodies**: no SQL/PostgREST internals for anonymous/personal/dealer (journey 32 T5); stack traces only in development/test.
* **RLS / grants**: new tables `REVOKE ALL FROM anon, authenticated`, RLS enabled (migrations 120000/130000); not applied hosted.
* **Secrets**: ZIP secret scan (patterns for keys/tokens/passwords/private keys) must be clean — recorded in doc 18 at packaging time. No secrets are printed in any evidence file.
* **CSRF**: unauthenticated POSTs without a token are refused before authorisation (observed 403 during journey 33 development); with a token they return 401.

## 4. Defects found and fixed in this phase (all access-control only)
1. Ad-slot create/update/delete open to any staff → `manage_ads`.
2. Dealer payout-account review open to any staff → `manage_payments`.
3. Admin end-auction open to any staff → `manage_auctions`.
4. Auction platform policy `PUT` open to any staff → `manage_platform`.
5. Approve-as-reinstate back door (`/admin/:id/approve` on a suspended dealer by an Admin) → 403 `REINSTATEMENT_REQUIRES_APPROVAL`.
6. System health open to any staff → `view_system_health`.
(An intermediate mistake of mine — referencing a non-existent `PERMISSIONS.MANAGE_PLATFORM` key, which would have locked admins out — was caught by journey 34 W17d and corrected to `MANAGE_SETTINGS` before delivery.)

## 5. Open items (not fixed — owner decision / further audit)
* Remaining `adminOnly`-only write routes (any staff role) that were not individually audited: feature flags (create/update/delete/toggle), hero slides, localization, organizations, regional configuration, queue/DLQ retry-delete, notification-analytics retries, reliability refresh/evaluate, vehicle-analytics regenerate, dispute transitions/resolution, loan-application status, fraud status, dealer-health override/recalculate, contact read-marking, listing-assistant batch, listing-quality recalculation, marketplace-health resolve/regenerate, cache flush, metrics reset. Some enforce inside the controller. **Recommendation:** an audit pass that gives each a named permission, with a role-matrix test like journey 34.
* Hosted drift (doc 25) and the unrehearsed restore.
* No external penetration test, no dependency/SAST re-run in this phase, no real screen-reader test (doc 22).
