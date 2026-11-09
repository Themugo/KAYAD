# KAYAD Private Seller Workspace – end-to-end layout and navigation audit

**Audit date:** 9 November 2026  
**Source baseline:** `KAYAD-PRIVATE-SELLER-LISTING-WORKFLOW-1109.zip`  
**Scope:** Private-seller workspace shell, navigation, account controls, listing workflow and responsive page composition.

## Confirmed defects

1. The application-level `Navbar` rendered on top of the private-seller platform's own mobile header. The public-site footer also rendered after the workspace.
2. The seller workspace mobile header used a generic car glyph while the sidebar used the KAYAD `BrandMark`, producing inconsistent identity.
3. The seller navigation had no Settings destination and no Logout action.
4. The mobile drawer used a fixed Tailwind width and did not lock background scrolling or respond to Escape.
5. Seller workspace content did not have a dedicated global containment rule for narrow viewports.

## Changes made

- Public `Navbar` and public footer are now excluded for private workspace routes (`seller-platform`, `sell`, `seller`, `seller-dashboard`, `dealer-dashboard`, buyer/admin workspaces and other existing private routes); public navigation remains on public pages.
- Seller Studio remains the single navigation system inside the private-seller workspace. Existing public mobile dock suppression is retained.
- Mobile seller header now uses the same `BrandMark` as the desktop sidebar.
- Drawer width adapts to the viewport (`min(86vw, 360px)`), is constrained below the fixed header, locks background scrolling, closes on Escape and has dialog semantics.
- Added a Settings page for the existing unified personal account, with links to the central profile/account settings and a clear Logout action.
- Added a single Settings navigation entry and a separate Logout action; no duplicate Settings control.
- Wired Logout to the existing `authLogout` function in the app authentication provider.
- Added seller-specific width containment and responsive styles for the shell and 12-step listing wizard.
- Preserved existing account roles, capability gating, listing API, escrow API, Trust Center and listing moderation rules.

## Page-by-page source review

| Workspace page | Source review | Notes |
|---|---|---|
| Seller Home | Reviewed | Existing real listings/escrow loading and error states retained; responsive one-column-to-wide layout retained |
| Create Listing | Reviewed | Existing 12-step flow and canonical `createCar` API retained; horizontal step rail remains intentionally scrollable |
| Auction Verification | Reviewed integration | Existing `AuctionVerificationSection` retained; backend capability/eligibility remains authoritative |
| Trust Center | Reviewed | Existing phone verification retained; unavailable verification channels remain explicitly marked unavailable |
| My Listings | Reviewed | Existing backend listing records and quality scoring retained |
| Escrow & Deals | Reviewed | Existing escrow API records retained; no synthetic transaction records added |
| Help | Reviewed | Static topics retained; non-functional article links are not fabricated |
| Settings | Added | Unified account details, central profile settings link and logout |
| Mobile navigation | Corrected | One seller header and one seller drawer; no public navbar/footer/dock duplication |
| Desktop navigation | Corrected | Single persistent seller sidebar and workspace content area |

## Validation

The source-level validation script is `scripts/validate-private-seller-workspace-shell.mjs`.

Checks include:
- public navigation and footer are gated off on private workspaces;
- seller header and sidebar share `BrandMark`;
- Settings and Logout are available;
- Logout uses the existing authentication action;
- mobile drawer has viewport sizing, Escape handling, scroll lock and dialog semantics;
- each seller section remains rendered;
- listing wizard still submits through the canonical vehicle API;
- responsive CSS includes narrow-phone and tablet breakpoints.

**Not certified:** Full production build, authenticated browser journeys, physical Android/iOS testing, live logout/session invalidation, live listing submission, and staging API integration. The supplied environment has Node `22.16.0`, while the project declares `22.22.2`, and dependencies are not installed. Do not treat static source validation as a substitute for these runtime checks.

## Handover notes

No backend schema, API contract, database migration, user role, seller approval rule, or public marketplace route was changed. The changes are limited to the existing app shell, seller workspace UI and its responsive styles.
