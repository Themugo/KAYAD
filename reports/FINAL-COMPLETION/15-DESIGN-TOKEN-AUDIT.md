# 15 — Design Token Audit

Recount on the working tree (2026-11-22; excludes `__tests__`):
| Measure | Count |
|---|---|
| Hex colour literals in `src/` (tsx/jsx 11,166; ts/js 173; css 1,587) | **≈ 12,926** |
| Files containing a 6-digit hex | 367 |
| Inline `style={{ … #hex … }}` lines | 468 |
| SVG `fill/stroke/stopColor="#…"` | 25 |
| `var(--…)` usages (tsx/jsx/css) | 3,504 |
| Distinct Tailwind arbitrary colour classes (`bg|text|border|…-[#hex]`) | 503 (generator input) |

Dominant colours (case-folded occurrences): `#0a3340` 1,816 · `#64748b` 1,623 · `#176b87` 1,541 · `#d7e7e4` 1,430 · `#12576d` 707 · `#13b8a6` 635 · `#f6faf9` 511 · `#eef7f5` 483 · `#94a3b8` 332 · `#fff` 308 · `#bde5de` 304 · `#5aafa4` 293 · `#ddf4f0` 289 (KAYARD KE navy/teal/aqua family plus slate neutrals; semantic status colours `#ef4444`, `#22c55e`, `#10b981`, `#b91c1c`, `#0f766e`).

## Findings
1. Colour is applied almost entirely as Tailwind arbitrary values (`text-[#0A3340]`, 4,693; `border-[#…]` 1,777; `bg-[#…]` 1,644; `hover:bg-[#…]` 524). A one-by-one migration to named tokens means touching 367 files and risks regressions in tests that assert class names.
2. Brand contract exists as CSS variables (`--kayad-brand-deep #0A3340`, `--kayad-brand-dark #12576D`, `--kayad-brand #176B87`, `--kayad-brand-accent #13B8A6`, `--kayad-brand-muted #5AAFA4`) in `index.css`; it is used by CSS but not by the 4,693 text classes.
3. Two never-mounted theme providers existed (`context/ThemeContext.tsx`, `theme/ThemeProvider.tsx`); no theme code ran at runtime, the app was light-only. Existing `dark:` variants (≈ 110) responded to the OS only (Tailwind 4 default media variant).
4. Inline-style and `.css` hex values (≈ 2,100) are outside any class-based remap.

## Decision
Introduce a **semantic remap layer** instead of a 12,900-site rewrite: `scripts/generate-dark-theme.mjs` derives dark values by property role (surface/text/border) in HSL from each existing colour class, so brand identity (hue) is preserved and the same source of truth stays in the components. Details and limits: doc 16. Migrating components to named semantic tokens remains a recommended follow-up (NOT DONE).
