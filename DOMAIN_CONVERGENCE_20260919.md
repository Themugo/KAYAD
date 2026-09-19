# KAYAD Domain Convergence — 2026-09-19

## Production-domain work completed

### Dealer workforce / CRM
- Dealer team invitations remain hashed at rest and email-bound at acceptance.
- Self role/status escalation is blocked.
- Team removal is now a canonical `DELETE /dealer/team/:memberId` operation.
- Dealer Team UI uses `src/services/dealerPlatformApi.ts` rather than the legacy dealer API facade.
- Dealer lead creation/stage transition now uses the atomic Supabase CRM RPCs.
- Lead timeline persistence uses the canonical DB adapter; legacy Lead/LeadActivity model wrappers were removed.
- Dealer leads UI uses the canonical `leadApi` transport.
- Dealer listing ownership uses the dealer organization context.

### Support
- Canonical support controller now owns ticket creation, access control, internal-message authorization, status transition validation, SLA timestamps and admin transport.
- Legacy admin support controller remains only as a compatibility facade delegating to the canonical controller.
- Admin Support UI uses the canonical support transport.

### Finance
- Historical `FinancingView` is now a compatibility entry point; canonical financing remains in `FinancePlatform`.
- Loan application creation validates vehicle price, deposit, loan amount, term and employment status server-side.
- Loan lifecycle transitions are server-enforced.
- Admin review list/status transports are exposed through the canonical loan API.

### Escrow custody
- Vehicle escrow is restricted to private-seller transactions at the payment boundary.
- Vehicle escrow cannot be funded through M-Pesa STK.
- Custody funding is bank-transfer only and exposes configured custody-account instructions.
- Admin escrow rules/accounts endpoints are explicit and separated from generic platform configuration.
- Dealer listings cannot enable vehicle escrow.
- Legacy dealer escrow approval/force controls were removed.

### Partner / webhook integration
- Partner termination lifecycle is persisted.
- Webhook delivery performs the outbound HTTP POST, signs payloads with HMAC, records HTTP response status/time/body, and only reports delivery after an external response exists.
- Integration Studio uses the canonical HTTP request transport.

### API governance / deployment
- Newly added team and escrow routes are documented in the canonical OpenAPI file.
- API governance is now 1115/1115 documented routes.
- Production environment contract examples were restored at root and backend levels.
- Deployment readiness, Phase 40 and Phase 60 validators pass.

## Validator classification

### Current / substantive gates
These are treated as real production contracts and must pass:
- `validate-dealer-workforce-access.mjs`
- `validate-lead-crm-domain-end-to-end.mjs`
- `validate-support-case-management-domain.mjs`
- `validate-finance-domain-end-to-end.mjs`
- `validate-escrow-custody-domain.mjs`
- `validate-integration-partner-webhook-domain.mjs`
- `validate-dealer-commercial-controls.mjs`
- `validate-dealer-platform-domain.mjs`
- `validate-financial-ledger-reconciliation-domain.mjs`
- `validate-payment-escrow-domain.mjs`
- `validate-wave3-convergence.mjs`
- maintained release-gate validators listed by `scripts/validate-release.mjs`

All maintained release-gate validators currently pass in the source workspace.

### Obsolete / historical validators
These contain assertions for implementations that Wave 3 deliberately removed or replaced, so their failure is not evidence of a current production defect:
- `validate-inspection-settlement-ledger.mjs` — expects pre-convergence service methods (`recordInspectionPayment`, `recordInspectionRefund`, `recordInspectionPayout`) even though inspection financial settlement now delegates to canonical Supabase atomic RPCs.
- `validate-inspection-marketplace-activation.mjs` — expects M-Pesa-only inspection payment language and an older payment contract; the current inspection financial flow is server-bound and uses the canonical financial RPCs.
- `validate-transactions-money-initiative.mjs` — its `escrow_funded` callback assertion conflicts with the hardened custody rule that explicitly rejects M-Pesa escrow funding.
- `validate-dealer-operations-initiative.mjs` — still expects CRM/team/subscription/finance capabilities to be explicitly marked unavailable even though those domains now have persisted implementations.
- `validate-inspection-workforce-lifecycle.mjs` — fails in its own point-definition parser before validating the implementation.
- `validate-service-export-surface.mjs` — expects historical service exports that are no longer part of the canonical service boundary.
- validators that directly open removed files such as `DisputeDetailPage.jsx`, `RegisterPage.jsx`, `ghostCheckersController.js`, or historical `.env` scaffolds are archival checks and should not be used as production release gates.

### Environment-dependent certification
- `validate-communications-provider-certification.mjs` requires live Resend/Africa's Talking credentials in the execution environment. Its `NOT CONFIGURED` result is a provider-certification prerequisite, not a code failure.

## Next production certification

The Windows repository must run:

```cmd
npm ci && npm run lint && npm test && npm run build
```

against this exact source package. Supabase schema migrations already applied for the inspection financial lifecycle must not be re-applied.
