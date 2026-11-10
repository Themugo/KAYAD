# KAYAD homepage search metadata remediation — 10 November 2026

## Scope
Corrected the static homepage `<title>` and meta description in `index.html`. No service, payment, inspection, financing, escrow, routing, or UI behavior was changed.

## Evidence-based product boundaries reviewed
- Vehicle details state that inspection reports, where present, are provided by independent inspection providers and are not carried out by KAYAD. Inspection scope, provider credentials, and package/pricing depend on the selected provider.
- Escrow is conditional: the public homepage says it may be available for eligible listings when the programme is active. Backend custody creation requires the configured rules to pass and an active administrator-configured custody bank account; escrow funding uses bank transfer. This does not support a blanket claim of bank-secured protection for every transaction.
- The public financing surface is a calculator/application flow, not proof that KAYAD is a lender or that a lender offer is available. Existing platform validation records explicitly require the public financing boundary to say KAYAD is not a lender and not to render lender offers.
- No source evidence was found in the current public product implementation to substantiate a universal “150-point” inspection promise or NTSA TIMS logbook clearance service.

## Metadata now published
Title: `KAYAD | Buy, Sell & Bid on Vehicles in Kenya`

Description: `Discover vehicles, connect with sellers, explore live auctions and find independent vehicle inspection services on KAYAD. Optional escrow is available only for eligible listings under the applicable custody terms. KAYAD is a marketplace, not a lender.`

## Validation
- Added `scripts/validate-homepage-search-metadata.mjs` and npm script `validate:homepage-search-metadata`.
- Validator checks the supported product descriptions and rejects the unsupported 150-point, TIMS/logbook clearance, bank-secured, and blanket verified-marketplace claims.
- This is source-level validation. Search-engine rendered snippets, deployed HTML, and external search indexing were not tested.
