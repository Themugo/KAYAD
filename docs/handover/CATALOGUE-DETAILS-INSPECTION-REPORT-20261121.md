# KAYARD KE — Master Catalogue, Vehicle Details, Inspection Relocation, Responsive UX (implementation report)

Status labels: VERIFIED (executed, evidence) / FAILED / BLOCKED / NOT TESTED / NOT IMPLEMENTED.

## Delivered
| Area | Status | Evidence |
|---|---|---|
| 4 columns is the default desktop selection (admin default 4; stored un-revisioned 5 migrates to 4) | VERIFIED | 1440 and 1280 render 4 per row, `4 columns` pressed (measurements-impl.json) |
| Selector matches the rendered layout (only choices that can render are offered; pressed = effective columns) | VERIFIED | unit tests `inventoryPresentation.test.ts`; Playwright at 7 widths |
| No unusable layouts on small screens (1024: 2, 768: 2, ≤420: 1 column; no horizontal overflow) | VERIFIED | overflowX=false at all 7 widths |
| Improved Grid and genuinely different List (horizontal rows desktop; image-left rows on phones); same filtered/sorted data feeds both | VERIFIED | screenshots `*-02-grid.png`, `*-03-list.png`; tests |
| Filters/search/sort/pagination preserved; state in URL (q, location, make, model, body, fuel, transmission, condition, seller, color, price, year, km, auction, sort, page, view, cols) | VERIFIED (unit + browser round-trip) | `catalogueUrlState.test.ts`, VehicleMarketplace URL round-trip test |
| Inspection banners and booking CTAs removed from catalogue cards (inspection feature kept) | VERIFIED | 0 `.kayad-vc-inspection` blocks at all widths; test |
| Details: desktop dialog, full-screen mobile sheet; stable `?vehicleId=` URL | VERIFIED | `*-04-details.png` |
| Back/close preserves catalogue state and scroll; no duplicate history entries when switching vehicles | VERIFIED | history delta 0 after Next; scroll before/after identical (e.g. 869→869 at 1024 with direct click) |
| Prev/next follow the filtered+sorted result set | VERIFIED | "2 of 12" counter; `vehicleDetailHistory.test.ts` |
| Inspection section in details with truthful states, reusing existing inspection services (`getMyInspections`, existing booking flow) | VERIFIED | `VehicleInspectionSection.test.tsx`; `*-05-inspection.png` |
| Reserved vs verified-dealer vs inspected kept separate | VERIFIED | reserved badge/notice tests; "Verified dealer" wording |
| Approved lockup logo; navbar mobile order: logo left, search right, hamburger far right | VERIFIED | `*-01-home-navbar.png`; Navbar lockup test |
| Gallery: empty-gallery placeholder, active image resets between vehicles | VERIFIED | VehicleDetailModal tests |

## Not implemented / limits (honest)
* **Make an Offer — NOT IMPLEMENTED.** The existing offer workflow (`leadApi.submitOffer`, `MarketplaceOfferPanel`) requires a lead id; leads exist only after chat, bid or escrow. A details-page offer button would need a new lead-creation path or backend change, which the directive forbids inventing. Offers remain reachable through buyer-dashboard negotiations and the dealer leads tab.
* **Logo admin step:** the new lockup is the default only. If production branding is stored with the old K mark, an admin must select/upload the new logo in Admin → Settings. No reversed (dark-background) logo asset exists. In lockup mode the utilities/CTA block is hidden below 640px. The K mark remains favicon/app icon; `index.html` and the PWA manifest were not changed.
* Hosted DB: no migrations applied; no production data touched; no deploy.
* GitHub push: see PUSH-STATUS below. GitHub Actions: NOT RUN.
* Mobile filter-drawer overlap: exercised manually via screenshots only; no dedicated automated test added. NOT TESTED automatically.

## Regression results
* Frontend vitest (full): 211 files, 1782 passed, 1 skipped, 0 failed (`vitest-final.log`).
* DashboardHubStaff flake investigated: reproduced ~1 in 5 isolated runs. Root cause: `findByTestId` default 1 s timeout raced the lazy-loaded Auctions section (test ~1.1 s). Test file and component unchanged from baseline otherwise. Fixed with an explicit 8 s timeout; 0 failures in 8 consecutive runs.
* Backend jest (full, 266 files, run in 14 batches because a single process exhausts memory in this sandbox, exit 134/137): 4149 passed, 21 skipped, 0 failed (`jest-summary.txt`).
* Typecheck `tsc --noEmit`: clean. Production build: succeeds (chunk-size warning only).
* Validators: 357 run; passing except communications-provider-certification, live-runtime, local-supabase (all need live infrastructure; same class of failure as baseline). 7 validators whose pins encoded the old 5-column/680-1120px thresholds, old logo, "Pending" chip and old copy were updated to the approved behaviour without removing their intent.

## Responsive evidence (Playwright, headless Chromium)
Viewports 1440/1280/1024/768/390/375/360. Columns per row 4/4/2/2/1/1/1; no horizontal overflow; no page errors. Screenshots in `evidence/shots-impl/` (navbar, grid, list, details, inspection per viewport).

## Notes
* The 1024px viewport shows 2 columns because the filter sidebar leaves ~740px for results; the 4-column threshold is a results-container width of 940px (cards ≥ ~230px).
* A "scroll changed 869→1149" reading seen in one automated run was Playwright's click auto-scroll (sticky header obscured the card); a direct click confirms the app preserves scroll.
