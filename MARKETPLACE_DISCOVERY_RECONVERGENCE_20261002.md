# KAYAD Marketplace Discovery Re-convergence — 2026-10-02

## Purpose

Restore the marketplace's primary discovery hierarchy to the earlier KAYAD automotive direction while preserving the current real-data, filter, auction, save, compare, inspection, escrow and admin contracts.

## Problems identified from the current local rendering

- A dashboard-like premium header, stats block, journey rail and trust strip appeared before the actual automotive hero, pushing the marketplace experience below the fold.
- The visual hierarchy duplicated the hero message and consumed excessive vertical space before inventory discovery.
- Category discovery from the earlier marketplace concept was missing from the immediate post-hero flow.
- The existing `featuredPicks` computation was real and useful but was not rendered, leaving a gap between hero/filtering and the full inventory.
- A failed catalogue request surfaced as `0 vehicles`, which can be misread as an empty catalogue rather than a backend availability failure.
- Server-error recovery did not provide a retry path for the component's own paginated catalogue request.
- The default `onNavigate` callback had an overly narrow inferred signature, producing avoidable type diagnostics when called with a route identifier.

## Re-convergence changes

1. Removed the extra DomainPremium header/stats/journey/trust stack from the marketplace entry surface.
2. Restored a compact marketplace context line so the hero becomes the primary visual/title hierarchy.
3. Added a horizontal category strip immediately below the hero, wired to the existing body-style/fuel filters.
4. Reintroduced the existing real `featuredPicks` computation as a three-card KAYAD Select section. No mock vehicles or new data source were introduced.
5. Kept the existing real search bridge, server pagination, filters, sorting, grid/list controls and inventory authority unchanged.
6. Changed catalogue failure presentation from an apparent zero-result state to an explicit temporary-unavailable state with a retry action.
7. Added an internal retry key so the marketplace's own `/api/cars` request can be retried without rebuilding or navigating away.
8. Prevented hero signal counters from claiming zero inventory while the authoritative request is failing; they display `—` instead.
9. Corrected the default `onNavigate` callback signature to accept the existing navigation identifier contract.

## Explicit non-changes

- No auction rules were changed.
- No escrow/payment/ledger authority was changed.
- No ownership or fulfilment flow was changed.
- No mock inventory was introduced.
- No second marketplace data authority was introduced.
- No backend API contract was invented.
- No Vercel/DNS configuration was changed in this pass.

## Validation

- TypeScript/TSX syntax transpilation: PASS for `VehicleMarketplace.tsx`.
- Full `npm ci` / Vite build not run in this environment because the repository requires Node >=22.22.2 and the audit runtime is Node 22.16.0.
- Final Windows certification must be run on the user's Node 22.22.2 environment.
