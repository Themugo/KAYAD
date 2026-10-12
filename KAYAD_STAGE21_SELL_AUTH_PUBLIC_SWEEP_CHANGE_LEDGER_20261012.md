# Stage 21 Change Ledger — 2026-10-12

| File | Change | Risk/compatibility note |
|---|---|---|
| `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx` | Added premium role-choice Seller Studio entry; role-aware registration CTA; signed-in non-seller Support route; gated workspace to private sellers; removed invented trust score/approval claim; aligned seller accent. | Reuses existing registration, Support, Seller Studio and Trust Center workflows. No new account or listing API. |
| `src/App.tsx` | Added canonical `/sell`, `/sell-car`, `/sell-vehicle` redirects; role-aware Dealer Dashboard routing; shared public shell tokens and public-surface identity; aligned app background/loading accent. | Existing `activeNav` architecture retained. |
| `src/components/sell/SellPage.tsx` | Replaced simulated timer/success flow with redirect to the canonical seller workspace. | Removes misleading fake onboarding behavior; no public route duplication. |
| `src/components/navigation/navConfig.ts` | Restored Escrow dropdown children that already exist in backend registry. | Public explainer stays public; participant deals require auth and route to My Garage. |
| `src/components/DashboardHub.tsx` | Converged role accents; no fabricated saved count. | No data source or API changes. |
| `src/components/auction/AuctionExperienceRail.tsx` | Hide saved count when it is unknown (`null`). | Existing callers keep prior default behavior when they omit the prop. |
| `src/components/features/dealer/DealerHub.tsx` | Added dealer portal identity marker. | Presentation only. |
| `src/styles/dealer.css` | Replaced near-black dealer header with deep teal; tuned dealer accent to KAYAD palette. | Presentation only. |
| `src/features/OwnershipPlatform/pages/BuyerPlatform.tsx` | Added buyer portal identity marker. | Presentation only. |
| `src/index.css` | Added public-surface and role tokens; premium seller entry styling; focus and reduced-motion support. | Scoped additions; no component/data contract change. |
| `src/components/layout/NotificationPanel.tsx` | Replaced legacy amber error styling with canonical KAYAD surface colors. | Text/status semantics preserved. |
| `src/features/SupportView.tsx` | Replaced legacy amber status styling. | Text/status semantics preserved. |
| `src/pages/NotificationsPage.tsx` | Replaced legacy amber status/empty-state styling. | Text/status semantics preserved. |
| `scripts/validate-navigation-convergence.mjs` | Corrected protected-nav expectation to include `escrow-operations`. | Validator now reflects current route guard. |
| `scripts/validate-public-escrow-boundary.mjs` | Updated the Escrow navigation assertion to test public/private routing contract. | Does not weaken API ownership checks. |
| `scripts/validate-premium-sell-auth-public-convergence-20261012.mjs` | Added repeatable Stage 21 source contract checks. | Static/source checks only, not browser certification. |
| `package.json` | Registered `validate:premium-sell-auth-public-convergence`. | Scripts-only change; lockfile does not need dependency changes. |

No backend controller, database schema, migration, payment provider, deployment configuration or production credential was modified.
