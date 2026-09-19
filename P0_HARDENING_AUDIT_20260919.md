# KAYAD P0 Hardening Audit — 2026-09-19

Baseline: current fixed project tree corresponding to the post-`f64d51fa` dealer API convergence state.

## Scope

No product features are added. This pass closes structural/security gaps in the existing architecture.

## Completed in this hardening pass

1. Removed the duplicate `src/services/dealerPlatformApi.js`; `dealerPlatformApi.ts` remains the sole dealer API implementation.
2. Removed exact duplicate UI implementations where the active application already resolved to the flat/canonical surface:
   - `src/features/SupportView/components/SupportView.tsx`
   - `src/features/SupportView/components/SupportFAQ.tsx`
   - `src/features/DealersView/components/DealersView.tsx`
   - plus exact duplicate common/auction/dealer component copies already verified identical.
3. Updated feature index exports so those domains resolve to the canonical implementation.
4. Added a production migration that revokes `authenticated` execution of `public.kayad_resolve_dispute_atomic(...)`. This closes a live Supabase security-advisor finding for a SECURITY DEFINER financial RPC.
5. Applied the same privilege hardening to the live KAYAD Supabase project `ubvgixwhfybbyjuvxboj`.

## Current P0 findings requiring continued convergence

### Database/model truth

Static traversal from all mounted Express route modules reaches 446 backend modules. The central `backend/models/_base.js` table map contains 184 model-to-table mappings; 81 of the model tables reached by mounted-route code are not present in the 93 migration CREATE TABLE set.

These must be classified before any schema is added:

- obsolete/legacy route surface — remove/unmount;
- intentionally external/derived model — document and isolate;
- genuine reachable production dependency — reconcile against the real database schema.

Do not create tables merely to make dead platform code compile.

### Authorization

Mounted route modules must be certified at route level, including routes protected by router-wide middleware. Public routes are expected and should remain public only where their controller/data contract is intentionally public.

High-risk families requiring explicit certification include:

- dealer
- payments
- escrow
- disputes
- ledger
- finance/reconciliation
- inspection provider operations
- admin/platform control-plane
- webhook callbacks
- uploads
- organizations

### Financial idempotency/concurrency

Existing atomic SQL functions and idempotency middleware provide substantial protection. Continue certification for duplicate callbacks, concurrent transitions, partial provider/database failure, and ledger balance invariants. Do not add alternate financial state machines.

### Supabase RLS

Live production currently has RLS enabled on all inspected public tables. The Supabase security advisor reports 91 tables with RLS enabled but no policies. This is not automatically a vulnerability when those tables are intentionally service-role-only; however, every exposed client-facing table must be classified as either:

- intentionally service-role-only, or
- explicitly protected by least-privilege RLS policies.

A live security-advisor warning for `kayad_resolve_dispute_atomic` being executable by `authenticated` was closed in this pass.

### Webhook boundaries

Current provider webhooks have meaningful authentication controls (Resend signature, Twilio signature/shared secret, Africa's Talking/shared secret, M-Pesa IP/callback validation, SMS API key, inventory API key). The remaining inventory webhook gap is durable replay/idempotency protection for repeated identical payloads, especially listings without VINs. This should use the existing `webhook_events`/dedupe infrastructure rather than introducing a second webhook state machine.

## Next hardening sequence

1. Recompute the reachable route -> controller -> model -> real table matrix and classify all 81 missing mappings.
2. Produce a route-by-route authorization matrix for all mounted endpoints.
3. Certify all financial mutations against duplicate/retry/race/failure scenarios.
4. Classify every RLS-no-policy table as service-only or client-exposed and close only genuine exposure gaps.
5. Add durable inventory-webhook replay protection using the existing webhook event/dedupe infrastructure.
6. Add release-gate checks so duplicate implementations, unauthorized SECURITY DEFINER RPC grants, and newly reachable model/schema mismatches cannot return.

## 2026-09-19 verification pass

- P0 static gate: PASS.
- Financial failure-mode structural gate: 12/12 PASS.
- Transaction integrity: 14/14 PASS.
- Dispute integrity: 11/11 PASS.
- Wave 2 invariant gate: PASS.
- Live `kayad_validate_wave2_invariants()`: `pass=true`, with zero listing orphans, escrow violations, media dead letters, settlement violations, and dispute-resolution violations.
- Live dispute RPC privilege check: `authenticated=false`, `service_role=true`.
- Live zero-policy public tables: 91; direct `anon`/`authenticated` data privileges on that zero-policy set: 0 after hardening.
- Live security advisor: only the expected informational `rls_enabled_no_policy` finding remains for the intentionally service-only/no-policy tables.
- Inventory webhook now uses durable `webhook_events.dedupe_key` plus the existing service-role distributed lock RPC to serialize identical payload processing.

## Remaining P0 work

P0-A and the resource-level portion of P0-B are deliberately **not marked complete**. The reconciliation found 82 current model/table mappings absent from the migration-derived schema snapshot (the baseline was 81 before the live-schema refresh). These are mounted platform domains and cannot safely be bulk-deleted or given invented tables. They require domain-by-domain canonical schema decisions.

The authorization matrix structurally covers 922 mounted route declarations. Router-level authentication and role guards are represented, but owner/dealer-team/organization/inspector resource-scope certification still requires controller-by-controller proof and targeted authenticated-vs-cross-user tests.
