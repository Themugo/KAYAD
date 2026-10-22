# KAYAD Change Ledger — This Pass (Master Polish Audit, 2026-10-12)

This ledger covers only the files changed during *this* verification pass. It does not restate the Stage 11–23 ledgers already present in the foundation (`KAYAD_STAGE*_CHANGE_LEDGER_*.md`), which remain accurate records of their own work.

| File | Change | User-visible impact | Risk / regression coverage |
|---|---|---|---|
| `src/context/NotificationContext.tsx` | Added explicit `: 'fetch' \| 'action' \| null` type annotation to `visibleErrorKind` | None (compile-time only) | Fixes a real `tsc --noEmit` error; covered by `tsc --noEmit` passing clean and the full frontend Vitest suite still passing |
| `src/features/InspectionsView.tsx` | Added `?.` so `kayad.value?.orders` matches the existing `provider.value?.bookings` guard | Prevents a crash when the KAYAD inspections call resolves without the expected shape | Covered by `InspectionsView.test.tsx`, previously failing with an unhandled rejection, now 12/12 PASS |
| `src/features/escrow/PublicEscrowExplainer.tsx` | Relabelled the `WhatYouCanDoNext` section's signed-in CTA from "Open your dashboard" to "Go to your account" (same `onClick`, same destination) | Removes a duplicate, ambiguous accessible button name on the public Escrow page | Covered by `EscrowView.test.tsx` 17/17 PASS |
| `src/features/SupportFAQ.tsx` | Added `role="tablist"` to the category filter container and `role="tab"` + `aria-selected` to each filter button | Improves screen-reader semantics for the category filter; no visible change | Covered by `supportFaq.test.tsx` 7/7 PASS |
| `src/__tests__/features/support/supportFaq.test.tsx` | Updated two `getByRole('button', ...)` queries to `getByRole('tab', ...)` to match the new semantics | Test-only | Both previously-failing assertions now pass |
| `src/__tests__/features/escrowDeepLink.test.tsx` | Rewrote to assert the current, privacy-preserving behavior of the public `EscrowView` (no participant deal data loaded, ever) instead of a removed inline-deep-link capability; documented why in-file | Test-only | 3/3 PASS (was 1/3 against the old, stale assertions) |
| `backend/tests/auction/auctionListSoftDelete.test.js` | Corrected an inverted timestamp-comparison assertion (`toBeGreaterThan` → `toBeLessThanOrEqual`, matching the sibling assertion directly above it and the controller's actual single-snapshot design) | Test-only | 12/12 PASS (was 11/12, confirmed to fail deterministically before the fix, not intermittently) |
| `scripts/validate-final-system-surface-guard.mjs` | Updated the literal protected-nav-set string to include `escrow-operations`, added by Stage 21 and documented in that stage's own audit | Validator-only | 13/13 PASS (was 12/13) |
| `scripts/validate-messaging-notification-surface-20261012.mjs` | Loosened one regex to tolerate the optional type annotation added to `NotificationContext.tsx` in this pass, without changing what it verifies | Validator-only | All 22 checks in this validator still pass |
| `scripts/validate-stage-master-polish-regression-20261012.mjs` | **New.** Repeatable validator asserting all seven fixes above stay in place (see below) | New validator, no production impact | Self-verifying; run as part of this pass |
| `KAYAD_MASTER_POLISH_AUDIT.md`, `KAYAD_DESIGN_SYSTEM_CONVERGENCE.md`, `KAYAD_ROUTE_UX_MATRIX.tsv`, `KAYAD_CHANGE_LEDGER.md` (this file), `KAYAD_VALIDATION_MATRIX.tsv` | New | Documentation | — |

## Change boundary

- 8 existing source/test/validator files modified.
- 1 new validator script added.
- 5 new documentation/evidence artifacts added.
- No new route, backend endpoint, database migration, payment behavior, or design-system token was introduced.
- No authentication, authorization, RLS, escrow, ledger, or auction business-logic contract was changed.
- No commit, push, deployment, or production mutation was performed.
