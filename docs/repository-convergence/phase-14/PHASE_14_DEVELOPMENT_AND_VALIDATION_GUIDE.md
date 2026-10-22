# Development and Validation Guide — Phase 14

## Repository-derived commands
The repository contains `package.json`; its scripts are: 

- `bootstrap:supabase:production`: `node scripts/bootstrap-supabase-production.mjs` (declared in package.json; not executed during Phase 14).
- `bootstrap:supabase:staging`: `node scripts/bootstrap-supabase-staging.mjs` (declared in package.json; not executed during Phase 14).
- `build`: `vite build` (declared in package.json; not executed during Phase 14).
- `certify:buyer-portal:staging`: `node scripts/certify-buyer-portal-staging-isolation-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `certify:phase4:lifecycle`: `node scripts/certify-phase4-lifecycle.mjs` (declared in package.json; not executed during Phase 14).
- `certify:phase5:browser-contract`: `node scripts/certify-phase5-browser-contract.mjs` (declared in package.json; not executed during Phase 14).
- `certify:phase6:live`: `node scripts/certify-phase6-live.mjs` (declared in package.json; not executed during Phase 14).
- `certify:v14:live-api`: `node scripts/certify-v14-live-api.mjs` (declared in package.json; not executed during Phase 14).
- `certify:v14:production-runtime`: `node scripts/certify-v14-production-runtime.mjs` (declared in package.json; not executed during Phase 14).
- `clean`: `node scripts/clean.mjs` (declared in package.json; not executed during Phase 14).
- `dev`: `vite --port=3000 --host=0.0.0.0` (declared in package.json; not executed during Phase 14).
- `lint`: `tsc --noEmit` (declared in package.json; not executed during Phase 14).
- `normalize:supabase-migrations`: `node scripts/normalize-supabase-migrations.mjs --write` (declared in package.json; not executed during Phase 14).
- `preview`: `vite preview` (declared in package.json; not executed during Phase 14).
- `test`: `vitest run` (declared in package.json; not executed during Phase 14).
- `test:http:stage5f10`: `node runbooks/stage5f10-private-seller-custody-20261020/http/stage5f10_http_e2e.mjs` (declared in package.json; not executed during Phase 14).
- `test:pg:stage5f10`: `node runbooks/stage5f10-private-seller-custody-20261020/pg/stage5f10_gate_pg.mjs` (declared in package.json; not executed during Phase 14).
- `test:ui:stage5f10`: `node runbooks/stage5f10-private-seller-custody-20261020/ui/ui_5f10.mjs` (declared in package.json; not executed during Phase 14).
- `test:watch`: `vitest` (declared in package.json; not executed during Phase 14).
- `typecheck`: `tsc --noEmit` (declared in package.json; not executed during Phase 14).
- `validate:admin-logo-identity`: `node scripts/validate-stage25-admin-logo-identity-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:admin-route-convergence`: `node scripts/validate-admin-route-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:api-availability`: `node scripts/validate-api-availability.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-360-hardening-20261007`: `node scripts/validate-auction-360-hardening-20261007.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-bid-surface`: `node scripts/validate-auction-bid-surface.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-domain-integrity`: `node scripts/validate-auction-domain-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-phase-a-financial-integrity`: `node scripts/validate-auction-phase-a-financial-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-phase10`: `node scripts/validate-auction-phase10.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-phase7`: `node scripts/validate-auction-phase7.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-phase8`: `node scripts/validate-auction-phase8.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-phase9`: `node scripts/validate-auction-phase9.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-public-error-states`: `node scripts/validate-auction-public-error-states.mjs` (declared in package.json; not executed during Phase 14).
- `validate:auction-transport-convergence`: `node scripts/validate-auction-transport-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:automation-domain-v12`: `node scripts/validate-automation-domain-v12.mjs` (declared in package.json; not executed during Phase 14).
- `validate:backend-boot`: `node scripts/validate-backend-boot.mjs` (declared in package.json; not executed during Phase 14).
- `validate:backend-runtime-contracts`: `node scripts/validate-backend-runtime-contracts.mjs` (declared in package.json; not executed during Phase 14).
- `validate:brand-palette-convergence`: `node scripts/validate-brand-palette-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:business-command-centre-phase04`: `node scripts/validate-business-command-centre-phase04.mjs` (declared in package.json; not executed during Phase 14).
- `validate:buyer-portal-boundaries`: `node scripts/validate-buyer-portal-boundaries-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:c1-c5-convergence`: `node scripts/validate-c1-c5-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:canonical-architecture`: `node scripts/validate-canonical-architecture.mjs` (declared in package.json; not executed during Phase 14).
- `validate:chat-convergence`: `node scripts/validate-chat-surface-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:cms-schema`: `node scripts/validate-cms-schema.mjs` (declared in package.json; not executed during Phase 14).
- `validate:code-splitting`: `node scripts/validate-code-splitting.mjs` (declared in package.json; not executed during Phase 14).
- `validate:communications`: `node scripts/validate-communications-initiative.mjs` (declared in package.json; not executed during Phase 14).
- `validate:communications:providers`: `node scripts/validate-communications-provider-certification.mjs` (declared in package.json; not executed during Phase 14).
- `validate:csrf-route`: `node scripts/validate-canonical-csrf-route.mjs` (declared in package.json; not executed during Phase 14).
- `validate:database-contract-alignment`: `node scripts/validate-database-contract-alignment.mjs` (declared in package.json; not executed during Phase 14).
- `validate:dealer-modal-convergence`: `node scripts/validate-dealer-modal-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:dependency-security`: `node scripts/validate-dependency-security.mjs` (declared in package.json; not executed during Phase 14).
- `validate:deployment-readiness`: `node scripts/validate-deployment-readiness.mjs` (declared in package.json; not executed during Phase 14).
- `validate:deployment-runtime-drift`: `node scripts/validate-deployment-runtime-drift.mjs` (declared in package.json; not executed during Phase 14).
- `validate:dispute-integrity`: `node scripts/validate-dispute-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:domain-lifecycle-integrity`: `node scripts/validate-domain-lifecycle-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:email-only-launch`: `node scripts/validate-email-only-launch.mjs` (declared in package.json; not executed during Phase 14).
- `validate:email-reliability`: `node scripts/validate-email-reliability.mjs` (declared in package.json; not executed during Phase 14).
- `validate:escrow-live-operations-scenarios`: `node scripts/validate-escrow-live-operations-scenarios.mjs` (declared in package.json; not executed during Phase 14).
- `validate:explicit-auth-flows`: `node scripts/validate-explicit-auth-flows.mjs` (declared in package.json; not executed during Phase 14).
- `validate:financial-audit-rls-hardening`: `node scripts/validate-financial-audit-rls-hardening.mjs` (declared in package.json; not executed during Phase 14).
- `validate:financial-ledger-reconciliation-domain`: `node scripts/validate-financial-ledger-reconciliation-domain.mjs` (declared in package.json; not executed during Phase 14).
- `validate:financial-ledger-sign-convergence`: `node scripts/validate-financial-ledger-sign-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:foundation-integrity`: `node scripts/validate-foundation-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:frontend-runtime-contracts`: `node scripts/validate-frontend-runtime-contracts.mjs` (declared in package.json; not executed during Phase 14).
- `validate:hero-admin-control`: `node scripts/validate-hero-admin-control.mjs` (declared in package.json; not executed during Phase 14).
- `validate:hero-mobile-assets`: `node scripts/validate-hero-mobile-assets.mjs` (declared in package.json; not executed during Phase 14).
- `validate:high-risk-boundaries`: `node scripts/validate-high-risk-boundaries.mjs` (declared in package.json; not executed during Phase 14).
- `validate:homepage-convergence`: `node scripts/validate-homepage-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:inspection-domain-rls-enablement`: `node scripts/validate-inspection-domain-rls-enablement.mjs` (declared in package.json; not executed during Phase 14).
- `validate:inspection-marketplace`: `node scripts/validate-inspection-marketplace.mjs` (declared in package.json; not executed during Phase 14).
- `validate:inspection-qa-contract`: `node scripts/validate-inspection-qa-contract.mjs` (declared in package.json; not executed during Phase 14).
- `validate:live-runtime`: `node scripts/validate-live-runtime.mjs` (declared in package.json; not executed during Phase 14).
- `validate:local-runtime`: `node scripts/validate-local-runtime.mjs` (declared in package.json; not executed during Phase 14).
- `validate:lucide-icon-exports`: `node scripts/validate-lucide-icon-exports.mjs` (declared in package.json; not executed during Phase 14).
- `validate:marketplace-core`: `node scripts/validate-marketplace-initiative.mjs` (declared in package.json; not executed during Phase 14).
- `validate:master-identity-authz-corrections`: `node scripts/validate-master-identity-authz-corrections.mjs` (declared in package.json; not executed during Phase 14).
- `validate:master-polish-regression`: `node scripts/validate-stage-master-polish-regression-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:messaging-notification-surface`: `node scripts/validate-messaging-notification-surface-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:migration-hygiene`: `node scripts/validate-migration-hygiene.mjs` (declared in package.json; not executed during Phase 14).
- `validate:mobile-navigation-polish`: `node scripts/validate-mobile-navigation-polish-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:navigation-convergence`: `node scripts/validate-navigation-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:next6-polish`: `node scripts/validate-next6-polish.mjs` (declared in package.json; not executed during Phase 14).
- `validate:next7-polish`: `node scripts/validate-next7-polish.mjs` (declared in package.json; not executed during Phase 14).
- `validate:owner-identity-convergence`: `node scripts/validate-owner-identity-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:passport-authorization`: `node scripts/validate-passport-authorization.mjs` (declared in package.json; not executed during Phase 14).
- `validate:payment-escrow-domain`: `node scripts/validate-payment-escrow-domain.mjs` (declared in package.json; not executed during Phase 14).
- `validate:payment-gateway-lifecycle`: `node scripts/validate-payment-gateway-lifecycle.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase06:departments`: `node scripts/validate-phase06-department-capabilities.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase14`: `node scripts/validate-phase14.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase3-infrastructure`: `node scripts/validate-phase3-infrastructure.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase34`: `node scripts/validate-phase34.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase35`: `node scripts/validate-phase35.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase36`: `node scripts/validate-phase36.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase37`: `node scripts/validate-phase37.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase38`: `node scripts/validate-phase38.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase39`: `node scripts/validate-phase39.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase39-deployment-security`: `node scripts/validate-phase39-deployment-security.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase4-transaction-certification`: `node scripts/validate-phase4-transaction-certification.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase40`: `node scripts/validate-phase40.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase5-e2e`: `node scripts/validate-phase5-e2e.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase58`: `node scripts/validate-phase58.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase59`: `node scripts/validate-phase59.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase6-release`: `node scripts/validate-phase6-release.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase60`: `node scripts/validate-phase60.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase7-security-release`: `node scripts/validate-phase7-security-release.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phase8-operations`: `node scripts/validate-phase8-operations.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phaseC-soft-delete`: `node scripts/validate-phaseC-soft-delete-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:phaseC1-runtime-integrity`: `node scripts/validate-phaseC1-runtime-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:polish-regressions`: `node scripts/validate-polish-regressions.mjs` (declared in package.json; not executed during Phase 14).
- `validate:premium-auth-surfaces`: `node scripts/validate-premium-auth-surfaces.mjs` (declared in package.json; not executed during Phase 14).
- `validate:premium-presentation-pass`: `node scripts/validate-premium-presentation-pass.mjs` (declared in package.json; not executed during Phase 14).
- `validate:premium-sell-auth-public-convergence`: `node scripts/validate-premium-sell-auth-public-convergence-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:private-upload-cache`: `node scripts/validate-private-upload-cache.mjs` (declared in package.json; not executed during Phase 14).
- `validate:production-backend`: `node scripts/validate-production-backend.mjs` (declared in package.json; not executed during Phase 14).
- `validate:production-optional-integrations`: `node scripts/validate-production-optional-integrations.mjs` (declared in package.json; not executed during Phase 14).
- `validate:production-runtime-corrections`: `node scripts/validate-production-runtime-corrections.mjs` (declared in package.json; not executed during Phase 14).
- `validate:production-verifier-contract`: `node scripts/validate-production-verifier-contract.mjs` (declared in package.json; not executed during Phase 14).
- `validate:public-auto-services-boundary`: `node scripts/validate-public-auto-services-boundary-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:public-escrow-boundary`: `node scripts/validate-public-escrow-boundary.mjs` (declared in package.json; not executed during Phase 14).
- `validate:public-facing-convergence`: `node scripts/validate-public-facing-convergence-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:public-financing-boundary`: `node scripts/validate-public-financing-boundary-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:public-support-surface`: `node scripts/validate-public-support-surface.mjs` (declared in package.json; not executed during Phase 14).
- `validate:pwa-mobile`: `node scripts/validate-pwa-mobile-contract.mjs` (declared in package.json; not executed during Phase 14).
- `validate:recovery`: `node scripts/validate-recovery-repair.mjs` (declared in package.json; not executed during Phase 14).
- `validate:refresh-reuse-integrity`: `node scripts/validate-refresh-reuse-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:registration-onboarding`: `node scripts/validate-registration-onboarding.mjs` (declared in package.json; not executed during Phase 14).
- `validate:registration-role-matrix`: `node scripts/validate-registration-role-matrix.mjs` (declared in package.json; not executed during Phase 14).
- `validate:release`: `node scripts/validate-release.mjs` (declared in package.json; not executed during Phase 14).
- `validate:response-lifecycle`: `node scripts/validate-response-lifecycle.mjs` (declared in package.json; not executed during Phase 14).
- `validate:runtime-convergence`: `node scripts/validate-runtime-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:runtime-deep-v11`: `node scripts/validate-runtime-deep-v11.mjs` (declared in package.json; not executed during Phase 14).
- `validate:runtime-integrity`: `node scripts/validate-runtime-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:session-availability`: `node scripts/validate-session-availability.mjs` (declared in package.json; not executed during Phase 14).
- `validate:socket-contract`: `node scripts/validate-socket-contract.mjs` (declared in package.json; not executed during Phase 14).
- `validate:stage24-theme-convergence`: `node scripts/validate-stage24-theme-convergence-20261012.mjs` (declared in package.json; not executed during Phase 14).
- `validate:stage34-showroom-icons`: `node scripts/validate-stage34-showroom-icons.mjs` (declared in package.json; not executed during Phase 14).
- `validate:stage35-home-hero-pair`: `node scripts/validate-stage35-home-hero-pair.mjs` (declared in package.json; not executed during Phase 14).
- `validate:stage5f10-private-seller-gate`: `node scripts/validate-stage5f10-private-seller-gate.mjs` (declared in package.json; not executed during Phase 14).
- `validate:stage5f2-dashboard-data-workflow`: `node scripts/validate-stage5f2-dashboard-data-workflow.mjs` (declared in package.json; not executed during Phase 14).
- `validate:stage5f6-buyer-convergence`: `node scripts/validate-stage5f6-buyer-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:stage5f7-private-auction-contract`: `node scripts/validate-stage5f7-private-auction-contract.mjs` (declared in package.json; not executed during Phase 14).
- `validate:startup-convergence`: `node scripts/validate-startup-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:subscription-domain`: `node scripts/validate-subscription-domain-e2e.mjs` (declared in package.json; not executed during Phase 14).
- `validate:supabase-migrations`: `node scripts/validate-supabase-migrations.mjs` (declared in package.json; not executed during Phase 14).
- `validate:transaction-integrity`: `node scripts/validate-transaction-integrity.mjs` (declared in package.json; not executed during Phase 14).
- `validate:transactions-money-initiative`: `node scripts/validate-transactions-money-initiative.mjs` (declared in package.json; not executed during Phase 14).
- `validate:ui-surface-convergence`: `node scripts/validate-ui-surface-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:v14-production-activation`: `node scripts/validate-v14-production-activation.mjs` (declared in package.json; not executed during Phase 14).
- `validate:v14:holistic`: `node scripts/validate-v14-holistic.mjs` (declared in package.json; not executed during Phase 14).
- `validate:v14:live-certification-contract`: `node scripts/validate-v14-live-certification-contract.mjs` (declared in package.json; not executed during Phase 14).
- `validate:v14:next-phase`: `node scripts/validate-v14-next-phase.mjs` (declared in package.json; not executed during Phase 14).
- `validate:v14:release-candidate`: `node scripts/validate-v14-release-candidate.mjs` (declared in package.json; not executed during Phase 14).
- `validate:v14:runtime-preflight`: `node scripts/validate-v14-runtime-preflight.mjs` (declared in package.json; not executed during Phase 14).
- `validate:vercel-ci`: `node scripts/validate-vercel-ci-contract.mjs` (declared in package.json; not executed during Phase 14).
- `validate:wave2-invariants`: `node scripts/validate-wave2-invariants.mjs` (declared in package.json; not executed during Phase 14).
- `validate:wave3-convergence`: `node scripts/validate-wave3-convergence.mjs` (declared in package.json; not executed during Phase 14).
- `validate:worker-runtime`: `node scripts/validate-worker-runtime.mjs` (declared in package.json; not executed during Phase 14).
- `verify:backup`: `node scripts/verify-backup-artifact.mjs` (declared in package.json; not executed during Phase 14).
- `verify:production`: `node scripts/verify-production-deployment.mjs` (declared in package.json; not executed during Phase 14).

## Runtime versions
Check `.node-version` and `.nvmrc` in the repository for the declared runtime. Phase 14 did not execute the app build, typecheck, unit/integration suites, Playwright/browser journeys, database/RLS checks, or payment tests. Therefore this guide does not claim those commands currently pass.

## Safe validation sequence for a future approved implementation
1. Verify the exact checkpoint SHA-256 and ZIP integrity.
2. Install dependencies using the repository's lockfile and documented package manager, after reviewing package scripts.
3. Run only the targeted validation relevant to the authorized change.
4. Run broader tests only when approved and environment requirements are satisfied.
5. Capture logs, exit codes, environment version details, and test scope.
6. Never point test commands at production data or mutate production as part of repository cleanup.

## Environment handling
Inspect `.env.example` and `.env.production.example` for variable names only. Do not copy actual secrets into this guide or commit local environment files. Required/optional status must be established from code/configuration and runtime evidence, not inferred from names alone.
