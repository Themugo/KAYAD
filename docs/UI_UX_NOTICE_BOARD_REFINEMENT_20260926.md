# UI/UX refinement — top notice board

## Scope

This refinement changes the existing top-of-page notice surface only. It does not add a separate notification architecture.

## Changes

- Removed the rotating trust text, region selector, price-alert text, and sign-in text from the utility strip inside `Navbar`.
- `TopNoticeStrip` is now the sole broadcast strip above the main navigation.
- The strip remains a compact dark/black TV-style notice board.
- Existing persisted `top_ticker` advertising entries drive its content.
- Added admin-configurable presentation modes: right-to-left scrolling or fade between notices.
- Added persisted scroll speed and fade duration controls.
- Existing visibility, ordering, colors, opacity and links remain admin-controlled.
- No new product workflow or business capability was introduced.

## Behaviour

- With no visible `top_ticker` entries, the strip remains absent rather than showing hardcoded copy.
- Scroll mode loops the configured notices continuously and pauses on hover.
- Fade mode rotates through configured notices with an accessible live region.
- The existing main navbar remains the canonical navigation surface.
