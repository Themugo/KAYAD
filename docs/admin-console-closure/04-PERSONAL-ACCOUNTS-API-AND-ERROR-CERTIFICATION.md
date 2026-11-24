# 04 — Personal Accounts page: server error root cause and fix

## Root cause (verified)
The page called the application-review endpoint, which selected from `private_seller_capabilities`. On hosted that optional table is **absent** (verified read-only: not in `information_schema.tables`), so PostgREST returned an error → 500. The page also conflated "personal accounts" with "historical applications".

## Fix
* `GET /api/private-seller/admin/accounts` (`MANAGE_USERS`): lists real personal accounts from `users` (role user/individual_seller), query `q`, `state` (all|active|restricted), `verified`, `page`, `limit`; capability join is **optional and tolerant of the missing table**.
* `listApplications` tolerant of missing table (returns empty).
* Page `AdminPersonalAccounts.tsx`: loading, empty, error (with retry; error is shown, not hidden), search, filters, pagination, suspend/restore (via `toggle-ban`).
* Errors do not leak SQL/stack to non-dev clients (journey 31/15).

## Evidence
Journey 30 (62/62): works with zero applications and with the table absent; 403 for non-staff; pagination bounds; suspend/restore. Vitest `AdminPersonalAccounts.test.tsx`.
