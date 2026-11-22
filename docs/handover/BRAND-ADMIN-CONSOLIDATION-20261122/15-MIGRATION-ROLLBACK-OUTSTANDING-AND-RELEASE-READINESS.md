# 15 - Migration assessment, rollback plan, outstanding issues, reconciliation and release readiness

## 1. Migration assessment
This phase adds **no database migration** and changes no schema, function or data. Hosted Supabase was accessed read-only (SELECT) only. The disposable-database harness applied all 209 repository migrations cleanly (209/209) and 20 journeys pass.

Pre-existing hosted drift (not caused by this phase, still unresolved): hosted project "KAYAD EA" migration history ends 20260922; about 86 repository migrations are unapplied (including the dealer lifecycle function `kayad_dealer_listing_lifecycle_atomic` and `dealer_listing_counters`); hosted has `market_data` and `ntsa_verification_requests` with no repository migration; hosted lacks reports, feedback, announcements, automation_tasks, feature_flags and `bids.is_suspicious` (D-20). **Deploying this code to the hosted database before reconciling it would break dealer listing lifecycle and numbering.** Applying hosted migrations needs explicit owner approval and a staged plan (not done).

## 2. Rollback plan for this phase's code
All changes are uncommitted in the worktree and delivered as a patch against a652701. Rollback = do not apply the patch, or `git apply -R` the patch, or revert the commit once one exists. No data migration to undo. Highest-risk pieces, each independently revertible:
1. Global focus ring (`src/index.css`, `kayad-navigation.css`, `kayad-theme-convergence.css`, `homepage-redesign.css` line 49): cosmetic.
2. Admin dashboard grid fix (one CSS rule): revert restores the broken layout.
3. White-on-teal to navy-on-teal text in 6 components: cosmetic.
4. Two validators with conflict markers resolved (scripts only).
5. `public/branding/kayard-ke-logo-dark.png`: derived asset, needs owner approval; delete to fall back to the light logo.

## 3. Approved-homepage disclosure
The brief says to preserve the approved homepage. Changes that can reach it: (a) global focus-ring colour rule in `index.css`, (b) one `outline` colour on `.kayad-home-quick-action:focus-visible` (`homepage-redesign.css` line 49, from `#13B8A6` to `#0F766E`), (c) shared `CarCard` badge text colour. No layout, copy, CTA or hero control was changed. If the owner wants the homepage byte-identical, revert (b) and the `CarCard` change; the hero dot size (A-12) was deliberately NOT changed.

## 4. Owner decisions outstanding
D-1..D-16 carried forward and preserved (D-13 legacy `pending`, D-14 no stored rejected, D-15 staff pause/publish, D-16 legacy files retained).
New: D-17 per-owner vs platform-wide listing numbering; D-18 payout destination (profile phone vs saved settlement details); D-19 personal payout details; D-20 missing/drifted hosted tables and columns; D-21 17 admin routes with no nav link. Also: approve the derived dark logo; dark-mode support (doc 14 proposal); least-privilege observations and UI/API nav mismatches (doc 11); A-09 (403 presentation) and A-12 (homepage hero dot size and teal rings).

## 5. Reconciliation table (addendum section 5)

| Outstanding item | Evidence | Final status |
|---|---|---|
| Phase 7 state coverage | doc 03 + `evidence/states-*.json` (135 probe runs). Dealer: all 15 sections show error + working retry; personal: all 10 read sections; Settings verification card fixed. Gaps: 403 shown as generic failure on dealer (A-09), no systematic stale indicator, admin/staff pages not individually probed, writes not re-probed | **Partial** |
| Dark mode | doc 14, `screenshots/dark-*.png`: no consumer of the theme class; not supported | **Not supported** (proposal only; nothing implemented, as required) |
| Contrast | doc 12 register (29 token pairs) + axe 0 violations on 56 section views + public/personal/dealer sweeps; focus ring fixed. Residual: public hero dot target size, `#CBD5E1` form borders unassessed, 8 focus readings measured conservatively | **Verified for the measured pairs; residual items listed as open** (not a compliance claim) |
| Screen-reader audit | No assistive technology available. axe and scripted keyboard only | **Not tested** (remaining: NVDA/VoiceOver/TalkBack pass, listed in doc 12) |
| Staff workspace | doc 11: 10 roles x UI capture (20 screenshots) + direct-API GET matrix. Gaps: per-role create/edit/approve writes not exercised, System Owner not seeded, UI over-lists nav items the API refuses | **Partial** |
| Four D-16 legacy files (actually six files; four pages + two tab components) | `D16-LEGACY-FILES-REGISTER.md`, `@deprecated` markers, guard test, 7 dependent validators still pass | **Retained** (nothing deleted; deprecation plan documented) |

## 6. Outstanding issues
Defects and exceptions: doc 12 section 4 (A-09..A-13). Not done: Admin Console navigation rationalisation and premium redesign (doc 08), repeated-function consolidation (doc 06, all statuses are recommendations), listing-number concurrency stress test, real Cloudinary/M-Pesa, per-role staff writes, dark mode, PDF/receipt/Android/iOS icon assets audit. Flaky pre-existing test: `visitorAnalytics.test.js` (timing).

## 7. Release-readiness assessment
**NOT release-ready.** Blockers: hosted database not reconciled with the repository (about 86 unapplied migrations, drift, D-20); integrations (Cloudinary, M-Pesa, provider email) untested end to end; 3 validators blocked by environment; screen-reader audit not performed; owner decisions D-17..D-21 and approvals pending; Admin Console redesign and duplication consolidation not done. What is solid: the code in this worktree typechecks, builds, passes the frontend, backend, node and DB-journey suites (with one known flaky test), and the dealer lifecycle, banking, numbering and permission controls verified in the disposable database.
