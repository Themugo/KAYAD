# Stage 22 — Change Ledger

| File | Change | Risk / note |
|---|---|---|
| `src/App.tsx` | Pass current user role into public dealer view | Existing role; backend remains authority |
| `src/features/DealersView.tsx` | Default to public directory; restrict console switch to dealer/admin; honest empty state and status language | Directory data source remains unwired and is documented as a gap |
| `src/components/detail/VehicleDetailPage.tsx` | Remove client-only escrow initiation; route to existing escrow explainer or seller chat; correct inspection score/certificate/ownership claims | No payment or deal is initiated by this CTA |
| `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` | Remove broad verification/report-sharing promises from inventory, inspection and sell CTAs | Existing data and admin-managed commercial placements preserved |
| `src/components/gallery/GalleryPage.tsx` | Remove absolute escrow/guarantee/verified-arrival copy | Legacy public surface copy only |
| `src/components/home/EscrowWorkflowSection.tsx` | Replace guaranteed/instant/regulated custody claims with deal-specific steps | Existing explainer route retained |
| `src/components/home/EscrowTrustBanner.tsx` | Remove instant payout, M-Pesa contract and KRA verification promises | Existing explainer route retained |
| `src/components/home/WhyKayadComparison.tsx` | Remove unsupported regulated-marketplace and blanket protection claims | Existing comparison layout retained |
| `src/pages/home/components/HomeFeaturePillars.jsx` | Remove blanket auction, escrow and dealer verification claims | Existing pillars retained |
| `src/features/DealersView/components/DealerProfileModal.tsx` | Remove fabricated stats/defaults, false verification badges, local-only follow success and fake test-drive confirmation | Test-drive surface now states no booking was sent |
| `src/components/home/Hero.tsx` | Align legacy hero copy with actual marketplace/inspection workflow | No layout redesign |
| `src/pages/home/components/HomeHero.jsx` | Remove blanket verified dealer and escrow claim | Existing links preserved |
| `src/components/home/SellCarBanner.tsx` | Remove invented popularity and blanket escrow claims | Existing CTAs preserved |
| `src/components/home/TrustMetricsBar.tsx` | Replace hard-coded animated fake metrics with non-numeric guidance | No fake financial/member/satisfaction totals |
| `src/components/home/LiveAuctionsSection.tsx` | Use only backend-confirmed live lifecycle; remove fake timer, ordinary-inventory fallback and fake bid count | Empty state when no live auction is returned |
| `src/components/home/FinalCtaSection.tsx` | Remove invented “thousands of verified listings” claim | Existing CTAs preserved |
| `src/components/home/GlobalSearchSection.tsx` | Remove unsupported direct KRA/NTSA integration claim | Search/filter behavior unchanged |
| `src/components/home/BrowseByCategory.tsx` | Remove absolute EV and universal verified-inventory claims | Existing category filters preserved |
| `src/components/home/VehicleCollectionsSection.tsx` | Rename “Dealer Certified” collection to match its inspection-score filter; remove unverified franchise warranty promise | Existing filter behavior preserved |
| `src/components/common/Breadcrumbs.tsx` | Change “Bank Escrow Vault” to “Escrow options” | Copy only |
| `src/index.css` | Shared public surface tokens, overflow, focus, scroll margin and reduced motion | Uses existing KAYAD palette |
| `src/components/ui/index.tsx` | Shared spinner accent aligned to KAYAD mint | Visual token only |
| `package.json` | Register `validate:public-facing-convergence` script | No dependency change |
| `scripts/validate-public-facing-convergence-20261012.mjs` | New 49-check source contract validator | Source-level, not runtime certification |

No database, backend authorization, payment, webhook or production configuration files were changed.
