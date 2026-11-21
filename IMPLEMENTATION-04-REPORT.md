# KAYARD KE — Implementation 04
## Dashboard certification, workflow enforcement and production-readiness audit

**Source baseline:** `KAYARD-KE-MASTER-IMPLEMENTATION-03C-20261119.zip`  
**Implementation date:** 19 November 2026  
**Approach:** Audit-led, additive changes to existing architecture.  
**Release status:** Source-level implementation and static certification completed; production/runtime certification remains blocked by the available environment.

---

## 1. Executive result

The 03C source tree was extracted and inspected. Its own Implementation 03C report was reviewed against the source. The project already has one canonical personal dashboard (`DashboardHub`), existing section modules, shared identity-aware data, canonical APIs, lifecycle enforcement, participant-scoped escrow/chat routes, and a large set of domain validators. These were preserved.

Implementation 04 made nine source-file changes. It did not introduce another dashboard, another listing API, another lifecycle service, a role migration, or a database migration.

The changes focus on:

- Correcting a stale buyer-portal boundary validator so it recognises the existing stable authenticated `userId` key used by private child workspaces.
- Removing a remaining hard-coded image-upload limit from the add-photos route and using the same canonical `MAX_LISTING_IMAGES_PER_REQUEST` constant as listing creation.
- Extending the seller listing workflow validator to assert the shared limit is used by both upload routes and remains configured to 10.
- Completing account scoping and sensitive-field scrubbing in the unmounted legacy seller component, while explicitly deprecating it and ensuring it remounts on account identity changes.
- Ensuring the legacy seller component no longer offers seller capability to the retired `buyer` role.
- Making the ownership/logbook step accurately disclose that its current checkboxes are not retained by the listing API and do not constitute verification.
- Removing stale, incorrect comments in the vehicle API that claimed the current wizard had no inputs.
- Converging the remaining warm status/warning utilities in two components to the approved KAYARD navy/teal/neutral palette while retaining clear error semantics.
- Expanding the 03C dashboard-coherence validator to cover draft isolation in both the active module and deprecated legacy component.

## 2. Confirmed source findings and corrections

### 2.1 Personal buying child-workspace identity

The original `validate-buyer-portal-boundaries-20261012.mjs` expected literal `user.id` expressions for escrow and financing keys. The implementation already derives `userId` from the authenticated `user.id` and uses that stable identity for escrow and finance; inspection also confirmed the inspection workspace includes the account identity and selected tab in its key.

The validator was corrected to assert the actual stable identity derivation and the real component keys. This was a false-negative validator issue, not a missing application remount implementation.

### 2.2 Image upload limit convergence

`backend/config/listingLimits.js` defines `MAX_LISTING_IMAGES_PER_REQUEST = 10`. The listing-creation route already used it, while the add-images route still hard-coded `10`.

The add-images route now uses the same constant. No limit was increased or relaxed. The listing workflow validator now checks both routes and the canonical constant value.

### 2.3 Draft account isolation

The production-mounted `PersonalSellingModule` already uses an account-specific draft key and removes `ownership.ownerId` and photo File objects from browser persistence. It now avoids creating or reading an `unresolved` shared key when no authenticated account ID is available.

The source also contained a deprecated, unmounted `PrivateSellerPlatform` implementation with the old browser-wide draft key. Although it is not imported or rendered by `App.tsx`, it was hardened to use an account-specific key, scrub ownership ID values and photo objects, and remount on account changes. It is explicitly marked deprecated; production personal selling remains mounted exclusively through `PersonalSellingModule` inside `DashboardHub`.

The retired `buyer` role is no longer considered seller-capable in this deprecated component. Its component regression test was updated to reflect the established buying-only boundary.

### 2.4 Ownership declaration and logbook limitation

The 12-step listing wizard collects an owner-authorisation checkbox and a logbook-availability checkbox. The current `createCar` payload and backend listing API do not persist these fields or accept an ownership-document upload as part of this wizard.

The UI now says explicitly that these checkboxes are submission prerequisites only, are not retained by the current API, and do not verify ownership. No new database field, evidence table, document upload route or retention policy was invented.

A durable ownership-attestation/evidence implementation remains a product/legal decision. It needs approved consent wording, retention/deletion rules, access policy, file authorization, audit requirements and the intended relationship to the existing Trust Center verification process before a schema/API change is safe.

### 2.5 Legacy buyer role boundary

The canonical registration matrix maps public buyer registration to the canonical personal `user` role. The backend and active personal seller module do not grant private seller capability to retired `buyer` records. This behaviour remains unchanged.

No role migration was executed because this archive has no live database connection or authoritative account distribution. A safe migration requires a read-only role inventory, eligibility rules, record-preservation analysis, dry run, rollback plan and explicit approval. The legacy buyer boundary remains buying-only until that decision is made.

### 2.6 Brand palette convergence

The brand validator found three remaining warm utility tokens across two rendered components (the hidden-listing badge, a permission warning and a stale-data error state). These were migrated to the approved KAYARD neutral/teal surfaces and semantic rose error treatment. The brand-palette validator now passes across the scanned frontend and shared assets.

### 2.7 Vehicle API documentation accuracy

A stale comment in `src/services/vehicleApi.ts` claimed that the live 12-step listing wizard had no inputs. That was inconsistent with the current `PersonalSellingModule` implementation. The comment was replaced with an accurate description of the canonical multipart contract and the ownership/logbook persistence limitation.

## 3. Files changed

1. `backend/routes/carRoutes.js` — add-images route now uses the canonical upload-count constant.
2. `src/services/vehicleApi.ts` — corrected stale listing-creation documentation.
3. `src/components/listing/ListingPresentation.tsx` — hidden badge palette aligned to KAYARD brand tokens.
4. `src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx` — null-safe authenticated-account draft key and clearer ownership/logbook disclosure; warning/error surfaces aligned to brand palette.
5. `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx` — deprecated/unmounted legacy surface marked; account-keyed remount; account-scoped draft storage; ownership ID/photo scrubbing; retired buyer seller-capability gate corrected.
6. `src/__tests__/features/PrivateSellerPlatformGate.test.tsx` — legacy buyer test aligned with buying-only role boundary.
7. `scripts/validate-buyer-portal-boundaries-20261012.mjs` — validates the actual stable `userId` alias used by child workspaces.
8. `scripts/validate-private-seller-listing-workflow.mjs` — validates shared upload limit for create and add-images routes.
9. `scripts/validate-personal-dashboard-coherence-03c.mjs` — covers active and legacy draft isolation and sensitive-field scrubbing.

No production database, user records, payment records, escrow records or role assignments were modified. No database migration was added.

## 4. Static and source verification actually completed

### Personal-account and marketplace validators

- Unified personal-account convergence chain: PASS.
- Deep unified personal-account flow: 22/22.
- Unified selling module: 11/11.
- Personal buying convergence: 13/13.
- Unified account shell: 11/11.
- Navigation convergence: 43/43.
- Public escrow boundary: 14/14.
- Public financing boundary: 23/23.
- Buyer portal boundary: 29/29.
- Registration role matrix: 34/34.
- Personal account pages: 25/25.
- Personal dashboard coherence: 30/30.
- Personal seller lifecycle/enquiries/performance: 16/16.
- Private seller listing workflow: PASS (12 stages, required form fields, photo validation, canonical API wiring, upload limit and draft persistence).
- Implementation 03A page-journey navigation: 8/8.
- Admin/dealer page-journey navigation: 52 admin routes + 5 dealer routes.

### Security, communications and transaction validators

- High-risk boundary sweep: PASS.
- Financial audit/RLS hardening: 7/7.
- Private upload cache: PASS.
- Explicit auth-flow contract: 19/19.
- Chat active-thread realtime: 5/5.
- Chat surface convergence: PASS.
- Offer negotiation UI: 12/12.
- Customer transaction lifecycle: 21/21.
- Auction transport convergence: 5/5.
- Auction eligibility refresh: PASS.
- Auction payment/settlement journey: PASS.
- Payment gateway lifecycle: 13/13.
- Payment/escrow domain: 9/9.
- Transactions and money initiative: 23 checks.
- Runtime convergence: 7/7.
- Escrow live-operations scenario contract: 21/21.
- Database contract alignment: 8/8.
- Domain lifecycle integrity: PASS.
- Migration hygiene: PASS.
- Refresh-token reuse integrity: 6/6.
- Owner identity convergence: 7/7.
- Master identity/authorization corrections: 14/14.
- Messaging/notification surface: 30/30.
- Subscription domain E2E contract: 16/16.
- Public support surface: 21/21.

### Design and syntax checks

- Brand palette convergence: PASS (653 frontend source files plus 13 shared assets/service surfaces scanned).
- Premium presentation: 16/16.
- Frontend source/test syntax parsing: 846 files, zero syntax errors.
- Backend/scripts JavaScript syntax: 1,572 files, zero syntax errors.

These static validators inspect source contracts. They are not substitutes for executing the app, running the full test suites or testing against a live backend.

## 5. Runtime/build/browser checks blocked

The project declares `.nvmrc` / `.node-version` as `22.22.2` and `package.json` requires Node `>=22.22.2`. The available environment provides Node `22.16.0`.

- `npm ci --ignore-scripts --no-audit --no-fund` was rejected by the project's strict engine requirement (`EBADENGINE`).
- `nvm install 22.22.2` could not resolve the Node distribution host in this environment.
- A second `npm ci --engine-strict=false ...` attempt timed out because package registry access was unavailable; it left only a partial `node_modules` directory, which was removed before packaging.
- `npm test` could not start because Vitest is not installed.
- Backend Jest could not start because the Jest dependency is not installed.
- `npm run typecheck` / `npm run lint` could not complete because dependency type definitions (React, Node and other packages) are absent. The available global TypeScript parser did successfully parse all 846 frontend source/test files.
- `npm run build` could not start because Vite is not installed.
- Browser journeys and visual screenshots were not run because the app cannot be built/launched without its locked dependencies.
- Live Supabase/API role inventory and authenticated transaction journeys were not run because no staging credentials or connected database were supplied.

No claim is made that full Vitest/Jest, type-check, ESLint, production build, browser regression or live integration certification passed.

## 6. Required follow-up decisions and dependencies

### A. Runtime certification

Run under Node 22.22.2 or newer with registry access, then execute `npm ci`, frontend Vitest, backend Jest, typecheck, lint and production build. Follow with authenticated browser tests at 1440, 1280, 768, 390 and 360 pixels.

### B. Ownership attestation and logbook evidence

Approve the exact owner-authorisation declaration wording, whether the attestation must be stored durably, how long it is retained, who may access it, how it is withdrawn/deleted, and whether a document upload is actually required. Only then design an additive backend contract and migration. Never treat the checkbox or a registration number as verified ownership evidence.

### C. Legacy buyer migration

Run a read-only account-role inventory in staging/production. Determine which legacy buyer accounts qualify for conversion to canonical personal `user`, preserve all listing/buying/transaction history, test authorization implications, prepare rollback and obtain approval before any data migration.

### D. Live integration checks

Verify the existing owner-scoped listing, enquiry/chat, financing, auction, escrow, inspection and notification journeys against staging using separate personal and dealer accounts. Static authorization contracts passed, but live data-level isolation is not certified here.

### E. Generic offline upload queue

`src/services/uploadService.js` contains an exported generic offline queue that stores file data in localStorage. No active application imports of `addToOfflineQueue` or `processOfflineQueue` were found in the source tree. It was not changed because it is currently unused by the reviewed workflows and changing a generic upload API without a consumer would create unnecessary scope. Reassess before enabling it for sensitive documents.

## 7. Release disposition

Implementation 04 improves source consistency and resolves the confirmed static issues above while preserving the 03C architecture. The project is **not yet production-certified** because the required Node runtime/dependencies, full tests, build, browser journeys and live backend checks were unavailable.

Continue from this Implementation 04 ZIP. Keep the original 03C archive as the rollback baseline. Do not begin a new dashboard workflow until runtime and live integration certification is completed.
