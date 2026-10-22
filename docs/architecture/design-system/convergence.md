# KAYAD Design System Convergence — Verified Snapshot

**Date:** 2026-10-12
**Scope of this document:** records the canonical tokens as they actually exist in `src/index.css` and related files at the time of this pass (verified by direct read, not assumed from a prior report), plus the two accessibility-semantics additions made in this pass. It does not introduce a new palette or system — per the brief's explicit restriction, Stage 11–22's existing convergence work is preserved as-is.

## Canonical color tokens (confirmed present, `src/index.css`)

| Token | Value | Role |
|---|---|---|
| `--kayad-brand-deep` / `--brand-dark` / `--brand-900` | `#0A3340` | Deep teal — primary brand, headers, dark surfaces |
| `--kayad-brand` / `--brand` / `--brand-600` | `#176B87` | Slate teal — secondary brand, links, active states |
| `--kayad-brand-accent` / `--brand-light` | `#13B8A6` | Mint accent — CTAs, focus rings, success-adjacent accents |
| Soft surface | `#F6FAF9` | Page/card background |
| Border | `#D7E7E4` | Card/section borders |

These are used directly (not re-derived) throughout the public escrow, support, and navigation surfaces inspected in this pass (`src/features/escrow/PublicEscrowExplainer.tsx`, `src/features/SupportFAQ.tsx`, `src/components/Navbar.tsx`, `src/styles/kayad-navigation.css`).

## Typography, icons, spacing

Not re-audited from scratch in this pass (see `KAYAD_MASTER_POLISH_AUDIT.md` "Not verified" section). Prior stages' documented work (Lucide icon system, responsive type scale) was spot-checked only where it intersected with this pass's fixes:
- `src/features/escrow/PublicEscrowExplainer.tsx` buttons use the existing `min-h-[44px]` touch-target convention consistently across all CTAs in both affected sections.
- `src/features/SupportFAQ.tsx` category icons are Lucide (`UserRound`, etc.), consistent with the rest of the app.

## Accessibility semantics added in this pass

| Component | Before | After | Reason |
|---|---|---|---|
| `src/features/SupportFAQ.tsx` category filter bar | Plain `<button>` elements with no group semantics | `role="tablist"` on the container, `role="tab"` + `aria-selected` on each button | The filter functions exactly like a tab group (select one category, content below changes); giving it correct ARIA semantics helps screen-reader users understand the relationship, and incidentally resolves a real accessible-name collision with FAQ accordion rows that happened to contain the same category text |

## Known, carried-forward gap (not touched in this pass)

`src/features/escrow/PublicEscrowExplainer.tsx` renders two separate CTA blocks aimed at a signed-in visitor (`WhatYouCanDoNext` and `HowDealsStart`), each ending in a dashboard-opening button. This pass relabelled one (`Go to your account`) to remove the accessible-name collision, but did not consolidate the two blocks into one. A future polish pass could judge whether both CTA blocks are still needed on one page — flagged, not fixed, since removing either block changes page content/structure beyond this pass's narrow-fix mandate.
