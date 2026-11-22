# 13 — Mobile and Responsive Tests

**VERIFIED (real Chromium, real backend, authenticated sessions) on the final code.** `ci/browser/audit.mjs`; raw data `evidence/browser-light/audit.json`, `evidence/browser-dark/audit.json`; screenshots (320, 390, 1280) in `evidence/browser-*/shots/`.

Matrix: 9 surfaces × widths **320, 360, 390, 430, 768 (tablet), 1024, 1280, 1440, 1920** × light and dark = **162 runs: 0 horizontal page overflow, 0 errors, 0 unexpected redirects to login**.
Surfaces: home, login, marketplace, dealer overview / inventory / banking / settings (owner session), personal dashboard, personal profile.

| Requirement | Status |
|---|---|
| 320/360/390/430 phones | VERIFIED (no overflow) |
| Tablet 768, 1024 | VERIFIED |
| 1280, 1440, larger (1920) | VERIFIED |
| Real touch devices, iOS Safari, Android Chrome, orientation change | **NOT TESTED** (emulated viewport only) |
| Pages beyond the 9 surfaces (auctions, escrow, inspections, admin, checkout) | **NOT TESTED** in this phase (admin covered by the prior phase's 6×9 run) |
| Visual diff against a prior baseline | NOT DONE (no stored baseline for this phase) |
Touch-target size on the homepage is a separate finding (doc 17: `target-size`, 5 nodes).
