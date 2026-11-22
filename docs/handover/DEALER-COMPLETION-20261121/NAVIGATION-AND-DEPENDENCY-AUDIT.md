# Navigation and dependency audit

## Sidebar (the mounted `src/pages/dealer/dashboard/DealerDashboard.tsx`)
The brief's groups were reconciled with the sections that really exist. **No section was added, removed or re-routed**; the same 15 section ids and `?section=` URLs work, so there are no dead links.

| Group | Sections |
|---|---|
| Overview | Overview |
| Operations | Inventory, Leads, Pipeline, Customers, Auctions, Inspections, Escrow, Finance |
| Business management | Analytics, Reputation, Marketing, Team, Banking, Settings |
| Footer (always reachable) | Account status (collapsible), Help & support (existing `support` page), Sign out |

Not mapped, because no such section exists in the product: a separate *Business verification* page (verification state is shown in Account status and in Settings) and a separate *Notifications* page for dealers (notification preferences live in Settings; the app-level `/notifications` page exists for every account). These were not invented.

The old grouping (Overview / Business / Operations / System Management) was pinned by `DealerWorkspaceNavigation.test.tsx`. That assertion became obsolete by the approved change and was updated to the new grouping; no behavioural assertion was weakened (still: one `aria-current`, URL sync, breadcrumb, deep links, all 15 buttons reachable).

## Page and component map (who mounts what)
| Item | Evidence | Verdict |
|---|---|---|
| `src/pages/dealer/dashboard/DealerDashboard.tsx` | Mounted by `App.tsx` for `nav=dealer-dashboard`; 9 test files | **Canonical dealer UI** |
| `src/features/DealershipWorkspace/DealershipWorkspace.tsx` | Mounted by `App.tsx` for staff members (`nav=dealership-workspace`); tests | **Canonical staff UI** (a different audience, not a duplicate) |
| `src/pages/dealer/DealerDashboard.jsx` (+ `DealerHub`, `DealerLayout`) | Imported by 2 modules and 9 tests | Legacy shell kept: imported, tested, pinned by validators |
| `DealerAnalytics.jsx`, `DealerSettings.jsx`, `DealerTeam.jsx`, `DealerPackageTab.jsx`, `DealerLeadsTab.jsx` | No importer, **but** named in validators (`validate-dealer-workspace-navigation`, `-commercial-controls`, `-lead-crm…`) | **Kept**: removing them would fail validators; needs an owner decision on the validators first |
| `DealerAuctionSetup.jsx` | Test + validator reference | Kept |
| `DealerListingsTab.jsx`, `DealerEarningsTab.jsx`, `ConversionFunnelDashboard.jsx`, `DealerKPIWidgets.jsx` | **No importer, no dynamic / lazy import, no `import.meta.glob`, no route, no test, no validator, no nav entry, no external link** (searched all of `src`, `scripts`, `backend/tests`, config; the only hits were the earlier register documents) | **Removed** (see register). Copies are kept outside the repo for recovery |

## Checks run for every removal
Static imports, `import()` / `React.lazy`, `import.meta.glob`, route registration (`App.tsx` path table), navigation arrays, tests, validators, backend references, role-specific access, `docs` mentions. Typecheck is clean after removal; the production build and full frontend suite are in TEST-RESULTS.

## Duplicate endpoints
`/api/dealer/cars/bulk-status` and `/api/dealer-platform/inventory/bulk` both exist (owner dashboard vs. permission-scoped staff). They are **not** two implementations any more: both call `bulkChangeDealerListingStatus`. Likewise the sold / pause / publish rules live only in `dealerListingSale.service.js` and the SQL function.
