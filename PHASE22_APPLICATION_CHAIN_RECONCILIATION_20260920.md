# KAYAD Phase 22 Application-Chain Reconciliation — 2026-09-20

Source: Phase 8–21 reconciled historical application tree.
Database authority: live Supabase project `ubvgixwhfybbyjuvxboj`.

## Application-layer convergence

The application now routes Phase 22 privileged operations through canonical Supabase RPCs rather than direct privileged table mutation:

- provider registration -> `kayad_create_inspection_provider_application`
- nearby provider discovery -> `kayad_find_nearby_inspection_providers`
- report access -> `kayad_get_inspection_report_access`
- second-buyer report purchase -> `kayad_purchase_inspection_report_download`
- review -> `kayad_submit_inspection_review_atomic`
- inspection dispute/evidence -> canonical Phase 22 RPCs
- service-job lifecycle/dispute/evidence -> canonical Phase 22 RPCs
- admin dispute resolution -> canonical admin RPCs
- settlement payout remains on `kayad_mark_inspection_settlement_paid_atomic`
- refund remains on `kayad_process_inspection_refund_atomic`

The existing provider dashboard, listing/package, availability/slot, booking, report and settlement surfaces remain in place.

## Chain boundary

Provider registration -> approval -> dashboard -> service listing -> availability -> nearby search -> inspection booking -> payment -> inspection execution -> locked report -> second buyer report purchase -> provider revenue -> review -> dispute -> admin approval -> refund -> ledger -> provider risk/scorecard -> suspension -> audit -> vehicle lifecycle closure.

The database/domain chain had already been live-tested. This package brings the application adapters/routes onto those canonical contracts.

## Validation

`node scripts/validate-phase22-application-reconciliation.mjs` => `PHASE22_APPLICATION_RECONCILIATION_PASS`

Node/npm dependency gate could not run in this environment because the source declares Node `>=22.22.2` while this runner has Node `22.16.0`. No claim of npm/test/build/browser certification is made from this environment.
