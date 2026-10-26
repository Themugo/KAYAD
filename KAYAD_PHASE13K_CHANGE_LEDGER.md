# KAYAD Phase 13K — Change Ledger

Foundation: `KAYAD-PHASE13J-AUCTION-REGISTRATION-SECURITY-FIX-20261026.zip` (manifest 8578/8578 verified before work). No commit, push, deploy, migration, or staging/production change.

## Modified source files (5)
| File | Change | SHA-256 before (13J) | SHA-256 after |
|---|---|---|---|
| `backend/controllers/carController.js` | getCar returns `toPublicVehicleDetail(car)` unless owner/staff; getCars dealer populate no longer selects `phone` (authorized) | `a62d08d9fc016bb69bcf25cd90e1e582239f5a4fa24b21a1d38061b2682655c6` | `0550613ac1ff384aea8a65de90842ce0e843bb855945262ef4310a21fc14f24b` |
| `backend/controllers/searchController.js` | search returns `toPublicVehicleSummary` rows (authorized) | `f1d4cafd00b14108ff25772221c4723f0f195ad0bb2a091a8bad3903309ffc96` | `aa31ae248a496f9d7a1f7f1a91668d9735b1526d30063b9592c2eef33de37b54` |
| `src/components/VehicleDetailModal.tsx` | Vehicle-Identity badge only when a VIN is present (UI guard implied by VIN decision) | `905d6c6aecf20fa3dd3e8ae63bb7a3d81ec1be9326a7a8db9c3d605654191a39` | `8a988a206cd10fec465c92749e3e6e226a65118a128be2ee57a56f786b503ab3` |
| `src/components/detail/PriceAlertModal.tsx` | `VIN:` line only when present (UI guard) | `b1fbf5d286921d4ae2d5c529cdd02190e4a0febbc5ba52f6062881b7ed7ca179` | `ade8f31912bb0c9ad0f90cff609820c9be91d5424a667330d72490777950bf40` |
| `src/components/detail/VehicleDetailPage.tsx` | VIN row, copy button and separator only when present (UI guard) | `001408f3a8ae17ed04c36ddb90a013d512bbd9fb57e15acf6277172eebf78b70` | `f32d0cdcf04f888161995bcbe6daf36f1d11e9128d842c359a427c23f7ac6853` |

## Added files
| File | Purpose | SHA-256 |
|---|---|---|
| `backend/utils/publicVehicleProjection.js` | Public allowlist projections (authorized new file) | `8be72a2f820fd91c93f7a870c99403bff4cc0a6057f5db55e64c0f98967257ec` |
| `backend/tests/security/publicVehicleProjection.test.js` | Jest unit test of projections (4 tests) | `7bf30e3cd72610fe68bb76178785637525cc77a066c5416795876c6f7e2a03c0` |
| `runbooks/phase13k-20261026/http/phase13k_public_vehicle_security.mjs` | Real-HTTP + DB security suite (276 checks) | `0197ecbcdfc8a15c17f8d89170de8caf600b6591f09a48d216207923b7a0e5d7` |
| `runbooks/phase13k-20261026/ui/phase13k_ui_journeys.mjs` | Playwright desktop/390px journeys + axe | `77a39bb1619b66278f8e5945c0e3fa0ad52fb37b0f619d117e738e130a4d3465` |
| `runbooks/phase13k-20261026/ui/serve-spa.mjs` | SPA static server for journeys (copied from 13I) | `e073c761426a8dde382ae95852fd9dc0e653502196d71ef9e20f8ddaa487024a` |
| `proposed-patches/APPLIED_public_vehicle_detail_disclosure.13K.diff` | Full unified diff vs 13J | `b480845874060c5ad744e071e6b8e61187a483440b50f736d1514c2b472181da` |

Plus the `KAYAD_PHASE13K_*` documents in the package root and evidence in `validation-logs/phase13k/`.

## Explicitly unchanged
`backend/routes/auctionRegistrationRoutes.js` (13J fix, sha `7a9c59d7…`), `backend/routes/v1.js`, the cache middleware, `searchService.js`, auction/bidding/payment/escrow/ledger/M-Pesa code, the 13I dashboard, dealer organization code, migrations (none created).
