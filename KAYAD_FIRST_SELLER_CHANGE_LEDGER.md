# KAYAD First-Seller Change Ledger

**Date:** 14 October 2026  
**Foundation:** supplied Stage 3 archive, reported baseline `194cc807`  
**Change policy:** local-only; no commit, push, deploy, database access or provider side effect.

| File | Change | Defect / rationale | Test evidence | Contract impact / risk |
|---|---|---|---|---|
| `backend/services/communicationGateway.service.js` | Added `SECRET_BEARING_EVENTS` and `persistedDeliveryMetadata`; verification and password-reset deliveries omit persisted HTML/text/message bodies and mark `sensitiveBodyOmitted: true` | Prevent reusable bearer-equivalent token URLs from being stored in `communication_deliveries.metadata` | `scripts/validate-first-seller-launch-contract.mjs` 6/6; syntax check PASS; Jest tests added but not run | No API schema change. Delivery metadata shape changes for two sensitive event types. Generic retry body replay intentionally unavailable for those events; use existing resend/reset recovery flow. |
| `backend/controllers/authController.js` | Pending seller admin notifications emit `COMMUNICATION_EVENTS.DEALER_SUBMITTED`; source event retained as metadata and `sellerType` included | Resolve producer/rollout mismatch `seller.approval_pending` vs canonical `dealer.submitted` | Static launch contract 6/6; syntax check PASS; full gateway/admin notification runtime test not run | Event contract now uses existing canonical event ID. Requires staging rollout-control verification, especially for private sellers. |
| `backend/tests/communications/recordDelivery.test.js` | Added regression tests ensuring verification/reset raw token body is absent from persisted metadata | Prevent token leakage regression | Tests authored; not executed because Jest dependencies are not installed | Test-only; no production impact |
| `scripts/validate-registration-onboarding.mjs` | Updated stale string assertion from `Verification email failed` to the actual `Verification resend failed` diagnostic | Existing static gate falsely failed despite the resend path being asynchronous and the diagnostic being named differently | Validator now 47/47 PASS | Static validator only; does not change runtime behavior |
| `scripts/validate-first-seller-launch-contract.mjs` | Added new static regression guard for secret-body omission, canonical seller event and asynchronous registration delivery | Preserve this pass's critical contract corrections | 6/6 PASS | Static-only; no runtime proof |
| `KAYAD_FIRST_SELLER_LAUNCH_CERTIFICATION_REPORT.md` | Added consolidated release decision, workstream results, gate statuses, runtime evidence and owner actions | Required release artifact | Manually reconciled against command outputs and embedded Stage 3 report | Documentation only |
| `KAYAD_FIRST_SELLER_E2E_EVIDENCE_MATRIX.md` | Added per-criterion evidence status, environment and dependency | Prevent source inspection being confused with real E2E proof | Cross-checked against available validators and lack of runtime/provider tests | Documentation only |
| `KAYAD_COMMUNICATIONS_EVENT_CONTRACT.md` | Documented canonical event IDs, recipient/delivery semantics, webhook controls and sensitive token policy | Make event producer/control contract explicit | Cross-checked against event registry, gateway, rollout service and webhook route source | Documentation only; event fix itself listed above |
| `KAYAD_FIRST_SELLER_RELEASE_RUNBOOK.md` | Added local/staging/production safety boundaries, migration workflow, seller acceptance tests and recovery steps | Provide safe release execution steps without bypassing Stage 3 migration guard | Cross-checked against existing Stage 3 schema rehearsal runbook and source paths | Documentation only |

## Unchanged high-risk boundaries

- No migration under `supabase/migrations/` was edited, added, removed or reordered.
- No database SQL was executed and no schema was applied.
- No provider credentials, live email, SMS, WhatsApp, payment, test account or public listing was used.
- No frontend/visual redesign, parallel marketplace, mock inventory or new entitlement bypass was introduced.
- Existing Stage 3 `supabase db push` fail-closed safeguards remain intact.

## Verification boundary

The code changes have syntax checks and static source-contract evidence only. The new Jest regressions are not claimed as passed. Node runtime in this workspace is below the repository-pinned version and dependencies are absent; therefore full tests/builds must be rerun in the pinned environment before the package can be treated as a release candidate.
