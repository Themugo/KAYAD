# KAYAD Hero Visual + Commercial Control Foundation — 2026-10-03

## Design contract

The homepage hero is one continuous composition:
- full Nairobi/KICC background fills the hero viewport;
- Toyota Land Cruiser 300 and Mercedes-Benz GLE are the default marketing showcase pair;
- the center `Drive Your Dream Today` card remains the protected focal surface;
- vehicles keep their commercial scale and are positioned outward from the card;
- the dark broadcast ticker remains above navigation;
- featured/auction inventory can later replace the showcase pair without code changes.

## Canonical admin contract

All visual presentation controls are stored in the existing `platform_config.hero_presentation` JSON contract. No second CMS is introduced.

Controls include:
- hero stage height and width;
- center card scale, width, X/Y offset, opacity, blur, border and text color;
- Nairobi background URL, scale and X/Y position;
- overlay colors and opacity;
- vehicle source: marketing showcase / all featured / selected featured;
- showcase vehicle identity, image, eyebrow, tagline and visibility;
- vehicle scale, stage width, vertical position and left/right offsets;
- vehicle information-card visibility;
- CTA colors;
- navigation arrows and rotation dots;
- ticker visibility, fallback text, colors, height and speed;
- add/edit/remove floating promotional cards with position, size, text, colors and opacity.

## Existing systems preserved

- Existing `/api/cars` featured inventory remains authoritative when admin chooses Featured/Selected mode.
- Existing hero slide editor remains available for canonical hero copy/CTA management.
- Existing Ad Manager remains canonical for real top-ticker campaigns.
- Existing auction fields remain authoritative for standing bid, reserve and end time.
- Existing Vercel source deployment contract remains unchanged.

## Deployment guard

The foundation intentionally contains no `.vercel` directory or prebuilt `.vercel/output` artifacts. The repository `.gitignore` continues to exclude `.vercel/`.
