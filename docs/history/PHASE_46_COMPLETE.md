# KAYAD Phase 46 — Authoritative Marketplace Card Presentation Hardening

## Objective

Continue the marketplace consolidation by ensuring the primary vehicle card never invents vehicle, seller, or media facts when the authoritative backend payload does not provide them.

## Changes

- Removed the primary marketplace card's fabricated stock vehicle-image fallback.
- Added an explicit `Vehicle image unavailable` state when the authoritative vehicle has no image URL.
- Removed the fabricated Nairobi location fallback.
- Removed the fabricated Automatic transmission fallback.
- Removed the implicit `Verified Dealer` seller identity fallback.
- Preserved real seller identity when supplied by the backend mapper and otherwise shows `Seller information unavailable`.
- Kept verification indicators tied to the vehicle's real `verified` field rather than inferred identity.
- Preserved the existing real auction countdown, pricing, save, compare, and detail interactions.

## Scope boundary

This phase targets the **primary marketplace card used by `VehicleMarketplace`**. It does not invent or add a new backend contract, database table, or storage bucket.

Legacy/alternate card implementations remain separate technical debt and should be handled only when their actual production ownership is established.

## Validation

Run `node scripts/validate-phase46.mjs`.

Completion requires 7/7 checks plus the existing Phase 40–45 regression suite, TypeScript lint, production build, and `git diff --check`.
