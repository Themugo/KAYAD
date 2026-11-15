# KAYAD Master Audit & Repair Report — R22
**Baseline:** `KAYAD-MESSAGING-AUDITED-2026-11-14-R21.zip`  
**Audit date:** 14 November 2026  
**Scope:** Seller ownership, admin authority, vehicle publication/visibility/cache, registration/onboarding, auction/payment/escrow, communications/workers, frontend/backend build certification.

## Executive result
R22 contains a material seller-ownership boundary repair and refreshed source-contract validators. Thirty-six focused source validators passed after the changes. Changed JavaScript files pass Node syntax checks.

This is **not a production certification**. The archive does not contain installed application dependencies or live credentials. Full frontend typecheck/build, backend Jest/Vitest suites, provider delivery tests, live database/RLS checks, payment-provider UAT, and deployed worker verification remain outstanding. No production database, provider account, Git remote, or deployment was changed.

## 1. Dealer and personal-seller ownership isolation

### R22 repair
The prior seller middleware admitted all staff roles to seller write routes via `dealerOnly()`. The controller then used `canManageAnyListing()` as a cross-owner bypass for update, delete and photo mutations. This meant a staff account with `MANAGE_CARS` could potentially mutate another seller's inventory through the generic `/api/v1/cars/:id` owner routes, despite the dedicated admin deletion route already refusing that action.

Changes:
- `backend/middleware/sellerCapability.js`: staff can retain permitted read access, but write requests through seller inventory routes now return `403 LISTING_OWNER_ACTION_REQUIRED`.
- `backend/controllers/carController.js`: generic update/delete/photo mutation paths now require the listing owner; only the explicitly provisioned `effectiveRole === "webhoist"` break-glass identity retains the cross-owner override. Staff moderation remains on the dedicated admin moderation endpoint.
- Regression expectations updated in `listingDeletionGuard.test.js`, `stage1ListingWriteBoundaries.test.js`, and `phase13eSellerCapability.test.js`.
- Added `validate:seller-ownership-write-boundary`.

The owner relationship remains the canonical `cars.dealer` user ID. Dealer team delegation remains a separate owner-authorized domain and is not replaced by this generic listing guard.

### Existing controls retained
- Personal accounts use role `user`; private selling is a capability, not a separate buyer account.
- Email verification is required for personal seller actions.
- Default private-seller approval is disabled and package mode is free.
- Explicit capability suspension/revocation remains enforceable.
- Dealer accounts remain separate business identities and continue through dealer verification/eligibility controls.
- A seller's own inventory is loaded using the authenticated owner ID.

### Remaining live certification
Run two personal accounts and two dealer accounts against staging: attempt cross-owner read, update, image upload/delete, listing deletion, team delegation and direct API identifier substitution. Confirm all unauthorized attempts return 403/404 and do not mutate rows or storage.

## 2. Admin seller management and moderation permissions

- `AdminSellers` is a dealer/commercial-account workspace; the list is server-filtered to dealer accounts, with a separate legacy/future applicant filter.
- Dealer approval/suspension is distinct from listing moderation.
- The admin listing deletion endpoint explicitly returns `403 LISTING_OWNER_ACTION_REQUIRED`; platform administrators may moderate/hide but may not remove a seller's vehicle from the seller's business inventory.
- Admin listing page does not expose a delete action.
- Listing moderation remains a dedicated route protected by `requireDecisionAuthority("listing")`; the policy supports `owner_only` and `admins`. Current default is `owner_only`, so ordinary admins are not automatically granted moderation decision authority unless the system owner changes the policy.
- Seller account removal/suspension must not be confused with deletion of the user's business listings. Account-deletion guardrails and financial/auction constraints still apply.

### Important configuration note
Do not change the default decision authority to `admins` as an incidental code repair. If the business wants ordinary administrators to approve/hide listings, the verified platform owner must explicitly configure that policy and grant the appropriate moderation permission. This preserves least privilege.

## 3. Vehicle publication, visibility and cache invalidation

Source review and existing validators confirm:
- Seller publication is server-derived; client-submitted `status` is not trusted.
- Personal sellers can self-publish in free mode after email verification, subject to suspension/revocation.
- Dealers require the dealer verification/onboarding guard and their separate commercial entitlement rules.
- Public inventory starts from `status: available` and excludes soft-deleted listings.
- Single-listing visibility middleware rejects hidden, pending, draft and soft-deleted listings.
- Admin moderation uses `available`/`hidden` rather than unsupported `rejected` database status.
- Create/delete/admin moderation paths invalidate public listing/search/facet caches; seller write routes also run cache invalidation middleware.
- Public projections are allowlisted rather than exposing raw database rows.

### Remaining live certification
Check the real Supabase rows and deployed cache provider after create, edit, hide, approve, sold, owner delete and soft delete. Verify search, featured inventory, detail pages, facets, autocomplete, service worker/CDN cache and mobile app all converge immediately. Source validators cannot prove that the deployed Redis/CDN/Supabase state matches the archive.

## 4. Registration, onboarding and account lifecycle

Source-contract validators passed for:
- Unified personal-account role matrix.
- Registration and onboarding lifecycle.
- Email verification gate.
- Dealer onboarding and verification lifecycle.
- Private-seller free-access defaults.
- Owner identity and governance lifecycle.

Policy retained:
- Personal registration is free and not subject to seller package or private-seller approval by default.
- Email verification remains separate from account access.
- Dealer onboarding remains a separate business account and retains its verification requirements.
- Future paid packages and approval controls remain configurable but are not activated by a missing/partial configuration.
- Suspended/revoked identities and seller capabilities remain blocked.

### Remaining live certification
Run real registration, email verification, login, logout, refresh-token reuse, password recovery, account suspension/reinstatement, dealer onboarding and account deletion against staging. Confirm duplicate/concurrent registration and role-escalation attempts are rejected.

## 5. Auction, payment and escrow lifecycle

Source validators passed for auction-domain integrity, auction financial integrity, payment/escrow domain, payment gateway lifecycle, transaction integrity, database integration contract, escrow business integrity and escrow live-operation scenario contracts.

The source includes dedicated lifecycle services and database RPC/migration contracts for auction setup/publication, bidder eligibility, bid mutation, winner payment deadline, settlement, escrow custody, refund and reconciliation. These checks are evidence of source-level contracts only.

### Remaining live certification
Not certified in this archive-only environment:
- Provider-confirmed M-Pesa STK initiation, callbacks and callback signature/allowlist behavior.
- Duplicate, delayed, replayed and out-of-order callbacks.
- Payment-to-ledger reconciliation and refunds.
- Auction concurrent bidding, reserve/close/settlement race conditions.
- Escrow funding, custody, release, refund, expiry and dispute transitions.
- Real bank/mobile-money payout UAT and finance ledger reconciliation.
- RLS and RPC execution under anon/authenticated/service roles.

Do not run production money movement as a test. Use provider sandbox and disposable staging records.

## 6. Communications, workers and scheduled jobs

Source validators passed for communications initiative, communication-event convergence, communications support lifecycle, worker runtime and startup convergence.

The previous R21 chat realtime repair is retained. The source includes durable chat outbox logic, retry services, communication event routing and worker startup contracts.

A provider certification attempt was deliberately run and did not pass because this environment has no configured provider credentials:
- Email: NOT CONFIGURED.
- SMS: NOT CONFIGURED.
This is an environment/activation blocker, not evidence of successful provider delivery.

### Remaining live certification
- Verify email provider credentials, domain authentication (SPF/DKIM/DMARC), templates, bounce/complaint handling and real inbox delivery.
- Verify SMS provider credentials, sender ID, delivery receipts, retries and opt-out behavior.
- Verify WhatsApp business/provider configuration and approved templates.
- Start each scheduled worker in staging and prove it claims, processes, retries and dead-letters real disposable records.
- Prove only one active scheduler/worker lease per job where required; confirm graceful shutdown, restart recovery and alerting.
- Confirm notification deduplication and no cross-user leakage.

## 7. Frontend and backend build certification

### What ran
- 36 focused source-contract validators passed after the R22 changes.
- `node --check` passed for all changed JavaScript source, test and validator files.

### What could not be certified
The extracted archive has no installed frontend/backend dependency tree. Therefore:
- `npm run lint` did not complete: TypeScript reported missing installed React, Vite-related types and other package declarations; the extracted environment cannot establish whether all reported errors remain after dependency installation.
- `npm run build` did not complete: the Vite executable could not be executed (`vite: Permission denied`).
- Backend Jest/Vitest suites were not run because the project dependencies are not installed in this environment.
- No browser E2E, device matrix, live Supabase or payment provider certification was run.

### Required clean-machine certification commands
From the repository root:
```bash
npm ci
npm run lint
npm run build
npm test
```
Then backend:
```bash
cd backend
npm ci
npm test
```
Then execute the existing project certification scripts for registration, listing, auction, payment, escrow, communications, worker runtime and deployment readiness. Run browser E2E against staging with test accounts. Preserve the full logs and exit codes.

If the repository uses a workspace/monorepo lockfile, follow the committed lockfile's documented install workflow rather than installing packages ad hoc. Do not use `npm install` to rewrite lockfiles during certification.

## Validation results
Thirty-seven focused validators passed:
- Seller ownership write boundary (new): 9/9.
- Listing lifecycle integrity (updated): 3/3.
- Admin listing management (updated): 10/10.
- Admin seller management (updated): 12/12.
- Admin dealer verification (updated to shared error-state component): 22/22.
- Business ownership/mobile navigation.
- Owner identity convergence.
- Listing self-publication and Phase 13E visibility.
- Private-seller listing workflow.
- Dealer platform/workforce/verification.
- Unified onboarding, registration and role matrix.
- Domain lifecycle integrity.
- Auction domain and financial integrity.
- Payment/escrow domain and gateway lifecycle.
- Communications, event convergence and support lifecycle.
- Worker runtime and startup convergence.
- Deployment/backend/frontend runtime source contracts.
- Marketplace/auction/escrow database integration source contract.
- Escrow business and live-operation scenario source contracts.
- API/session availability source contracts.

A separate provider certification was blocked by absent credentials. Full build/typecheck/test suite status remains **not certified**.

## Change control and rollback
- No production database writes or migrations applied.
- No live provider calls or money movement.
- No Git commit, push, merge or deployment.
- No new mock inventory or fake integrations.
- R21 remains the rollback baseline.
- R22 contains only source changes, regression expectation updates, validator alignment and this report.
