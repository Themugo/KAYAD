# KAYAD Landing Route Audit

## Scope and evidence
Reviewed the final-candidate source archive and traced `src/App.tsx`, its query-driven `activeNav` state, `src/features/AuctionsView.tsx`, legacy route redirects and the auction view's URL synchronization.

## Finding
The initial React state is already `marketplace`. However, `AuctionsView` writes `?nav=auctions` into the current URL so auction tabs can be shared. The previous top-level navigation setter changed React state only; it did not canonicalize the URL when the visitor left Auctions. Consequently, `/?nav=auctions` could remain in the address bar and be read on a later load as an instruction to reopen Auctions.

## Change
Added `src/utils/navLocation.ts` as the single small normalization helper and routed the `AppInner` active-navigation setter through it. Moving to Marketplace removes the stale `nav` and `auctionTab` parameters while preserving unrelated query context such as a vehicle detail identifier. Intentional auction navigation remains query-addressable. Existing deep-route redirects and authorization guards are unchanged.

## Regression coverage
Added `src/__tests__/utils/navLocation.test.ts` for clean Marketplace root, intentional auction tab deep link, stale auction query removal and legacy alias handling. Full Vitest/browser execution remains pending because this extracted environment has no `node_modules` and Node is 22.16.0 while `.nvmrc` specifies 22.22.2.

## Runtime status
Source-level cause of the stale navigation state is supported by the code path. Deployed behavior has not been checked against the live site.
