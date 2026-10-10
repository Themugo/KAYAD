# KAYAD Last-Build Convergence Report

## Foundation
Input candidate: `KAYAD-FINAL-CANDIDATE-CLOSURE-20261009.zip` (the source archive supplied in this conversation). This pass preserves the current identity, support, marketplace, auction and financial foundations. It does not deploy or apply migrations.

## Completed source changes
- Added `src/utils/navLocation.ts` to canonicalize navigation state and URL parameters.
- Updated `src/App.tsx` so changing navigation updates the URL, removes stale auction-tab state when leaving Auctions, and keeps Marketplace as the clean `/` route.
- Updated `src/features/AuctionsView.tsx` so its tab synchronization no longer unconditionally writes `nav=auctions`; the app-level navigation remains the authority for the active surface.
- Added `src/__tests__/utils/navLocation.test.ts` for clean root landing, intentional auction deep links, stale query removal and alias behavior.
- Added route, auction, admin-content and dealer white-label audit reports.

## Landing route finding
The root state already defaulted to Marketplace, but the Auction view wrote `?nav=auctions` into the current URL. The previous navigation setter did not clear that query when the visitor left Auctions. This could make a later refresh reopen Auctions. The URL and navigation state now stay synchronized.

## Auction starting-soon finding
The public starting-soon request is `/api/auctions?status=draft`. The controller reads published rows from `auction_setups`, filters future `config.startsAt` values, then joins canonical car records. The source migration chain contains `20261002190000_auction_setup_publication_contract.sql`, which creates `public.auction_setups`.

The deployed cause remains unconfirmed because no live Supabase access, deployed HTTP response or backend logs are available here. Missing/unapplied migrations or schema drift are candidates, not established facts. No false empty-list fallback was added. Required runtime check: `select to_regclass('public.auction_setups');` against the exact target project, followed by request/log/build correlation.

## Admin content capability audit
The archive already has a PlatformConfig public projection, protected update endpoint, BrandingContext, branding admin controls, and a CMS API for pages/content/FAQs/campaigns/banners/media/revisions. This pass documents the boundary rather than creating a duplicate CMS. Component-by-component coverage is not proven for every visible string, ticker, slogan or commercial placement.

## Dealer white-label finding
A complete dealer-tenant-scoped branding API and canonical dealer-branded receipt/document renderer were not established in this archive. This pass does not ship a frontend-only or partially authorized implementation. That feature remains explicitly NOT IMPLEMENTED pending a safe integrated schema/API/renderer change and cross-tenant tests. Existing transaction facts must remain sourced from canonical records and `Powered by KAYAD` must remain visible.

## Verification limits
- Environment Node: `v22.16.0`; project `.nvmrc` specifies `22.22.2`.
- `npm ci` correctly refused under strict engine enforcement; retry with engine strictness disabled did not complete within the tool execution window. No full test, typecheck or production build result is claimed for this pass.
- A Node smoke harness exercised the four navigation-helper cases (4/4 passed) after removing TypeScript-only annotations for the harness. The actual focused Vitest file was added but could not be run because dependencies could not be installed.
- Staging and production were not accessed; no deployment or production migration was performed.

## Verdicts
- Marketplace clean-root URL synchronization: source change implemented; automated execution pending.
- Auction starting-soon backend repair: UNCONFIRMED at runtime; no speculative fallback was introduced.
- Existing platform CMS/configuration: capabilities found; full editability across every visible surface not proven.
- Dealer white-label and branded receipts: NOT IMPLEMENTED in this pass; explicitly documented rather than delivered unsafely.
- Local regression/build: BLOCKED by required Node version/dependency installation.
- Staging/production: UNCONFIRMED.
