# Phase 14.4 — Live-Session & Authentication Certification

**Status: BLOCKED — not certified.** This workspace has no Supabase URL/service key, no JWT secrets, no `backend/.env` (only `.env.example`), and no Postgres server (psql client only). No designated test accounts were supplied. Mocked-browser and unit tests below are **not** substitutes and are labelled MOCKED everywhere.

| Check | Status | Evidence available |
|---|---|---|
| Real login / org identity | BLOCKED | — |
| Route authorization (live) | BLOCKED | Source: dealer routes use `RequireAuth + RequireDealer`; buyer denial verified in MOCKED browser run (14.3 evidence, regression-checked) |
| Buyer denial | MOCKED-PASS | `DealerWorkspaceNavigation` tests + 14.3 browser matrix |
| Profile menu | MOCKED-PASS | Global Navbar unchanged |
| Logout | SOURCE-TRACED only | `AuthContext.logout` → `POST /api/v1/auth/logout`, clears CSRF, settles unauthenticated even if the call fails; backend revokes refresh tokens, bumps `tokenVersion`, clears cookies. Backend logout suites re-run (see matrix) |
| CSRF | PARTIAL | Browser run shows the client bootstraps `/v1/auth/csrf` before writes (needed a ≥32-char token); server enforcement covered by backend suites |
| Session expiry | BLOCKED (live) | httpClient 401/refresh logic covered by unit tests |

To certify: provide staging URL + designated dealer, buyer and non-owner dealer accounts, with synthetic listings only; then run the write-path matrix items marked LIVE-PENDING.
