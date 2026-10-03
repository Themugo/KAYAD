# KAYAD Homepage Unified Composition — 2026-10-03

Controlled polish pass based on the approved visual direction.

## Visual contract
- One continuous panoramic hero stage; no shortened background rectangle or exposed band.
- Dark broadcast ticker above the navigation. Existing Ad Manager `top_ticker` records remain authoritative; a branded fallback scroll appears when no records are active so the strip does not disappear.
- `Drive Your Dream Today` remains the primary hero message.
- Center card is reduced to 80% by default for a lighter editorial footprint.
- Featured vehicles retain their current size and are positioned outward from the center card.
- The two vehicle positions remain the same hero stage; no new layout or feature surface is introduced.

## Admin positioning controls
Hero Commercialisation now stores and exposes:
- `layout.stageHeightPct`: 70–120, default 100
- `layout.leftOffsetPct`: 0–30, default 12
- `layout.rightOffsetPct`: 0–30, default 12
- `layout.centerCardScalePct`: 70–100, default 80

These values are clamped server-side in `heroPlacement.service.js` and editable from the existing admin Home Page controls. They tune the composition without replacing the hero architecture.

## Commercial compatibility
Paid hero placements, equal/custom rotation, selected/all featured vehicle selection, auction details, and seller hero packages remain on the existing paths. No new payment or listing workflow was introduced.
