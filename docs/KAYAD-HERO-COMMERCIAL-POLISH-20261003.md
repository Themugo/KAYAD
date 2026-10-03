# KAYAD Hero Commercial Polish — 2026-10-03

This controlled polish pass preserves the existing two-vehicle homepage hero footprint and adds commercial scheduling without introducing a second hero layout.

## Commercial model

- Sellers can purchase timed Hero Spotlight packages from their vehicle edit surface.
- Payment uses the existing M-Pesa payment lifecycle with a dedicated `hero_placement` payment type.
- Paid requests enter `pending_review` after successful payment.
- Admin assigns the actual start/end window.
- At most two paid hero placements may overlap because the public hero has two visual vehicle positions.
- Active paid placements temporarily take precedence over the normal Featured/Promoted rotation.
- When no paid placement is active, the existing admin `all` / `selected` featured configuration remains authoritative.

## Rotation controls

Admin controls now support:

- Hero sales ON/OFF.
- Equal rotation time using a default seconds value.
- Custom rotation time per featured vehicle.
- Seller-facing package duration and price configuration.
- Paid placement schedule assignment.

## Auction advertising

Auction vehicles retain the same compact hero vehicle card but expose:

- Current / standing bid.
- Reserve price or no-reserve state.
- Auction end timestamp.
- Auction badge.

## Presentation safety

- Existing hero card dimensions are preserved.
- Vehicle artwork continues to use responsive `object-contain` behavior.
- Paid hero vehicles are sourced from their real listing record rather than hardcoded artwork.
- Normal Featured/Promoted inventory remains the fallback.
