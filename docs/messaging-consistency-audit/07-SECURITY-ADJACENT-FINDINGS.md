# 07 — Security and adjacent-regression findings

Evidence level for everything here: real `backend/server.js` + PostgreSQL 16 built from the migration chain, emulated REST layer (see `02`). **Not Supabase, not staging, not production.** Where hosted state may differ from the chain it is called out as UNCONFIRMED.

Test files: `m5-authz-sweep` (4), `m5-financial-webhooks` (7), `m5-rls-privileges` (5), `m5-ownership` (6) — **22 PASS, 0 FAIL** on the fixed tree.

## Findings that mattered (all fixed unless noted)

### D-FIN-1 — Provider callbacks were rejected by CSRF (P0)
`csrfProtection` is mounted with `app.use("/api", …)`, where Express strips the mount from `req.path`. The exemption list holds full `/api/…` paths, so it **never matched**: `POST /api/payments/callback` (and `/api/v1/payments/callback`, B2C, bid callbacks, communication webhooks) returned `403 CSRF token validation failed` to the provider. A unit test existed but supplied full paths, so it passed. Observed on the foundation; fixed by matching `baseUrl + path` (and folding `/api/vN/`). Non-exempt routes still require CSRF (test asserts it).

### D-FIN-2 — Idempotency guard threw on every request (P0)
`middleware/idempotency.js` calls `IdempotencyKey.getCachedResponse()` and `.record()`; the model never defined them (unit tests mock them). Every idempotency-guarded critical operation (M-Pesa callbacks, escrow actions, bids, payment initiation) hit the fail-closed branch and returned `503 IDEMPOTENCY_COORDINATION_UNAVAILABLE`. Fail-closed meant no duplicate money movement, but also no settlement. Fixed in the model; with D-FIN-1 and D-SCHEMA-3 fixed, 12 concurrent identical success callbacks settle **once**, a replay keeps the first receipt, an amount mismatch is **failed not settled**, a failed callback replayed 8× produces **one** notification, unknown checkout ids and malformed bodies create nothing.

### D-SEC-1 — Client roles could execute SECURITY DEFINER money functions (P0 *if hosted == chain*)
`20260907190100` granted `kayad_resolve_dispute_atomic` to `authenticated`; later migrations only `REVOKE … FROM PUBLIC`, which does not remove an explicit role grant. The function has **no caller authorization** (it takes `p_actor_id` as an argument). On the chain, an authenticated user reached the function body through the API (`P0001 Escrow is not in disputed state` was the only barrier — a precondition, not authorization). `kayad_transition_purchase_outcome_atomic`, `kayad_create_lead_atomic`, `kayad_transition_lead_atomic` were executable by `PUBLIC`. Fix: `20261011093000` revokes client execute on all non-trigger `kayad_*` functions (backend uses `service_role`; no RLS policy references them; the SPA has no direct DB client). Test asserts `anon`/`authenticated` get permission errors for five RPCs and that the catalog has zero client-executable `kayad_*` functions; control: `service_role` still works. **Hosted grants are UNCONFIRMED — run the catalog query in `10` on staging/production before and after.**

### D-SEC-2 — 11 public tables without RLS on the chain (P1; hosted state UNCONFIRMED)
`distributed_locks, inspection_branches, inspection_checklist_items, inspection_packages, inspection_providers, mpesa_transactions, payment_providers, provider_credentials, refunds, roadside_service_requests, vehicle_service_offerings`. In hosted Supabase a table with RLS off and client grants is open through the REST API; `rls_auto_enable()` (created by no migration — D-MIG-1) may have enabled RLS there. Fix: `20261011093100` (RLS on, client grants revoked, missing tables skipped). Test: catalog shows **zero** public tables with RLS off; `authenticated`/`anon` read nothing from eleven sensitive tables and cannot write `chats` or insert `users`.

### D-AUTHZ-1 — Governance data open to any signed-in user (P1)
`/api/governance/*` applied only `protect`; the controller enforced roles on writes only. Any user could read audit logs, risks, decisions, compliance, reports, change requests. Fixed with a role gate (`admin, superadmin, executive, manager`, same set as the controller). A **route-derived sweep** (308 endpoints across 18 privileged-looking routers, discovered from `server.js` and route sources, not hand-picked) found this; after the fix a plain user gets no 2xx/5xx on any privileged route except an explicit allowlist of self-scoped endpoints (`/api/communications/history|preferences`, `/api/countries`, `/api/feature-flags/…`, public admin config) and the `/api/config/*` 500s (D-SCHEMA-2). Anonymous: no 2xx/5xx except the two public endpoints.

### D-AUTHZ-2 — Config audit/export readable by any signed-in user (P2, **partially fixed**)
`/api/config/audit` and `/export` are now admin-only. `/api/config/stats` and `/entries` remain readable by any authenticated user; the whole subsystem currently returns 500 (missing tables), so there is no data exposure today, but the gating must be decided before those tables exist. **Open.**

### D-DATA-1 — Every listing edit failed (P1)
`snakeToCamel("reminder_sent_5min") → reminderSent5min`, `camelToSnake` returns `reminder_sent5min` (no such column). `Car.save()` writes every field, so `PUT /api/cars/:id` returned `500 Failed to update car` for owners **and** staff (PGRST204). Aliases added for four `cars` and two `vehicle_valuations` columns; the owner edit now persists (title and price verified in the row).

## Ownership and auction authorization — PASS
Rival dealer cannot `PUT`/`DELETE` another dealer's car (4xx, row unchanged); plain buyer gets 403 on create/update/delete; anonymous gets 401/403 on mutate/bid/end; a non-admin — including the listing owner — cannot end an auction (403); the owner **can** edit their own listing (control). Bid gates observed with no bid row written: own-car bid rejected, unverified phone rejected, unpublished auction rejected (`AUCTION_NOT_PUBLISHED`).

## Communications and webhooks
`/communications/webhooks/status` and `/africastalking/status`: no secret → 401, wrong secret → 401, correct secret → accepted; Brevo unsigned → 401. M-Pesa callbacks: replay-safe as above. **Observation D-FIN-3 (P3, design):** when a duplicate callback finds the distributed lock held, the middleware replies `200 {ResultCode:0,"Processing"}` so the provider will not retry. If the first attempt then fails after releasing its claim, the provider will not redeliver and the payment relies on reconciliation. Not changed.

## NOT RUN (stated plainly)
Full auction bid → payment → settlement flow (requires published setup, registration, bid-security hold); B2C payout callback with a real payout row; escrow release/refund/dispute flows against the database; ledger double-entry/reconciliation consistency; administrator role matrix beyond the route sweep; Twilio signature **positive** path; Brevo positive path; production IP allowlist (`mpesaIpWhitelist` is bypassed in non-production by design, so it was not exercised); any real provider.
