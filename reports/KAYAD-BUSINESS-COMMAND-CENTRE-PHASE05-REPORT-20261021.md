# KAYAD Business Command Centre — Phase 05 Report

Date: 2026-10-21
Status: **Source checkpoint prepared; runtime certification blocked**

## Foundation and integrity

Foundation archive: `KAYAD-BUSINESS-COMMAND-CENTRE-PHASE04-APPROVAL-CONVERGENCE-20261021.zip`

Verified SHA-256: `d4f9e661f8370c8552b212dba5b501a152dc83bd2650277333af51ac55c47e08`

The archive hash was computed before extraction and matched the Phase 04 checkpoint hash. Work was performed in an extracted copy. No deployment, production probe, message send, payment attempt, database migration, or production data mutation was performed.

## Discovery: source-to-status matrix

| Service/domain | Existing source evidence | What can be claimed | What cannot be claimed yet |
|---|---|---|---|
| Application/API | `/health` and shared health registration; timestamps and aggregate status | Request path returned health payload at its timestamp | Sustained uptime/SLO without monitoring history |
| Supabase/database | Health route performs a minimal `cars` head/count query | Database query succeeded or failed at check time | General database performance or all-table readiness |
| Redis | Health route checks ready state and performs `PING` | Redis responded to a non-destructive ping | Cache hit quality or queue processing correctness |
| Cache | `cacheService.getStats()` / enabled flag | Cache is enabled and reports local stats | End-to-end cache correctness |
| Communications schema/ledger | `checkCommunicationReadiness()` and `communication_deliveries` records | Schema readiness and recorded delivery outcomes | Mailbox placement or provider connectivity from config alone |
| Brevo | `BREVO_API_KEY` plus sender configuration presence; delivery ledger | Configuration presence; historical recorded attempts | Connected, accepted, delivered or mailbox-received without appropriate provider/webhook evidence |
| Africa's Talking | `AT_API_KEY` + `AT_USERNAME`; delivery ledger | Configuration presence and recorded delivery outcomes | Live SMS connectivity without an approved non-production probe or provider response |
| Twilio WhatsApp | Account SID, auth token and WhatsApp sender presence; ledger | Configuration presence and recorded outcomes | Live WhatsApp connectivity or delivery based only on environment variables |
| M-Pesa/Daraja | Existing payment settings/provider config | Credential/configuration presence where the defined env variables exist | Payment provider connectivity; no STK/payment was initiated |
| Object/document storage | No universal, safe storage probe was found in the audited surface | Unknown unless a dedicated existing storage probe reports evidence | Connected/healthy based on configuration alone |
| Background jobs/queues | Existing health surface does not provide a complete end-to-end worker heartbeat matrix | Unknown unless a worker-specific heartbeat is returned | Jobs healthy based on process health alone |

The detailed health route is protected by `protect` and `adminOnly`. Provider fields added there contain only booleans and non-secret labels; no credential values are returned. The public health surface remains unsuitable for sensitive operational detail.

## Status semantics

- **Operational / healthy:** a live health probe returned success for the specific component.
- **Degraded:** a component returned a partial failure or a readiness check identified a schema problem.
- **Unavailable / failed:** an attempted probe failed or timed out; no secrets or raw provider payloads should be surfaced.
- **Disconnected / not configured:** required configuration is absent. This describes configuration, not a failed live connectivity probe.
- **Configured only:** required environment settings are present. This does not prove connectivity or delivery.
- **Unknown:** there is no sufficient current evidence, no delivery attempts, a stale/missing timestamp, or a probe was not run.

Delivery-ledger success rates are now `null` when there are no attempts (the UI renders `N/A`, not a fabricated 0%). Providers are included in the provider-health response even when no delivery rows exist. The status remains `unknown` when there is only configuration and no delivery evidence. The endpoint does not send messages or initiate payments.

## Changes

1. `src/pages/admin/components/AdminPlatformHealth.jsx`
   - Removed invented Live Auctions, Pending Escrows and Alerts counts from the health component.
   - Replaced default-green interpretations with evidence-based status labels and `Unknown` when data is absent.
   - Displays the source timestamp only when supplied, includes loading/error/unavailable states and an optional disabled-during-load retry control.
   - Explicitly states that configuration is not proof of connectivity/delivery.

2. `src/pages/admin/AdminCommunications.jsx`
   - Provider health is labelled as evidence, not a live connectivity probe.
   - Shows configuration presence, ledger evidence type, status, last-check timestamp, failed/bounced/dead-letter counts and N/A for missing success-rate evidence.
   - No empty provider list is presented as healthy.
   - Added request sequence protection so an older refresh cannot overwrite the newest result, plus safe server-returned error preference.

3. `backend/services/communicationControl.service.js`
   - Reports configured known providers even when the delivery ledger is empty.
   - Adds `status`, `evidence`, `checkedAt`, `lastAttemptAt` and null success rate when no attempts exist.
   - Distinguishes configuration-only evidence from delivery-ledger evidence. Does not claim connectivity and does not invoke provider adapters.

4. `backend/routes/healthRoutes.js`
   - Protected detailed health response reports non-secret configuration booleans for Brevo, Africa's Talking, Twilio WhatsApp and M-Pesa.
   - M-Pesa is explicitly marked `not_run_no_transaction`; the health check does not trigger a payment.
   - Unknown communications readiness now degrades aggregate health instead of leaving a default-green aggregate.

5. `scripts/validate-phase05-system-health.mjs`
   - Added source-contract checks for status semantics, timestamp use, no invented metrics, refresh race protection, no-attempt N/A behavior, provider config-only evidence and secret non-disclosure.

## Security/redaction review

- No API keys, tokens, passkeys, message bodies, recipients, phone numbers, payment payloads or raw provider response objects are added to the health response.
- No external provider calls were introduced to the health page.
- Existing sender adapters may log recipient-related values on retry in their current implementation; that pre-existing behavior is outside this phase's changes and should be separately reviewed/redacted before broader operational log access.
- `/health/detailed` remains admin-only. Do not expose its memory/cache/provider configuration detail publicly.
- The provider ledger provides historical delivery evidence, not a live provider connection probe. Status remains unknown when the evidence is insufficient.

## Validation results

Passed:

- `node --check backend/services/communicationControl.service.js`
- `node --check backend/routes/healthRoutes.js`
- `node scripts/validate-phase05-system-health.mjs` — 13/13
- `node scripts/validate-communications-initiative.mjs` — PASS
- `node scripts/validate-ui-surface-convergence.mjs` — 9/9
- `node scripts/validate-navigation-convergence.mjs` — 43/43
- `node scripts/validate-stage5f2-dashboard-data-workflow.mjs` — 11/11
- `node scripts/validate-owner-identity-convergence.mjs` — 7/7
- `node scripts/validate-master-identity-authz-corrections.mjs` — 14/14
- `node scripts/validate-canonical-architecture.mjs` — PASS

Blocked / not certified:

- `npm test -- --run src/__tests__/features/automotive/adminProviderGovernance.test.tsx`: blocked, `vitest: not found` (dependencies not installed).
- `node --test backend/tests/communications/providerHealthDeadLetter.test.js`: blocked by missing `@jest/globals` package.
- `node scripts/validate-communications-provider-certification.mjs`: correctly reports email/SMS not configured in this execution environment; certification assertion cannot pass without provider credentials. No live provider call was attempted.
- Typecheck, Vite production build, full API runtime tests and browser tests remain blocked because project dependencies are absent and available Node is v22.16.0, below the project's required v22.22.2.
- Live Brevo, Africa's Talking, Twilio, M-Pesa, storage and background-worker tests were not run. No secrets were requested or printed.

## Remaining instrumentation plan

1. Add authenticated, timeout-bounded, read-only provider metadata probes only where vendor APIs support safe account/health reads. Keep them separate from message/payment paths and feature-gate them.
2. Add a worker heartbeat table/endpoint with freshness threshold and per-worker last-success timestamps; do not infer worker health from API process health.
3. Define a storage readiness probe that checks access to a dedicated health object/path without reading user documents or mutating production data.
4. Wire the canonical platform-health endpoint to the Command Centre using explicit loading/error states. The legacy `AdminPlatformHealth` component has been hardened, but its usage must be confirmed against the active command-centre composition before claiming that this component is the production health view.
5. Add adapter contract tests using mocked provider HTTP responses, and run isolated sandbox certification only after explicit environment approval.
6. Redact recipient/phone fields from existing provider retry logs; keep provider error messages allowlisted and bounded.
7. Add an isolated database test for delivery status aggregation and `lastAttemptAt` across real schema field naming (`createdAt`/`created_at`).

## Release decision

**Not production-certified.** This is a source checkpoint with passing source-contract/regression validators. Runtime, integration and browser certification remain blocked. No production data mutation, message send, payment attempt or deployment occurred.
