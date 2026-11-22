# 14 — Dark mode: assessment and design proposal (not implemented, awaiting approval)

## Verdict: **NOT SUPPORTED** (as a coherent system)
Evidence (executed, `screenshots/dark-*.png`):
* With `prefers-color-scheme: dark` emulated **and** `class="dark"` / `data-theme="dark"` set on `<html>` (what `ThemeContext` does), the public home, personal dashboard, dealer workspace and admin console **all render the identical light UI**; computed body background stays `rgb(246,250,249)` on every surface.
* No theme provider is mounted in `main.tsx` / `App.tsx`; no workspace renders a theme toggle (`ThemeToggle`, `DarkModeToggle`, `ThemeSettings` exist but are not used); **no CSS file defines `.dark` / `[data-theme=dark]` / dark media rules**; scattered Tailwind `dark:` utilities appear in ~16 files only (home sections, a few UI primitives), so a page can be half-dark if the class is ever applied.
* Scale: **10,987 hard-coded hex colours in 339 component files** and 1,829 inline colour styles, against 3,414 `var(--…)` uses. A tokens-only dark theme would therefore not reach most of the UI.

Consequence: dark mode is neither captured nor certified. Per the brief it is **not** implemented here, and no second colour system was introduced.

## Proposal (one system, tokens first)
1. **Tokens.** Add a `[data-theme="dark"]` override block to the existing contract (`--kayad-*`, `--brand-*`, `--admin-*`) — not new names. Proposed values (contrast measured against WCAG 2.2 AA):

| Role | Value | Pair measured | Ratio |
|---|---|---|---|
| page background | `#071E27` | ink `#E6F2F0` | 14.97 |
| surface | `#0D2D38` | ink `#E6F2F0` | 12.64 |
| muted text | `#9DB7BD` | on surface | 6.86 |
| link / brand on dark | `#5CC8D8` | on surface | 7.39 |
| accent button | `#13B8A6` | text `#06232B` | 6.57 |
| danger text | `#FCA5A5` | on surface | 7.63 |
| success text | `#6EE7B7` | on surface | 9.50 |
| focus ring | `#2DD4BF` | on page bg | 9.22 |
| card border (decorative) | `#2B5461` | on surface | 1.75 — decorative only; any border that *identifies* a control (inputs) needs ≥3:1, e.g. `#4F7C8A` |

2. **Logo.** `kayard-ke-logo-dark.png` (added this phase) is the dark-surface lockup; `BrandMark tone="dark"` already selects it. Light surfaces keep the original.
3. **Components needing work first** (largest blast radius): dashboards' stat tiles and cards (`rgb`/hex inline), tables and forms in admin legacy surface CSS (`kayad-admin-legacy-surface.css`), status badges (`ListingStatusBadge`), dialogs/drawers, charts, the public navbar/footer (approved homepage — owner sign-off needed), image backgrounds behind transparent PNGs.
4. **Migration path.** (a) replace literal hex with tokens file-by-file starting with shared primitives (≈339 files — a mechanical but large change that needs the visual regression run per workspace); (b) mount `ThemeProvider` once; (c) add one toggle per workspace shell (personal, dealer, admin) with `system` default; (d) capture every major screen in dark and run axe contrast again before claiming support.
5. **Decisions needed:** support dark mode at all (yes / only admin / no); whether the approved homepage may be themed; approval of the token values above and of the derived dark logo.
