# KAYAD First-Seller Launch Certification Report

**Assessment date:** 14 October 2026  
**Foundation:** `KAYAD-PRESTAGING-SECURITY-MIGRATION-DRIFT-20261013(5).zip`  
**Reported source baseline:** `194cc807c11670675ffc7ce4b071b7e8dbf6f93b`  
**Decision:** **NO-GO — local source hardening completed; real first-seller launch is not proven**

## Executive decision

KAYAD is **not certified to accept its first real seller and publish a listing today** on the evidence available in this isolated workspace. The source foundation already contains a substantial registration/onboarding path and Stage 3's security/migration work. This pass made two targeted corrections: verification/password-reset email bodies are no longer persisted in the communications delivery ledger, and pending seller admin notifications now use the existing canonical `dealer.submitted` event ID rather than an unregistered `seller.approval_pending` ID. A stale source validator was corrected to match the actual non-blocking resend implementation.

Those are local source-level changes, not live proof. The archive contains no `.git`, dependencies are not installed, the available Node runtime is `v22.16.0` rather than the repository-pinned `22.22.2`, and no authorized staging/production database or provider credentials were exercised. No production request, SQL, migration, deployment, email, account creation, payment, commit or push was performed. Therefore the overall release decision remains **NO-GO**.

## Baseline and change control

- Supplied ZIP exists; byte size: **31,468,459**; SHA-256: `1aeeb65df51c91026acf7f4281f6e22f40a089f758518c9321ad6f5dd5ffa795`.
- ZIP integrity check: **PASS**; 4,801 archive entries; no corrupt member; 4,439 extracted files under `kayad-fresh/`.
- Embedded Stage 3 report identifies source baseline `194cc807` and explicitly states no production changes. The archive itself excludes Git metadata, so the commit identity is inherited from its report and was not independently verified against a remote in this pass.
- Extracted into a new isolated working directory. The original Windows working tree was not accessed or modified.
- No `node_modules`, `.git`, or `dist` directory was present. Environment files found were examples (`.env.example`, `.env.production.example`, `backend/.env.example`); no real `.env` was found.
- Runtime observed: Node `v22.16.0`, npm `10.9.2`; `.nvmrc` specifies `22.22.2`. Root and backend dependencies are absent, so dependency-backed test suites could not be executed here.

## Four critical defect classes

| Defect class | Result | Evidence / remaining risk |
|---|---|---|
| Registration and email verification | **PARTIAL** | Source validators pass after correcting one stale assertion; atomic registration RPC, hashed token, 24-hour expiry, non-blocking verification dispatch and rate-limited resend are present in source. No database execution, provider acceptance, mailbox delivery or browser journey was run. Stage 3 still reports the onboarding migration chain unapplied to production in historical evidence. |
| First listing: entitlement, upload and persistence | **PARTIAL / BLOCKED** | Source has seller-specific entitlement branches, dealer subscription enforcement, Cloudinary upload handling, ownership checks and admin moderation paths. Neither seller path was run against a real configured storage provider or database. Dealer subscription/entitlement is required; private seller free-market behavior is configuration-dependent. No public test listing was created. |
| Seller/admin communications | **PARTIAL** | Canonical event mismatch fixed locally to `dealer.submitted`; in-app notification route is available. Sensitive event bodies are omitted from persistent metadata. Provider rollout controls are fail-closed and provider acceptance/delivery is not evidenced. Sensitive-email retries rely on the existing resend/reset flow rather than replaying a stored token-bearing body. |
| Token privacy and audit integrity | **PARTIAL** | New gateway sanitizer omits HTML/text/message for `account.email_verification` and `account.password_reset`, with regression tests added. Token hashes, expiry and single-use verification logic are present in source. Jest tests were not executable without dependencies. Complete end-to-end audit correlation and current production RLS/privilege state remain unverified. |

## Eight workstreams

### 1. Runtime and deployed application identity — **UNVERIFIED / BLOCKED**

No live deployment was probed in this pass because no authorized runtime credentials or endpoints were supplied with the task. The Stage 3 report states production was untouched and its deployment/runtime identity was not newly certified. The present ZIP cannot prove which frontend assets, backend commit, environment variables, API base URL, health route or database schema are serving users today. Owner action: provide the intended staging URLs and authorize read-only health/version/configuration checks; do not share secret values.

### 2. Schema readiness and database contracts — **BLOCKED for hosted target; local source contracts PARTIAL**

Repository static validator `validate-database-contract-alignment.mjs` passed 8/8. The embedded Stage 3 report records historical production drift: 35 migration records whose SQL exists only in production, six duplicate-version pairs with mixed provenance, potential re-execution of financial RPC definitions, missing refresh-token rotation objects in the earlier production read, and unverified production RLS/function privilege bodies. The Stage 3 `db push` fail-closed guard remains in place. No migration was applied and no schema-only export was obtained. The existing read-only schema rehearsal runbook and approval gate must be followed before any apply decision.

### 3. Registration and email — **SOURCE CONTRACT PASS; RUNTIME BLOCKED**

Source traces to `POST /api/v1/auth/register`, server-side role allow-list, normalized email, duplicate handling, `kayad_register_identity_atomic`, hashed verification token, non-blocking verification/welcome dispatch, verify endpoint and resend endpoint. Existing source gates: registration/onboarding 47/47; registration/onboarding E2E contract 14/14; registration role matrix 33/33; email reliability contract 8/8. These are static validators, not a real registration or email delivery. New tests for sensitive email metadata were added but not run under Jest.

### 4. Seller onboarding, approval and entitlement — **PARTIAL**

Dealer onboarding requires business name and location; its pending onboarding route is intentionally accessible before dealer approval, while approval remains a separate admin action. Dealer listing creation requires a usable dealer subscription. Private-seller listing eligibility depends on `freeMarket`/`waivePayments` and seller package configuration; no universal free access was introduced. The current intended rules are present in code, but real admin approval and entitlement activation were not exercised. Both paths still need a live, authorized acceptance test.

### 5. Image upload and listing lifecycle — **PARTIAL / BLOCKED**

The existing create-car path is authenticated, seller-role gated, passed through dealer-verification/progressive-access middleware, upload rate limiting, upload validation, and entitlement enforcement. Source has Cloudinary upload/recovery code and listing moderation routes. Actual configured storage credentials, retrievable images, persistent image references and public visibility were not proven. No direct database updates or public test listings were used.

### 6. Communications convergence — **PARTIAL**

`COMMUNICATION_EVENTS.DEALER_SUBMITTED` is the existing canonical `dealer.submitted` event. Pending seller notifications now emit that identifier and preserve `seller.approval_pending` only as `metadata.sourceEvent` for traceability. In-app delivery is enabled in code; email requires an explicitly enabled event/channel rollout control and provider configuration. Brevo webhook status mapping exists, but signature/secret configuration, provider acceptance, mailbox delivery, retry exhaustion and dead-letter behavior were not live-tested. See `KAYAD_COMMUNICATIONS_EVENT_CONTRACT.md`.

### 7. Admin control plane and audit — **PARTIAL / UNVERIFIED**

Existing admin routes support seller approval/rejection and listing moderation, and admin communications/support surfaces exist. This pass did not exercise them in a running application with real roles. Cross-seller access, audit correlation from registration to publication, safe administrative display, failure visibility, and current production RLS remain unverified. No claim of tamper-proof audit is made.

### 8. Consolidated certification — **BLOCKED**

Executed source validators are listed below. Root/backend dependency install, TypeScript compile, production build, Jest, Vitest, Node test suites, Playwright, local disposable Postgres rehearsal and live provider/storage tests were not run in this pass because dependencies/runtime prerequisites were not present. Historical Stage 3 logs record earlier test results, but those are inherited evidence, not a rerun on this changed tree.

## Current command evidence

| Command | Result | Classification |
|---|---:|---|
| `node scripts/validate-registration-onboarding.mjs` | 47/47 PASS after fixing a stale validator expectation | Static source contract |
| `node scripts/validate-registration-onboarding-e2e-contract.mjs` | 14/14 PASS | Static source contract |
| `node scripts/validate-registration-role-matrix.mjs` | 33/33 PASS | Static source contract |
| `node scripts/validate-database-contract-alignment.mjs` | 8/8 PASS | Static source contract, not hosted schema proof |
| `node scripts/validate-email-reliability.mjs` | 8/8 PASS | Static source contract |
| `node scripts/validate-canonical-architecture.mjs` | PASS | Static source contract |
| `node scripts/validate-phase39-deployment-security.mjs` | 15/15 PASS | Static source/config contract |
| `node scripts/validate-first-seller-launch-contract.mjs` | 6/6 PASS | New static regression guard for this pass |
| `node --check` changed backend JS and validator files | PASS | Syntax only |
| `node scripts/validate-backend-boot.mjs` | BLOCKED: missing package `eslint` | Dependency unavailable |
| `npm ci`, typecheck, builds, Jest/Vitest/Playwright | NOT RUN | No `node_modules`; runtime below pinned version |

**Counts for this pass:** static checks listed above: 8 successful validator runs plus syntax checks; 1 dependency-blocked validator. Runtime unit/integration/browser tests: **not run**, not passed. Real-provider tests: **not run**. Production/staging tests: **not run**. No failures from live application behavior can be asserted because no live journey was executed.

## Release gates

| Gate | Status | Why |
|---|---|---|
| Runtime/deployment identity | **UNVERIFIED** | No authorized live identity/health evidence in this pass |
| Database/schema/privileges | **BLOCKED** | Stage 3 provenance/drift approvals remain unresolved; no hosted schema verification |
| Dealer registration | **PARTIAL** | Static source contract passes; live identity creation and verification not exercised |
| Private-seller registration | **PARTIAL** | Static role matrix passes; live identity creation and verification not exercised |
| Email provider acceptance/delivery | **BLOCKED** | No provider credentials/sends/webhook evidence |
| Authentication and sessions | **PARTIAL** | Source contracts/historical tests; no current runtime suite |
| Onboarding/approval | **PARTIAL** | Source paths exist; no live admin decision |
| Dealer entitlement | **PARTIAL** | Subscription guard exists; real subscription/pilot activation not tested |
| Private-seller entitlement | **PARTIAL** | Configuration-dependent; actual deployed flags/package state unknown |
| Real image upload | **BLOCKED** | Cloudinary credentials and retrieval test not exercised |
| Listing persistence/moderation/publication | **PARTIAL** | Code paths exist; no end-to-end persisted listing evidence |
| Communications event contracts | **PARTIAL** | Local canonical event fix and static guard; live rollout config/provider unverified |
| Audit/security/RLS | **PARTIAL** | Local token metadata hardening; current hosted RLS and full audit correlation unverified |
| Regression certification | **BLOCKED** | Dependencies absent and Node version mismatch |
| Operations/recovery | **PARTIAL** | Existing retry/runbook mechanisms; live outage/dead-letter recovery not tested |

## Production safety statement

This pass only extracted and edited a local working copy of the uploaded archive. It did **not** access or modify production or staging, execute SQL, apply migrations, run `supabase db push`, deploy, commit, push, create seller accounts/listings, publish inventory, send emails/SMS/WhatsApp, initiate payments or create financial transactions. The Stage 3 migration guard was preserved.

## Rollback and recovery notes

- Source rollback: revert only the three changes listed in the change ledger if required; do not reset or overwrite the owner’s Windows tree. The metadata sanitizer is security hardening and should not be reverted without a replacement that prevents token persistence.
- Database: no database rollback is needed because no migration or SQL was executed. Preserve all existing migration history and financial RPC bodies.
- Provider outage: verification dispatch is asynchronous; a seller can request resend. The old persisted token remains valid if replacement delivery fails, per the existing resend flow. Sensitive message bodies are intentionally not stored for generic retry replay.
- Listing/upload failure: retain existing media recovery/error tracking; do not mark a listing published until the canonical admin moderation transition succeeds.

## Minimum owner actions to reach launch readiness

1. **Authorize a read-only staging preflight** and provide the intended frontend/backend staging URLs plus permission to inspect health/build identity and schema readiness. Do not send credentials in chat.
2. **Resolve Stage 3 migration provenance** using the existing `runbooks/STAGE3_SCHEMA_ONLY_REHEARSAL_RUNBOOK_20261013.md`; obtain the approved schema-only evidence for the intended staging project. No migration apply until the reconciliation and approval gates pass.
3. Provision the pinned Node `22.22.2` environment and install from lockfiles; rerun full root/backend tests and builds against this exact package.
4. Confirm secret presence in the deployment secret manager for Supabase, Brevo sender/API configuration and Cloudinary; report presence/configuration status only. Approve a single controlled test recipient for provider acceptance and webhook delivery testing.
5. Decide/confirm the intended dealer first-listing entitlement (active subscription vs. a scoped, expiring, auditable pilot grant). Confirm private-seller `freeMarket` and package policy; do not bypass either gate.
6. Authorize one non-public test listing per seller type in staging and a real Cloudinary upload/retrieval test. Then run admin review/approval/publication and correlated audit checks in staging.
7. Only after staging certification passes, approve a separate production release window and migration/deployment plan.

**Next release gate:** obtain approved read-only staging schema/runtime evidence and resolve migration provenance. Until that gate is cleared, no safe staging apply or first-seller end-to-end certification can be claimed.
