# KAYAD Stage 5F.10 — Source diff and merge ledger

Method: three-way comparison of file trees — base = Stage 5F.4, side A = Stage 5F.9, side B = Stage 5F.5 (by SHA-256 per file).

## Result of the comparison

| Side | Modified vs base | Added vs base |
|---|---:|---:|
| 5F.9 (A) | 7 | 31 |
| 5F.5 (B) | 9 | 16 |
| **Files modified on both sides** | **0** | — |

Because no file was modified on both sides the merge is a lossless overlay: the 5F.9 tree plus the 5F.5 changes. No conflict hunk had to be resolved by hand.

### 5F.5 changes carried in (Phase 1)

Modified: `backend/controllers/commandCenterController.js`, `backend/middleware/protectAccount.js`, `backend/middleware/rbac.js`, `backend/routes/adminRoutes.js`, `backend/utils/auditAfterCommit.js`, `src/components/ui/index.tsx`, `src/features/AdminView.tsx`, `src/pages/admin/command-center/EnterpriseCommandCenter.jsx`, `src/utils/permissions.ts`.
Added: seven `backend/tests/regression/stage5f5*.test.js`, `adminCommandCentre.test.tsx`, `permissionsParity.test.ts`, `runbooks/stage5f5-admin-governance-20261020/`, six 5F.5 reports.

Defects D-1…D-17 and owner decisions OD-1…OD-7 from 5F.5 are retained exactly (see `reports/stage5f5-claude-admin-governance/KAYAD_STAGE5F5_DEFECT_REGISTER.md`). **OD-1…OD-7 remain open**; Stage 5F.10 did not decide any of them.

### 5F.9 changes carried in

Modified: `backend/controllers/bidController.js`, `backend/services/auctionLifecycle.service.js`, `backend/services/auctionSetup.service.js`, `package.json` (two validate scripts), `scripts/validate-buyer-portal-boundaries-20261012.mjs`, `src/features/OwnershipPlatform/pages/BuyerPlatform.tsx`, `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx`.
Added: 5F.1…5F.9 reports, `backend/services/privateSellerAuctionEligibility.service.js`, `docs/auction-governance`, five validators, `buyerPlatformConvergence.test.tsx`, migration `20261020160000_private_seller_auction_custody_contract.sql`.

### Name collisions (documentation only)

Both inputs contain `KAYAD_STAGE5F5_DEFECT_REGISTER.md`, `KAYAD_STAGE5F5_EXECUTION_REPORT.md`, `KAYAD_STAGE5F5_SHA256_MANIFEST.txt`. Both versions are kept: the 5F.9 tree's versions stay at the project root; the 5F.5 admin-governance versions are under `reports/stage5f5-claude-admin-governance/`. Nothing was overwritten.

## Stage 5F.10 changes on top of the merge

### Database (new migration `20261020170000_private_seller_auction_gate_enforcement.sql`; rollback in `runbooks/stage5f10-private-seller-custody-20261020/`)
* Reconciles the 5F.8/5F.9 tables (new FKs, CHECKs, one-open-proposal-per-car index, idempotency key, widened event vocabulary).
* `kayad_private_seller_gate(car, lock)` — the single eligibility definition; `kayad_private_seller_assert_eligible`; `kayad_private_seller_gate_batch`.
* Gate evaluated **inside** `kayad_place_bid_atomic`, `kayad_auto_bid_atomic`, `kayad_start_auction_atomic`, `kayad_start_scheduled_auction_atomic`, `kayad_settle_bid_payment_atomic` after the car row lock.
* Backstop triggers on `cars` and `auction_setups`.
* Only writers of proposal state: `kayad_psap_create`, `kayad_psap_apply_event`, `kayad_vcc_apply` (actor capacity verified in the database; idempotent; append-only audit).
* RLS: read-only for sellers/assigned partners, writes service-role functions only.

### Backend
* `privateSellerAuctionEligibility.service.js` rewritten to call the DB gate (fail-closed, 503 when unverifiable).
* `atomicTransactions.js` maps the DB gate refusal to HTTP 409.
* Public exposure gated: `auctionController` (list, active, scheduled, detail, bids), `carController` (list, detail), `auctionRoom.service`, `sitemapService`, `leadService`.
* New `privateSellerAuctionProposal.service.js` and `routes/privateSellerAuctionRoutes.js` mounted at `/api/private-seller-auctions` (seller / provider / admin).
* Fixed a pre-existing bug: public auction detail read the populated dealer id from the wrong field (500 on every detail view; also broke the owner check in `getCar`).

### Frontend
* `AuctionVerificationSection` inside the existing `PrivateSellerPlatform`.
* `AdminAuctionVerification` tab in the existing `AdminView`.
* `bidApi` / `MarketplaceContext` / `VehicleDetailPage`: the backend's refusal reason is shown instead of a generic failure.

### Tests/validators added
`stage5f10_gate_pg.mjs` (227 checks), `stage5f10_http_e2e.mjs` (46 checks), two jest suites, two vitest suites, `validate-stage5f10-private-seller-gate.mjs` (42 checks). Six existing suites received a stub of the eligibility module (see defect register D-18) — assertions were not weakened.
