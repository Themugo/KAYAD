# D-16 — retained legacy dealer files (register)

**Correction to the earlier hand-over.** The earlier register said "four" retained files. Re-measured on `origin/main` a652701: **six** files in the dealer area have zero importers in the app and are kept alive only by validators (and, for one, a test). The four files that were *removed* last phase (DealerListingsTab, DealerEarningsTab, ConversionFunnelDashboard, DealerKPIWidgets) are a different set. If the owner meant a different four, tell me which; all six are accounted for below. **None was deleted.** D-16 is preserved.

Method: static import and `import()` search across `src`, `import.meta.glob` (none in repo), router table (`src/App.tsx` uses explicit `path ===` branches and imports neither), `scripts/validate-*.mjs`, tests, backend.

| # | File | Purpose | Production use | Validators / tests pinning it | Canonical equivalent | Removal risk | Recommendation |
|---|---|---|---|---|---|---|---|
| 1 | `src/pages/dealer/DealerAnalytics.jsx` (248 lines) | old analytics page on legacy `dealerAPI` | none | `validate-dealer-workspace-navigation` (existence only) | `dealer/dashboard/DealerDashboard.tsx` analytics section | low: validator only checks it exists | Deprecate; point validator at the dashboard, then remove |
| 2 | `src/pages/dealer/DealerSettings.jsx` (144) | old settings page on `dealerPlatformApi` | none | `validate-dealer-workspace-navigation` (existence); `validate-dealer-operations-initiative` (asserts source calls the dealer-profile API) | `dashboard/DealerSettingsPanel.tsx` | low–medium: one validator reads its source text | Re-point the operations validator to the panel, then remove |
| 3 | `src/pages/dealer/DealerTeam.jsx` (313) | old team page | none | `validate-dealer-workspace-navigation`; `validate-dealer-workforce-access` (asserts canonical team service, no legacy `dealerAPI.`) | `dashboard/DealerTeamPanel.tsx` + `dealerPlatformApi` | medium: the workforce validator guards the "no legacy team API" rule; re-point it to the panel to keep that guarantee | Re-point validators to the panel, then remove |
| 4 | `src/pages/dealer/DealerAuctionSetup.jsx` (219) | superseded auction setup | none (route uses `DealerAuctionSetupWizard`) | `validate-dealer-workspace-navigation`; test `DealerAuctionSetup.test.jsx` (13 tests incl. status authority) | `DealerAuctionSetupWizard.jsx` (routed at `/dealer/auction-setup`) | medium: its test asserts the "groupedCars authoritative status" rule; port that test to the wizard first | Keep until the test is ported; then remove |
| 5 | `src/pages/dealer/components/DealerLeadsTab.jsx` (202) | old leads UI | none | `validate-lead-crm-domain-end-to-end`, `validate-offer-negotiation-ui` (read its source for offer-negotiation markup) | dashboard leads / pipeline sections | **high**: validators assert negotiation UI text that must be proven present in the current UI first | Do not remove until those assertions are re-pointed and proven on the dashboard |
| 6 | `src/pages/dealer/components/DealerPackageTab.jsx` (147) | subscription package UI (`getSubscriptionPlans`) | none | `validate-dealer-commercial-controls`, `validate-subscription-domain-e2e` | **none found**: the dashboard renders no subscription UI | **high: removing it would remove the only subscription-plans UI in the repo** | Owner decision: restore a subscription section in the dashboard, or retire the feature |

## Safeguards added now (no deletion)
* Each file carries a `@deprecated LEGACY (owner decision D-16)` header naming its replacement and the validators that read it.
* `src/__tests__/legacy/legacyDealerFilesGuard.test.ts` fails if any production file imports one of the six, or if a marker is removed.
* All seven pinning validators still pass (headers are comments only).

## Safe deprecation plan
1. Owner confirms which of the six to retire (files 1–3 are the easy ones).
2. Per file: re-point the validator to the canonical component, prove the assertion holds there, run the validator and guard test, then delete in a separate commit.
3. File 6 is a feature decision, not a clean-up.
