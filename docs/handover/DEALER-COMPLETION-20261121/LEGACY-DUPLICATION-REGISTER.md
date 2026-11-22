# Legacy and duplication register

Rule applied: nothing is removed on "no importer" alone. Each candidate was checked for static imports, `import()` / `React.lazy`, `import.meta.glob`, route registration, navigation arrays, tests, validators, backend references, role-specific access and docs.

## Removed in this phase (evidence-backed)
| File | Evidence | Recovery |
|---|---|---|
| `src/pages/dealer/components/DealerListingsTab.jsx` | no importer, no dynamic / lazy import, no route, no test, no validator, no nav entry (only earlier register documents mention it); it also called the old `dealerAPI` listing path | copy kept at `/home/claude/p1/out/removed-legacy/…` and in git history (`origin/main`) |
| `src/pages/dealer/components/DealerEarningsTab.jsx` | same | same |
| `src/pages/dealer/components/ConversionFunnelDashboard.jsx` | same | same |
| `src/pages/dealer/components/DealerKPIWidgets.jsx` | same | same |

Typecheck, the production build and the full frontend suite are green after removal.

## Kept although unimported (dependency evidence says removal is unsafe or undecided)
| File | Why kept |
|---|---|
| `src/pages/dealer/DealerAnalytics.jsx`, `DealerSettings.jsx`, `DealerTeam.jsx` | named by `validate-dealer-workspace-navigation` / `-operations-initiative` / `-workforce-access`; deleting them breaks validators, so the validators need an owner decision first |
| `src/pages/dealer/components/DealerPackageTab.jsx`, `DealerLeadsTab.jsx` | named by commercial-controls, subscription and lead-CRM validators |
| `src/pages/dealer/DealerAuctionSetup.jsx` | has a test and a validator reference |
| `src/pages/dealer/DealerDashboard.jsx`, `components/dealer/DealerHub.jsx`, `DealerLayout.tsx` | imported and tested (legacy shell) |

## Duplicates resolved by consolidation (no deletion needed)
* Sold / pause / publish logic: one service (`dealerListingSale.service.js`) + one SQL function; both bulk endpoints and the single routes call it.
* Status vocabulary: one label map (`dealerStatusLabel`).
* Cache invalidation: the repo has **two** cache layers (`apiCache` for dealer endpoints, `cacheService` / `publicListingCache` for the public marketplace). Dealer status changes now refresh both; they were previously refreshing only the dealer one (a defect, fixed).

## Open
D-7: whether to retire the kept validators-pinned legacy files. Not decided here.
