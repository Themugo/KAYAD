# KAYAD UI/UX Hero Premium Refinement — 2026-09-26

## Scope

This refinement changes only the presentation of the existing homepage hero. It does not introduce a new homepage module or alter marketplace search, vehicle inventory, auctions, escrow, or navigation behavior.

## Visual contract

- Full viewport-width hero surface, while preserving the existing hero/search/inventory order.
- Primary palette remains navy/blue with cool cyan and blue accents. The previous terracotta/orange hero treatment is removed.
- Existing eyebrow, headline, subheadline, two CTAs, slider dots, background and overlay remain the content contract.
- Real vehicle photography replaces the previous illustrated car silhouettes.
- Desktop uses the four-corner composition; smaller screens collapse the media into a compact two-image presentation without introducing new controls.
- Existing search bridge continues to overlap the hero.

## Admin control

The existing backend-persisted Hero Editor remains the source of truth. It now also persists:

- four vehicle image URLs and four labels;
- hero layout (`four-corner`, `media-left`, `media-right`, `centered`).

Promotional and feature messaging continues to use the existing eyebrow/headline/subheadline/CTA fields, so no separate promotional subsystem is introduced.

## Default reference imagery

The fallback imagery uses real vehicle photographs so a fresh installation does not display illustrated silhouettes. The selected references are common Kenya/East-Africa vehicle types; the Probox reference is explicitly documented by Wikimedia Commons as common on Kenyan roads. Administrators can replace all imagery from the Hero Editor.

## Safety/compatibility

- Existing hero API routes remain the same.
- Existing slide CRUD remains the same.
- New presentation fields are additive.
- Legacy slides without the new fields default to the four-corner layout and fallback media.
- Mobile and desktop use the same persisted content contract.
