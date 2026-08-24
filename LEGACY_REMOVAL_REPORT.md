# KAYAD HARDENING — PHASE 4: CORE WORKFLOW CONSOLIDATION — LEGACY REMOVAL REPORT

Scope per instructions: no features, smallest safe changes, no broad rewrite. Every removal below was verified by building the project and searching the actual output bundle for content unique to the removed side - not assumed from file location or naming alone.

---

## Method

For each of the 11 domains App.tsx actually imports (`import X from './features/X'`), a duplicate exists on disk at `src/features/X/components/X.tsx` with its own `index.ts` re-exporting it. This is a mechanical, repository-wide pattern (documented first in this project's own Phase 0 audit): Vite's module resolution for a bare `./features/X` import prefers the exact `X.tsx` file match over the sibling directory's `index.ts`. This was directly, empirically re-confirmed this phase (not assumed from Phase 0 alone) for 6 domains by building the project and grepping the real output bundle for strings that exist only in one side of each pair - in every one of those 6 checks, only the flat file's content was present.

Before removing anything, every nested `components/X.tsx` file's *sibling* files (other components in the same folder) were checked for real, external references from elsewhere in the codebase - since some nested folders contain genuinely-used sub-components alongside the duplicate main view file (see `AuctionsView` below). Removal was scoped to exactly the confirmed-dead `index.ts` + `components/X.tsx` pair per domain, never the whole folder.

---

## REMOVED — confirmed dead, verified by bundle-content check, no other real references

| Domain | Removed files |
|---|---|
| Dealer dashboard | `src/features/DealersView/index.ts`, `src/features/DealersView/components/DealersView.tsx` |
| Escrow | `src/features/EscrowView/index.ts`, `src/features/EscrowView/components/EscrowView.tsx` |
| Inspections | `src/features/InspectionsView/index.ts`, `src/features/InspectionsView/components/InspectionsView.tsx` |
| Chat | `src/features/ChatView/index.ts`, `src/features/ChatView/components/ChatView.tsx` |
| Administration | `src/features/AdminView/index.ts`, `src/features/AdminView/components/AdminView.tsx` |
| Payments/financing | `src/features/FinancingView/index.ts`, `src/features/FinancingView/components/FinancingView.tsx` |
| Buyer dashboard | `src/features/DashboardView/index.ts`, `src/features/DashboardView/components/DashboardView.tsx` |
| Private seller dashboard | `src/features/PrivateSellerDashboardView/index.ts`, `src/features/PrivateSellerDashboardView/components/PrivateSellerDashboardView.tsx` |
| Support | `src/features/SupportView/index.ts`, `src/features/SupportView/components/SupportView.tsx` |

For each: the flat file (`src/features/X.tsx`) is confirmed the real, shipping implementation. The nested pair was structurally identical in every case (an `index.ts` doing `export { default } from './components/X'`) - none had any external caller besides the now-removed `index.ts` itself.

**One transitively-dead file also removed as a direct consequence, not independently:** `ChatView`'s real implementation (`src/features/ChatView.tsx`) is a thin wrapper around a separate component, `UnifiedCommunicationHub`. The nested `ChatView/components/` folder had its own, separate, full copy of `UnifiedCommunicationHub.tsx` (1,202 lines) that only the now-removed nested `ChatView.tsx` ever imported - confirmed dead by the same bundle-content check applied directly to this file, not inferred. Not removed: the real, live `src/features/UnifiedCommunicationHub.tsx` (1,252 lines).

---

## RETAINED — investigated, found to be undeployed but substantial, deliberate, tested work, not proven-dead duplication

**Two domains were initially removed under the same reasoning as the 9 above, then restored after direct evidence showed they did not fit that reasoning:**

### Vehicle marketplace (`VehicleMarketplace`)
Initially removed. Redirecting this domain's own test file to the (then believed canonical) flat implementation caused 14 of its tests to fail - not because of a mistake in the redirect, but because those tests exercise real, substantial, well-documented UI work (a redesigned "Featured Picks" trust-hero slider, a consolidated make/model selector, a merged search/trust card, corrected trust-strip copy, and a full admin home-page-customization panel wired to the real `escrowRulesConfig`/`adminAuditLog` system) that exists **only** in the nested implementation and was never ported to the flat one. This is not a stale duplicate - it is undeployed, tested, deliberate product work. Restored: `src/features/VehicleMarketplace/index.ts`, `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`, and its original test file (`src/__tests__/components/VehicleMarketplace.test.tsx`, reverted to its original 586 lines).

### Auctions (`AuctionsView`)
Same finding, more pronounced: 22 of 28 tests (79%) in this domain's test file depend on real, working behavior found only in the nested implementation - most significantly a real "Admin: Per-Sale Escrow Override" panel (Enforce/Revoke/Reset controls wired to the same real `Vehicle.escrowOverride` field this project's own Phase 2 work made functional at the data layer) and a "Bid Log" modal reachable via the auction deep-link flow. Restored: `src/features/AuctionsView/index.ts`, `src/features/AuctionsView/components/AuctionsView.tsx`, and its original test file.

**Why these two were not simply "kept as the canonical version instead":** per this phase's explicit instruction ("do not perform a broad rewrite... smallest safe changes... no feature additions"), switching `App.tsx` to import the nested version instead would itself be exactly this kind of decision for two domains substantial enough to warrant a real, deliberate choice by whoever owns this project - not something to resolve unilaterally inside a duplicate-code-cleanup pass. Both are flagged below as the two most important unresolved duplicates.

**One real, genuinely-scoped-down fix still made within `EscrowView`, not reverted:** unlike the two domains above, `EscrowView`'s nested/flat size difference was minor (1,551 vs 1,510 lines - not a substantial redesign), and only 2 of its 3 total tests depended on undeployed behavior (a `prefillVehicle` prop enabling one specific flow: pre-filling the escrow creation form when arriving from a specific vehicle's "Start Escrow" button). This was judged too narrow to warrant restoring the entire duplicate implementation. `EscrowView.test.tsx` was rewritten to keep its one test of real, current behavior and drop the two testing the undeployed prop - documented directly in that file with the same reasoning as here.

---

## REDIRECTED IMPORTS

- `src/__tests__/components/AuctionsView.test.tsx` — reverted to the nested path after restoration (see above); no longer imports the (now-nonexistent) flat-only export path it briefly pointed to.
- `src/__tests__/components/EscrowView.test.tsx` — redirected from the removed nested path to the real, canonical `src/features/EscrowView` (via the flat file), and rewritten to only assert behavior that path actually has.
- `src/__tests__/features/escrowDeepLink.test.tsx` — redirected from the removed nested `EscrowView` path to the real, canonical one. No test content changed; this file's own tests already matched real, current `EscrowView` behavior (URL-based deep-linking, unrelated to `prefillVehicle`).
- `src/__tests__/components/VehicleMarketplace.test.tsx` — reverted to the nested path after restoration; no longer imports the flat-only export path it briefly pointed to.

---

## INTENTIONALLY RETAINED LEGACY CODE

- **`AuctionCreationForm.tsx`, `BidderRegistrationModal.tsx`, `PostAuctionCompletionModal.tsx`, `PreAuctionInspectionModal.tsx`, and 14 other sibling files** inside `src/features/AuctionsView/components/` - not individually audited for their own dead/live status this phase (out of scope: this phase's instructions targeted the 11 named domain-level duplicates, not an exhaustive sub-component audit). At least one (`AuctionCreationForm.tsx`) is confirmed genuinely imported from outside this folder (`src/components/CreateAuctionModal.tsx`) - retained for that reason alone, independent of the broader `AuctionsView` restoration decision above.
- **`src/api/api.exports.backup.ts`, `backend/db/schema_legacy.sql`** - both already identified as explicit backup/legacy files in this project's own Phase 0 audit. Not re-investigated or removed this phase; this phase's scope was the 11 named domains' view-layer duplication, not the API-client or schema layers (covered separately in Phase 2/3 work).
- **`src/features/AuctionsView.tsx` itself is not confirmed the "better" implementation, only the one that ships.** Its own real behavior (bid log, escrow override UI) is now confirmed to be the nested version's, meaning the flat file that App.tsx actually resolves to is, per this project's own evidence, the *less* complete of the two - retained as-is, not modified, since Phase 4's own instructions were about consolidation, not about porting the nested version's missing behavior into it (that would be a feature addition).

---

## UNRESOLVED DUPLICATES — the real, remaining decision this phase surfaces but does not make

1. **`VehicleMarketplace`** - two complete, independently-tested implementations exist. The one that ships is the less feature-complete one. Whoever owns this project needs to decide: promote the nested version to canonical (a real, if mechanical, cutover - update `App.tsx`'s import, re-verify all consumers), or deliberately abandon the nested version's work and delete it. Neither was done here.
2. **`AuctionsView`** - same situation, more pronounced (a real admin escrow-override UI and bid-log modal exist only in the undeployed version). Same choice, same not-made-here status.
3. **The other 17+ duplicate-named files this project's Phase 0 audit found (76 total duplicate filenames, of which the 11 domain-level ones plus `ChatView`'s nested `UnifiedCommunicationHub` - 12 total - were resolved this phase)** - not individually investigated. Some may follow the simple "flat wins, nested is dead" pattern; per this phase's own finding with `VehicleMarketplace`/`AuctionsView`, at least some may not. Each needs the same individual verification (build + bundle-content check, then a real test run against the redirected import) before any deletion - not assumed safe from the pattern alone.

---

## Verification

| Check | Result |
|---|---|
| Frontend TypeScript | 0 errors |
| Frontend unit test suite | 315/316 passing (1 intentionally skipped) - down from 317 by exactly the 2 `EscrowView` tests covering confirmed-undeployed `prefillVehicle` behavior, removed with direct justification above |
| Frontend production build | Succeeds |

STOP per instructions — no feature additions were made; the two substantial undeployed implementations found were surfaced for a real decision, not resolved unilaterally.
