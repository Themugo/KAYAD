# KAYAD Phase 56 — Dealer Finance & Team Authority Hardening

## Objective

Remove false confidence from the dealer Finance and Team capabilities while preserving the existing buyer finance implementation and live dealer operations.

## Findings

The authoritative Supabase migration chain does **not** define either:

- `loan_applications`
- `dealer_teams`

Both names exist in the compatibility/model and legacy route layers. The buyer-facing financing flow already uses the `LoanApplication` model, so the model mapping was intentionally **not** deleted. Instead, the dealer platform must not pretend that an unverified dealer-scoped finance table exists.

Likewise, dealer team routes referenced `dealer_teams`, but the canonical migration chain does not provide that table. The dealer platform therefore cannot safely display or mutate team membership until a real dealer-scoped schema contract exists.

## Implemented

- Dealer Finance endpoint now returns an explicit `501 DEALER_FINANCE_UNAVAILABLE` capability response instead of querying an unbacked table and producing a runtime failure or misleading records.
- Dealer Team read/write handlers now return an explicit `501 DEALER_TEAM_UNAVAILABLE` capability response.
- Removed fabricated team members, synthetic invitation IDs, and synthetic invite links from the dealer platform controller.
- Preserved the existing buyer finance model and routes because those are separate existing application flows and were not proven safe to remove.
- Preserved Phase 55 real Auctions, Inspections, and Analytics integrations.
- Preserved the dealer dashboard's honest unavailable state for Finance and Team.
- No migration, table, demo data, Supabase Auth conversion, or speculative schema was added.

## Why this is Claude-Code-safe

The code now makes the repository's actual capability boundary explicit:

`authenticated dealer request -> known contract -> real data`

When the contract is absent, the API returns a typed capability-unavailable response rather than silently inventing data or failing because a non-migrated table was queried.

This keeps the compatibility layer intact for existing flows while making unsupported dealer capabilities deterministic and reviewable.

## Validation

Run:

```text
node scripts/validate-phase56.mjs
node --check backend/controllers/dealerPlatformController.js
```

Then run the normal repository lint/build/backend test commands in the user's Windows checkout before committing.
