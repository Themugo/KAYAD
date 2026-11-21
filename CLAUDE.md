# KAYARD KE — repository guidance

## Architecture (verified 2026-11-21)
* Frontend: React 19 + Vite + TypeScript (`src/`), tests with Vitest (`src/__tests__`). Backend: Express ESM (`backend/`), data through Supabase/PostgREST via `getSupabase()` and a Mongo-compat model shim (`backend/models/_base.js`, `backend/db/index.js`). Jest (`--experimental-vm-modules`), backend Vitest and `node:test`. Redis for limiting/idempotency. Deploy targets Vercel (web) and Render (API). Schema is `supabase/migrations/` (forward-only).
* Cookie sessions with CSRF (`/api/v1/auth/csrf`, send `x-csrf-token` and `x-xsrf-token`).

## Non-negotiable rules
* One **unified personal account** (`role=user`: buy and sell). Never reintroduce `individual_seller` as a self-registration role; keep legacy `individual_seller` accounts working. Dealers are a separate business identity with their own verification and authorisation.
* **Money:** the browser never supplies an authoritative amount. Amounts come from server state (listing price, auction winner, or the accepted-offer settlement). Do not weaken payment, escrow, ledger or permission controls. `payments.amount` is whole KES (bigint).
* Offers: accepting an offer opens `marketplace_offer_settlements` (one active per vehicle); a DB trigger on `payments` enforces buyer and amount. Pay through `POST /api/leads/:leadId/offers/:offerId/pay` (phone only).
* `Model.aggregate()` runs `models/aggregateEngine.js` over a paged full read and THROWS on any unsupported stage/operator (never silently ignores). It is an in-memory scan: for money or large tables prefer SQL/RPC. Reconciliation issues live in `reconciliation_reports.issues` (JSONB) and are read only through `kayad_reconciliation_issue_rows`.
* One canonical implementation per capability; do not delete code without dependency analysis. Preserve the approved homepage (do not reactivate obsolete hero CTA controls without owner confirmation).
* **Never**: apply hosted migrations, write production data, deploy, commit/push without explicit authorisation, reset or force-push. Hosted Supabase access is read-only SELECT.

## Running things
* Backend jest alone (parallel runs OOM): `cd backend && node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2`. Do not run frontend suites at the same time.
* Frontend: `npm test`, `npm run typecheck`, `npm run build`. Validators: `scripts/validate-*.mjs`.
* DB journeys (disposable DB, no secrets): `ci/db-journeys/run.sh` (see `docs/handover/NEXT-PHASE-20261121/CI-DB-JOURNEYS.md`). Journeys refuse non-loopback hosts and non-`kayad_*` databases.
* After a migration changes a function signature, reload PostgREST (`NOTIFY pgrst, 'reload schema'`).

## Status labels in handovers
VERIFIED (executed, with evidence) / FAILED / BLOCKED (needs credentials or infra) / NOT TESTED. Do not claim release readiness while critical blockers remain.
