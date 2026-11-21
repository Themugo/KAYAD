# Homepage CTA and component audit (2026-11-21)

The approved homepage was **not changed**: no hero button restored, no layout added. One unused component file was removed after a dependency proof.

## 1. Hero CTA admin settings vs the live homepage — INSPECTED
* `VehicleMarketplace.tsx` always passes a four-item `shortcuts` array (Find a Car / Sell a Car / Auctions / Verified) to `PremiumHero`.
* `PremiumHero.tsx:118` renders `shortcuts` **if present** and only otherwise (`: <>`) renders the `kk-hero__ctas` primary/secondary buttons. Because `shortcuts` is always supplied, the primary/secondary CTA buttons are **never rendered** on the live homepage. `premium-hero.css` still carries `.kk-hero__cta*` rules.
* Consequently these admin controls have **no visible effect**: `HeroEditorPanel` → `ctaPrimaryText`, `ctaSecondaryText` (and their link fields); hero-card `ctaLabel`/`ctaLink` in `HomePageAdminPanel`. Values are still saved and still computed into `heroPrimaryLabel*` in `VehicleMarketplace.tsx` (~913–917, 1127–1132) and passed as props that the renderer ignores.
* Not affected (still live): hero eyebrow/headline/support copy, hero images, vehicle selection, the four shortcuts (hard-coded in code, not admin-editable).

**Recommendation (owner decision; nothing changed):** *Remove* the four dead admin fields from `HeroEditorPanel`/`HomePageAdminPanel` (and the computed `heroPrimaryLabel*`/`onPrimary`/`onSecondary` props and CSS) in a dedicated PR, or, if the owner wants editable shortcuts, *align* by making the shortcut labels/targets configurable. Either way keep the current four-shortcut composition. Until then operators editing those fields see no change and may believe the site is broken. Rank: low risk, medium confusion.

## 2. `DealerBusinessView` — dependency proof, then removed
File: `src/features/DealersView/components/DealerBusinessView.tsx` (24-line stub that rendered "Dealer management unavailable").
| Search | Result |
|---|---|
| Route / lazy import (`App.tsx` lazy list, `AdminRouteSurface`) | none; `DealersView/index.ts` re-exports only `./components/DealersView` |
| Static imports across `src/`, `backend/`, `scripts/`, config, `package.json`, `vite.config.*`, `index.html` | **0** importers |
| Dynamic references (`import(\`…\`)`, `import.meta.glob`, `require(\`…\`)`) | none in `src/` |
| Tests (`src/__tests__`, backend tests) | none |
| Other mentions | three validators assert its **absence** from the public directory (`validate-public-dealer-directory`, `validate-public-facing-convergence-20261012`, `validate-recovery-repair` comment) — deleting the file cannot break them; a SQL comment in `20260710044900_…leads_and_escrow_columns.sql` names the path (comment only, applied migration untouched); handover docs |
**Action:** file deleted (still in git history, so recoverable; nothing committed). After deletion: those three validators plus `validate-dealer-modal-convergence` exit 0; `tsc` result in the verification report.

## 3. Mobile layout observations and approved-reference consistency
**NOT TESTED in this phase.** No browser rendering or screenshot comparison against the approved reference was performed; I cannot claim mobile consistency. Evidence available is code-level only: `premium-hero.css` has breakpoints at 359.98px and ≤ the tablet range, the shortcut nav uses `aria-label="Marketplace shortcuts"`, and `PremiumHero.test.tsx` covers rendering logic (see frontend test totals). Suggested follow-up: Playwright screenshots at 360/390/768/1280 against the approved reference, stored in the repo as the baseline.
