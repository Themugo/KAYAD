# KAYAD System and Module Boundaries

**Purpose:** Give incoming engineers a reliable map of the existing application without changing its architecture.

## Runtime topology

| Boundary | Canonical location | Responsibility |
|---|---|---|
| Frontend application | `src/` | React/Vite UI, customer journeys, feature surfaces, client-side API integration |
| Frontend entry and route surface | `src/main.tsx`, `src/App.tsx` | Application bootstrap and current route/navigation composition; verify before altering routing assumptions |
| Shared frontend components | `src/components/` and `src/components/features/` | Shared shell, UI components and feature-scoped components; prefer feature-canonical components where established |
| API client/services | `src/api/`, `src/services/` | Frontend transport and domain API calls |
| Backend runtime | `backend/bootstrap.js`, `backend/server.js` | Backend bootstrap and server wiring |
| Backend API | `backend/routes/`, `backend/controllers/`, `backend/services/` | HTTP contracts, request handling and business operations |
| Backend security | `backend/middleware/`, `backend/identity/`, `backend/governance/` | Authentication, authorization and privileged boundaries; inspect enforcement rather than trusting UI gating |
| Database source | `supabase/migrations/` | Ordered database schema and policy changes; do not rewrite applied history |
| Infrastructure | `.github/workflows/`, `Dockerfile.frontend`, `backend/Dockerfile`, `docker-compose.yml`, `k8s/`, `helm/` | CI, container and deployment definitions |
| Validation | `scripts/`, `e2e/`, `backend/tests/`, `load-tests/` | Static contracts, unit/integration checks, browser journeys and load validation |
| Historical evidence | `evidence/`, `docs/history/` | Prior outputs and audit trail; not proof that current production is healthy |

## Critical business and operational flow

1. **Identity and onboarding:** registration, session establishment, CSRF protection, role/ownership authorization and account status.
2. **Marketplace inventory:** vehicle data, listing ownership, moderation, media/documents, discovery and vehicle detail.
3. **Inspection and trust:** inspection booking/provider workflow, evidence/report lifecycle and authorization over private documents.
4. **Auction eligibility:** auction publication/setup, bidder registration and any required commitment/deposit.
5. **Bidding:** authenticated bid submission, server-side eligibility, auction state, concurrency control and idempotency.
6. **Winner and settlement:** auction close, winner payment, payment callbacks, ledger/escrow state and reconciliation.
7. **Fulfilment and ownership:** post-sale obligations, transfer/ownership authorization, exceptions, disputes and refunds/forfeitures where policy permits.
8. **Support and administration:** support case lifecycle, audit trail, narrowly scoped admin capabilities and operational intervention.
9. **Communications and observability:** provider adapters, webhook validation, retries/idempotency, logs, health checks and incident runbooks.

These are the business boundaries to protect during maintenance. A UI success state must not be treated as proof that a payment, ledger entry, ownership transfer or escrow transition committed in the database.

## Authority principles

- The backend and database enforce financial, identity, role, ownership and auction state transitions. Frontend controls are presentation, not authorization.
- Supabase/Postgres migrations and RLS policies are part of the security boundary. Review schema and policy effects together.
- Payment callbacks and webhooks must be authenticated, idempotent and safe to replay.
- A deployment is not complete until the deployed commit, frontend URL, API health and critical journeys are verified.
- Admin permissions should be capability-specific and auditable; do not grant broad authority as a shortcut.

## Canonical configuration

- Node runtime: `.nvmrc`, `.node-version`, `package.json`, `backend/package.json`.
- Root CI/deployment contracts: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.
- Frontend scripts/dependencies: root `package.json` and `package-lock.json`.
- Backend scripts/dependencies: `backend/package.json` and `backend/package-lock.json`.
- Environment variable examples: `.env.example`, `.env.production.example`, `backend/.env.example`. These are examples, not sources of real credentials.

## Do not infer

- Do not infer live service health from old evidence documents.
- Do not infer that a component is unused only because a filename is duplicated.
- Do not infer that a migration is safe to rerun or rollback without checking its applied status and data effects.
- Do not infer that the secondary `bun.lock` is authoritative: current README/CI use npm. Resolve package-manager policy explicitly before changing either lockfile.
