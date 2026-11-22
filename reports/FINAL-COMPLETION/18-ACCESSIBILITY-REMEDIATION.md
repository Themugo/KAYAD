# 18 — Accessibility Remediation

Changes this phase: failure states use `role="alert"` with `data-load-state`, retry hidden when pointless (14); ThemeSwitcher built with `role=radiogroup`/`aria-checked` and arrow-key navigation (not mounted).
| Finding | Action | Status |
|---|---|---|
| Homepage `color-contrast` (4 nodes) | needs homepage text-colour change | OWNER APPROVAL REQUIRED (not changed) |
| Homepage `target-size` (5 nodes) | enlarge hit areas of carousel/nav buttons | OWNER APPROVAL REQUIRED (not changed) |
| Dark-theme contrast (dashboards 1–8 nodes each) | fix before enabling dark | OPEN |
| Keyboard/screen-reader manual passes | need assistive tech | NOT DONE |
Re-run after any change: `ci/browser/audit.mjs` (needs the stack from `ci/db-journeys/run.sh` with `KAYARD_BROWSER_HOLD`, see header of `99_browser_hold.mjs`).
