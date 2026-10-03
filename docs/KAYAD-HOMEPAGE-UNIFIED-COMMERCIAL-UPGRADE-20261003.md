# KAYAD Unified Homepage + Commercial Hero Upgrade — 2026-10-03

## Scope
This pass extends the existing homepage/hero, advertising, featured-vehicle and admin configuration contracts. It does not create a second CMS, second ad system, or second hero renderer.

## Existing foundations reused
- `platform_config.heroCarIds` + `heroFeaturedMode` for featured vehicle selection.
- `/api/hero` + `HeroEditorPanel` for canonical hero headline/background/CTA content.
- `/api/ads` + `AdManagerPanel` + `TopNoticeStrip` for backend-persisted top ticker advertising.
- Existing vehicle/auction fields (`currentBid`, `reservePrice`, `auctionEndsAt`) for public commercial context.

## New platform-config fields
- `hero_presentation`: bounded layout controls for stage height, center-card scale, left/right vehicle offsets and ticker preference.
- `hero_card_content`: per-vehicle optional eyebrow/message/detail/CTA overrides.

The values are stored in the existing singleton `platform_config` row; no parallel configuration service is introduced.

## Public hero behavior
- One continuous hero stage.
- Center card remains the canonical hero message surface.
- Featured vehicle subjects occupy the outer visual zones and are kept away from the center card.
- Featured vehicle information is compact and commercially useful.
- Auction vehicles expose standing/current bid context while retaining the existing authoritative auction lifecycle.
- Admin-authored per-vehicle message/detail can replace the generic hero supporting copy.

## Admin controls
- All featured / selected featured vehicles.
- Hero stage height: 70–120%.
- Center card scale: 70–100%.
- Left/right vehicle outward offset: 0–30%.
- Per-featured-vehicle hero eyebrow, message, supporting detail, CTA label and CTA link.

## Deployment correction
`.vercel/` remains ignored and is intentionally absent from this foundation. Do not commit `.vercel/output` or other generated Vercel build artifacts. The canonical source deployment uses `vercel.json` with `npm ci`, `npm run build`, `dist`, `/api/*` backend rewrite first, then SPA fallback.

Before pushing this foundation from Windows, remove any previously tracked Vercel artifacts with:

`git rm -r --cached .vercel`

then commit the source-only tree.
