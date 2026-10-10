# KAYAD Homepage / Inventory Wholesale Fix — 2026-09-26

## Scope
- Fixed the 3/4/5 inventory controls by moving container-query ownership to the result-area parent.
- Preserved the existing 12 / 24 / 48 server pagination controls.
- Kept the mandatory desktop filter sidebar and mobile filter drawer.
- Reworked the hero into a clean two-vehicle smooth fader: one real featured vehicle on each side, no four-window collage and no background vehicle card.
- Hero imagery, headline facts and narration are derived from the real promoted/featured vehicle feed.
- Added admin selection for all featured vehicles or an explicit selective subset. Selection persists through the existing protected PlatformConfig endpoint and is exposed through the existing public config contract.
- No new commerce, listing, escrow, auction or payment behavior was introduced.
