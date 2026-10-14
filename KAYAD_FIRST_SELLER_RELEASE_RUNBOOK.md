# KAYAD First-Seller Release Runbook

**Scope:** controlled readiness and staging certification for dealer and private-seller journeys.  
**Foundation:** Stage 3 archive reported at `194cc807`; do not start from a new scaffold.  
**Current status:** NO-GO pending staging schema/runtime evidence and full runtime/provider certification.

## 1. Safety boundaries

### Safe local actions

- Work only in a fresh isolated copy of the supplied archive.
- Use repository-pinned Node `22.22.2` and lockfile-based dependency installation.
- Run source validators, unit tests and browser tests against local/disposable services.
- Rehearse migrations on a disposable PostgreSQL database.
- Use deterministic provider/storage mocks for unit tests, clearly labelled as mocks.
- Prepare migration candidates and evidence without applying them to a hosted database.

### Requires explicit staging authorization

- Read-only staging health/version and schema checks.
- Obtaining an authorized schema-only export for drift reconciliation.
- Applying any reviewed migration to staging.
- Sending a provider test email or webhook, uploading test media, creating test seller accounts, or creating non-public test listings.
- Running the complete staging seller/admin/public-marketplace browser journey.

### Requires separate production authorization

- Any production SQL, migration, migration-history repair, deploy, configuration change, real account/listing creation, public publication, email/SMS/WhatsApp send or payment.
- Never bypass `KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED=reconciled-and-authorized` or the established schema rehearsal gates. Do not use `supabase db push` as a shortcut.

## 2. Preflight

1. Verify archive checksum against the delivered checksum file; record archive size/hash and extracted baseline.
2. Confirm source tree has no `.git`, `node_modules`, `dist`, real `.env` or generated user data in the release package.
3. Confirm `node --version` is `v22.22.2`; use npm version compatible with the lockfile and CI. Install root and backend dependencies separately with `npm ci` in the correct directories.
4. Do not print environment values. Check only presence/configuration state for Supabase URL/service credentials, JWT/session keys, Brevo sender/API key, Cloudinary, and any enabled optional provider.
5. Run the static launch contract and existing registration, role-matrix, database-contract, email-reliability, security and architecture validators.
6. Run typecheck/build, backend Jest/Vitest/Node suites, root test suite and Playwright browser suite. Save command output and exit codes under an evidence directory; separate pass/fail/skipped/blocked.

## 3. Database readiness and migration order

1. Obtain written approval for the read-only schema rehearsal against the intended staging project.
2. Follow `runbooks/STAGE3_SCHEMA_ONLY_REHEARSAL_RUNBOOK_20261013.md` exactly. Collect only schema metadata and migration history necessary for reconciliation; no user rows or secrets.
3. Reconcile the 35 production-only SQL records and duplicate-version pairs using the existing Stage 3 matrices/evidence. Do not rename or rewrite migration history to hide drift.
4. Review the forward-only candidates for lead idempotency, definer `search_path`, inspector `years_of_experience`, onboarding/communications prerequisites and refresh-token rotation. Preserve financial RPC bodies.
5. Rehearse the exact reviewed candidate set on a disposable PostgreSQL database and rerun it where designed to be idempotent. Verify grants, function signatures, constraints, indexes and RLS.
6. Present the read-only evidence, diff, rollback plan and explicit apply approval to the owner. Do not apply any migration without that approval.
7. After approved staging apply, rerun schema readiness and role/RLS matrix tests. Do not infer production state from staging results.

## 4. Runtime identity check (read-only, authorized staging only)

Record:

- Frontend URL, response status, asset/build identity and deployed version.
- Backend URL, `/health`/readiness result, version/commit endpoint if available, boot state and canonical API prefix.
- Browser-visible API base URL, CORS origin, secure-cookie and CSRF behavior.
- Node runtime, build command, start command and deployment timestamp.
- Database connectivity and required-schema readiness without exposing connection strings.
- Secret/configuration presence booleans only; never values.

Mark unavailable checks BLOCKED or UNVERIFIED, not PASS.

## 5. Provider and storage setup

### Brevo

- Confirm sender domain/address verification and sender configuration in the provider console.
- Confirm API-key presence through the deployment secret manager without printing it.
- Confirm the staging `dealer.submitted` event/channel rollout control is enabled only by an authorized administrator.
- Approve one test recipient. Send a single verification message and record provider acceptance ID and delivered webhook evidence. Do not include raw token values in logs or evidence.
- Test invalid webhook secret/signature, duplicate webhook, bounce/failure and resend recovery.

### Cloudinary

- Confirm configured credentials and upload folder/preset in the secret manager.
- With explicit staging authorization, upload one harmless test image; record provider asset ID, dimensions/size and a successful retrieval check, not credentials.
- Verify image references persist with the listing and failed upload leaves the listing unpublished or clearly recoverable.

## 6. Seller acceptance test (run separately for each role)

### Dealer

1. Register a unique approved test email with role `dealer`, business name and location.
2. Confirm one identity and related dealer/profile records; capture correlation IDs, not credentials.
3. Confirm verification email provider acceptance; complete verification through the UI; confirm replay/expiry denial.
4. Sign in; complete dealer onboarding and submit required verification material using synthetic staging data only.
5. As authorized admin, review/approve dealer and record reason/actor in the existing audit path.
6. Confirm an active dealer subscription or an explicitly authorized, scoped, expiring pilot entitlement. Do not simulate payment or bypass the entitlement check.
7. Upload a real staging image through Cloudinary; create/save draft and submit a listing.
8. Confirm admin sees the pending listing, approves it, and publication transition succeeds.
9. Confirm public marketplace shows the actual listing and retrievable image; confirm seller receives intended status communication.
10. Verify delivery state, support request/response and audit correlation.

### Private seller

Repeat with role `individual_seller`, without forcing dealer business fields. Confirm the configured private-seller verification/approval policy and `freeMarket`/package entitlement rules. Upload and retrieve real staging media. Use the existing admin review/publication process. Do not assume dealer subscription rules automatically apply to private sellers.

## 7. Required failure tests

- Normalized duplicate email and concurrent duplicate registration.
- Invalid/expired/replayed verification token.
- Brevo unavailable, provider rejection, missing sender configuration and resend recovery.
- Database/RPC unavailable during registration.
- Missing dealer subscription; private-seller entitlement disabled/exhausted.
- Invalid image type/size, Cloudinary outage, orphaned upload and retry exhaustion.
- Cross-seller create/edit/read attempt.
- Admin rejection with reason and resubmission.
- Invalid/duplicate webhook and unknown provider event.
- Communication retry exhaustion/dead-letter visibility.
- Session refresh replay/revocation and suspended/deactivated account behavior.

Mocks can prove deterministic code behavior only. They do not prove provider acceptance, mailbox delivery, real storage persistence, hosted RLS or production deployment.

## 8. Monitoring and recovery

- Monitor backend health/boot, auth/registration errors, schema readiness, delivery failures, retry counts, dead-letter records, upload recovery jobs and moderation queue age.
- If verification provider delivery fails, do not delete the created identity. Keep the existing token valid and use the rate-limited resend flow. Do not expose or replay stored token-bearing bodies.
- If listing upload fails, keep the listing unpublished and inspect the existing media recovery/failure record; do not create fake image URLs.
- If migration preflight detects drift, stop. Preserve current migration history and financial RPC definitions; reconcile evidence before further action.
- If a regression occurs, stop the rollout and revert only the reviewed source/deployment change. Database rollback must follow the separately approved migration plan; never improvise history repair.

## 9. Rollback constraints

- No schema migration in this pass, so no database rollback is required for this local package.
- Never use direct database writes to simulate the UI flow or bypass entitlement/moderation.
- Never mark provider delivery successful based solely on queue acceptance.
- Never publish staging/test inventory publicly without explicit approval.
- Production change window and rollback approval are separate from staging certification.

## 10. Current exact blockers

1. Staging URLs/access and approval for read-only runtime/schema checks.
2. Resolved migration provenance evidence from the existing Stage 3 runbook.
3. Pinned Node 22.22.2 plus installed lockfile dependencies to rerun all tests on this exact source tree.
4. Authorized Brevo test recipient/webhook and Cloudinary staging upload/retrieval.
5. Owner-confirmed dealer subscription/pilot path and private-seller configuration.
6. Explicit permission for non-public test accounts/listings and admin moderation journey in staging.
