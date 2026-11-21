# Homepage and Dealer Verification

Visual authority: `docs/handover/APPROVED-HOMEPAGE-DESIGN-REFERENCE-20261119.png`. Rendered `main`'s built SPA in Chromium at 1440, 820, 390 and 360 widths (`evidence/home_shots.cjs`; screenshots `evidence/main-home-desktop.png`, `main-home-mobile390.png`). Inventory was empty (local DB), so cards were not compared.

| Requirement | Result |
|---|---|
| Four compact shortcuts (Find a Car, Sell a Car, Auctions, Verified) | VERIFIED at all four widths (all four present, rail integrated in hero) |
| No duplicate oversized CTA panels at the hero | VERIFIED at the hero. Lower on the page there is an "inspection" panel and a "Ready to sell your vehicle?" panel with a "Sell Your Vehicle" button (outside the hero; the approved reference does not show the page below the inventory, so this was not judged). |
| Category strip follows the hero | VERIFIED: All, SUV, Sedan, Pickup, Hatchback, Truck, Electric, Hybrid, View all vehicles. **Electric and Hybrid are in the approved reference image**, so they are correct; the brief's "only body-type categories" wording is looser than the reference. |
| Hero carousel and showcase intact | VERIFIED: slider controls, "Illustrative - not a listing" card (desktop); hero data source `heroSourceVehicles` / `featured: true` still present in code. |
| Admin-configured content preserved | PARTIAL: code paths present (`getPublicConfig`); the 16 failing `VehicleMarketplace` tests include admin-config tests that fail on stale labels, so this is NOT re-proven by tests. |
| Search/filters work | PARTIAL: refine panel renders; behaviour tests failing on stale labels (e.g. buttons are now named "SUV category"). Not re-exercised with data. |
| Navy/teal brand | VERIFIED visually. Brand text is mixed: wordmark "KAYARD KE", but the notice ticker and some copy still say "KAYAD" (e.g. "Browse real vehicles" card says KAYARD KE, the ticker says KAYAD). |
| Responsive, no horizontal overflow | VERIFIED: no horizontal overflow at 1440/820/390/360. |
| **Mobile hero matches reference** | **FAILED (F-HOME-1).** At 390x844 the `kayad-public-hero` container (overflow hidden) is 211px tall and ends at y=306; the vehicle image starts at y=326 and the "Illustrative" card spans y=326-552, so both are clipped out; the category strip starts at y=306. The reference shows the vehicle and card between the rail and the chips. Caveat: Google Fonts were blocked in the sandbox, which can change heading wrap; a 200px hide is unlikely to be font-only. Existing validators (`homepage-responsive-polish`, `compact-layout`) pass and do not catch it. |

## Dealer workspace
- Single canonical layout (`components/layout/DealerLayout.tsx`; the other is a re-export). VERIFIED (source).
- Single dealer dashboard in the app (`pages/dealer/dashboard/DealerDashboard.tsx`); legacy `.jsx` is test-only (D1).
- Dealer data scoping: `dealerPlatformController.js` queries `Car.find({ dealer: dealerId, deletedAt: {$exists:false} })`. VERIFIED (source). The failing validator pins an older literal.
- Subscription/verification state accuracy, listing/enquiry workflows in a browser: **NOT TESTED**.
