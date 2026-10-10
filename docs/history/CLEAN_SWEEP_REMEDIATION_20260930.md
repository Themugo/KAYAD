# KAYAD Clean-Sweep Remediation Report — 2026-09-30

## Baseline

Working baseline: `KAYAD-ADVANCED-SWEEP-WORKING-CANDIDATE-20260930.zip`

The sweep followed the current uploaded clean-sweep specification, with the observed dealer-registration CSRF failure treated as P0.

## P0 finding — CSRF route mismatch

Observed by the user:

`Route not found: /api/v1/auth/csrf`

Source trace:

`src/api/httpClient.ts`
→ `/v1/auth/csrf`
→ Axios base `/api`
→ `/api/v1/auth/csrf`

Backend trace:

`backend/server.js`
→ `/api/v1`
→ `backend/routes/v1.js`
→ `/auth`
→ `backend/routes/authRoutes.js`
→ `GET /csrf`

The current source therefore resolves the canonical route correctly.

Conclusion: the reported 404 is a runtime/deployment convergence failure unless the deployed process is proven to be running this exact source revision.

Remediation:

1. Added canonical route diagnostic headers.
2. Added `scripts/validate-canonical-csrf-route.mjs`.
3. Added `validate:csrf-route` npm script.
4. Added a non-mocked Playwright live-route regression under `E2E_WITH_BACKEND=1`.
5. Documented the runtime/deployment probe requirement.

## Additional root causes corrected

### Distributed locks

Production no longer falls back silently to a process-local lock. Critical operations fail closed when the PostgreSQL lock primitive is unavailable.

### Idempotency confidentiality

Request bodies are recursively redacted before idempotency persistence. Passwords, OTPs, reset/access/refresh/CSRF tokens, API keys and secrets are excluded.

### Upload authorization

Upload records now carry authenticated ownership. Private evidence categories are owner/admin protected on read and deletion is checked against the persisted record.

### Dealer health scoring

The historical weights totalled 1.20. The implementation now normalizes those relative weights to 1.0. Service/database failures now propagate rather than becoming positive synthetic scores. Undefined model helper calls were replaced with explicit service logic.

## Executed source gates

- Canonical CSRF source contract: PASS
- Registration/onboarding source gate: 46/46 PASS
- Canonical architecture: PASS
- Dependency security: PASS
- Supabase migration preflight: PASS with duplicate-definition warnings
- Changed JavaScript syntax: PASS
- Live CSRF runtime probe: BLOCKED (no live API target configured)

## Migration warning

The migration validator still reports duplicate table creation definitions for several domains, including vehicle identities, dealer payouts, communication tables, listing entitlement reservations, media upload jobs and financial workflow events. The validator explicitly requires a real PostgreSQL/Supabase reset as the next validation step. These were not blindly rewritten because migration history must be reconciled against the actual production schema.

## Certification boundary

This is a working candidate, not a final certified foundation.

The current audit environment provides Node 22.16.0 while the project requires Node >=22.22.2. Full runtime, build, Playwright, RLS, live Brevo and deployment certification therefore remain blocked.
