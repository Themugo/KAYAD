# 03 — Homepage responsive report
Hero content untouched (headline, description, four shortcuts, Land Cruiser artwork, "ILLUSTRATIVE · NOT A LISTING", title/description, carousel arrows/pause/dots). Only layout changed, in a final `@media (max-width: 767.98px)` block at the end of `src/components/home/premium-hero.css` (+ a ≥480px width cap).
Phone order now: copy → shortcut row → car (16:9, full width, never covered) → caption in its own full-width card → carousel controls in their own centred row (36px targets). Verified visually at 320, 390, 600 (`evidence/after/`). Desktop/tablet (≥768) pixel-identical in before/after captures (hero region).
Header: logo readable, search/menu accessible, no duplicate header at 320–600. Category chips: single intentional horizontal scroll row; real filtering confirmed (SUV → empty state with seeded data containing no SUV, All → 8).
Limitation: at 600px the car is capped at 480px wide and centred.
