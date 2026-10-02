# KAYAD Auction Phase 8 — Winner, Payment, Optional Escrow & Platform Policy

## Canonical business model

KAYAD is the platform provider. The dealer/seller creates the auction rules in the configuration dashboard. KAYAD admin defines the permitted configuration envelope and can disable capabilities platform-wide.

Escrow is **optional for dealers**. An auction may use either `direct` settlement or `escrow` settlement when KAYAD policy permits both. KAYAD does not silently convert direct settlement into escrow.

## Lifecycle

`LIVE -> OUTCOME -> PAYMENT_DUE -> PAYMENT_RECEIVED -> COMPLETED`

Optional escrow branch:

`PAYMENT_DUE -> PAYMENT_RECEIVED -> ESCROW_PENDING_FUNDING -> ESCROW_RELEASE -> COMPLETED`

Exceptions:

`NO_SALE`, `DEFAULTED`, `RE_AWARD_PENDING`, `DISPUTED`, `CANCELLED`.

## Dealer configuration

The published auction setup now carries `settlement.mode`:
- `direct`: winner pays the dealer/seller through the configured direct settlement flow.
- `escrow`: winner payment is handled through the configured custody/escrow flow.

The published configuration remains immutable.

## KAYAD admin control plane

`auction_platform_policies` defines the permitted envelope, including settlement modes, re-award permission and payment deadline limits. Dealer configuration is accepted only when it remains inside that envelope.

## Important financial correction

The previous payment controller behavior that implicitly normalized `buy`/`direct` into escrow is removed. Auction settlement mode is now derived from the published auction contract.

## Certification scope

Static Phase 8 contract checks cover setup defaults, platform policy, outcome creation, settlement mode, optional escrow, winner-payment convergence, payment type support, admin policy controls, and migration integrity.

Live Supabase/payment-provider/browser certification remains environment-dependent and is not claimed here.

## Dealer dashboard

The Auction Setup Wizard now exposes the settlement mode directly to the dealer:
- Direct settlement
- Escrow — optional, only when enabled by KAYAD platform policy

The selected mode is stored in the published auction configuration and becomes immutable after publication.

## KAYAD administrative authority

KAYAD administrators can control the permitted settlement modes and other auction-policy limits from the platform policy endpoint. Dealer choices are therefore business-owned but platform-governed.
