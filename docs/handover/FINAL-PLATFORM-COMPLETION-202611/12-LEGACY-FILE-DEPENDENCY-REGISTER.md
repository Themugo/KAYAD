# 12 - Legacy file dependency register (D-16)

Six files are kept: `DealerAnalytics`, `DealerSettings`, `DealerTeam`, `DealerAuctionSetup`, `DealerLeadsTab`, `DealerPackageTab`. Each carries the marker `LEGACY (owner decision D-16)`. Nothing was removed.

| Check | Status |
|---|---|
| No production file imports any of the six (static import/dynamic import scan) | VERIFIED by `src/__tests__/legacy/legacyDealerFilesGuard.test.ts` (12 assertions) |
| Marker present in each file | VERIFIED by the same test |
| Why kept | Referenced by `scripts/validate-*.mjs` validators (not by production code) |

## Removal criteria (all required)
1. Owner confirms D-16 removal in writing.
2. Validators that reference them are rewritten to point at the canonical dealer workspace files, with the same assertions (no weakening).
3. The guard test stays green and a repository-wide search finds no remaining reference.
4. Full gate re-run (frontend, backend, validators, journeys) after removal.
