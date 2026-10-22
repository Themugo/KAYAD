# KAYAD Master Polish Audit — Stages 11–23 Consolidation

**Date:** 2026-10-12
**Foundation:** `KAYAD-STAGE23-MOBILE-MENU-PHONE-POLISH-20261012.zip`, SHA-256 `40a3b4ec2f0e13b9e13ba10e861242edf49a8e3455a189f061319d90d3aeb663`
**Role of this pass:** independent second-eye verification of the already-completed Stage 11–23 work, using *real* tooling (installed `node_modules`, a real TypeScript compile, a real Vite build, a real Vitest/Jest run, and a real execution of every `scripts/validate-*.mjs` validator) — none of which any prior Stage 11–23 pass in this foundation had access to. Every prior stage's own audit explicitly disclosed that it had no `node_modules` installed and therefore could only run source-text transpilation and string-pattern checks, never a semantic typecheck, a production build, or a real test run.

## Executive summary

The Stage 11–23 work that shipped in this foundation is real and, on inspection, largely sound: the claimed UI/UX changes (mobile menu grid, dashboard duplication removal, public-page fabricated-claims removal, escrow privacy boundary, etc.) are present in the current source, not just described in a report. This pass's job was to verify that under real execution rather than trust the prior reports, and to fix what real execution found that static text-matching could not.

**What real tooling found that no prior pass could:**
- One genuine TypeScript type error (`tsc --noEmit`), invisible to every prior "transpile only" check.
- One genuine runtime crash in `InspectionsView.tsx` (unhandled promise rejection on an inconsistent optional-chaining pattern between two sibling branches of the same function).
- One duplicate, identically-labelled CTA (`Open your dashboard`) rendered twice on the public Escrow page — a real accessibility/UX defect (ambiguous accessible name), not a test artifact.
- One genuinely stale frontend test (`escrowDeepLink.test.tsx`) asserting a capability (`?escrowId=` inline deal rendering) that Stage 22's own documented privacy fix deliberately removed from the public page — confirmed by grep that the current component contains zero references to the API call or query param the test exercises.
- One test-selector ambiguity in `supportFaq.test.tsx` (a loose `button`-name regex matching both the category filter and an FAQ row that happens to contain the same text) — fixed by giving the filter bar correct `role="tablist"`/`role="tab"` semantics, which is itself a genuine accessibility improvement, not just a test workaround.
- One backend test with an inverted, logically-impossible assertion (`auctionListSoftDelete.test.js` compared a timestamp against a *later* `Date.now()` call with the wrong inequality direction) — confirmed to fail deterministically on every run, not intermittently, ruling out flakiness as the cause; the controller's actual behavior was already correct.
- Two validators (`validate-final-system-surface-guard.mjs`, `validate-messaging-notification-surface-20261012.mjs`) pinned to an exact literal source string that a legitimate, documented, more-restrictive prior-stage change (adding `escrow-operations` to the protected-nav set) or this pass's own `tsc` fix had moved past.

All of the above are fixed in this pass, each with the narrowest possible diff, and each is traceable to real tool output (see `KAYAD_VALIDATION_MATRIX.tsv` and the regression log below). None of these fixes touch authentication, authorization, RLS, payment, escrow, or auction business logic — they are a type annotation, an optional-chaining operator, a button label, two test files, and two validator regexes.

**What this pass did NOT do:** redesign any page, introduce a new design system, add new routes, or revisit the substantial Stage 11–22 visual/content work already present in the foundation (removing fabricated trust metrics, the seller/dealer profile cleanup, the escrow boundary fix, the sell/auth convergence, etc.) — that work was inspected and spot-verified against source, not redone, per the brief's instruction not to restart or duplicate completed work.

## Foundation verified

- Input zip SHA-256 recorded above, size 29,682,702 bytes, extracted cleanly.
- Node: `.nvmrc`/`.node-version`/`package.json` engines all require `>=22.22.2`; sandbox runs `v22.22.0` — same, disclosed, one-patch-version gap as every prior stage. `npm install --engine-strict=false` used as a one-time CLI override, not persisted to `.npmrc`.
- Prior stage reports (`KAYAD_STAGE11`…`KAYAD_STAGE23_*`) are present in the tree and were spot-checked against actual source (see examples above); their claimed source-level changes exist in the code, not only in the reports.

## Route inventory (from the live router, `src/App.tsx`)

See `KAYAD_ROUTE_UX_MATRIX.tsv` for the full matrix. Routes found: `/`, `/marketplace`, `/gallery`, `/auction`, `/auctions`, `/sell`, `/sell-car`, `/sell-vehicle`, `/support`, `/escrow`, `/financing`, `/inspections`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/force-password-change`, `/dashboard`, `/profile`, `/saved`, `/payments`, `/chat`, `/notifications`, `/buyer-platform`, `/dealer`, `/dealer/onboarding`, `/dealer/auction-setup`, `/dealer/auction-operations`, `/inspector/dashboard`, `/admin`, `/admin/login`.

## Design tokens verified present and in use

`src/index.css` defines the canonical palette as actual CSS custom properties, confirmed by direct read (not assumed from a report): deep teal `#0A3340`, slate/brand teal `#176B87`, mint accent `#13B8A6`, aliased consistently across `--kayad-brand-*` and `--brand*` token groups. See `KAYAD_DESIGN_SYSTEM_CONVERGENCE.md`.

## Findings (ranked)

| ID | Severity | Route/Component | Finding | Evidence | Fix applied |
|---|---|---|---|---|---|
| F1 | P1 | `src/context/NotificationContext.tsx` | `errorKind` property widened to `string` by TS inference, breaking the `NotificationContextValue` contract | `tsc --noEmit` TS2322, reproducible | Added explicit type annotation to the `const`; zero runtime change |
| F2 | P1 | `src/features/InspectionsView.tsx` | Unhandled rejection: `kayad.value.orders` crashes when `kayad.value` is undefined; sibling `provider` branch already guards with `?.` | Vitest unhandled-rejection trace, reproducible on identity-switch test | Added matching `?.` |
| F3 | P2 | `src/features/escrow/PublicEscrowExplainer.tsx` | Two sections render an identically-labelled `Open your dashboard` button for a signed-in visitor on the same page — ambiguous accessible name | Vitest `TestingLibraryElementError: Found multiple elements`, confirmed by grep (two literal occurrences) | Relabelled the general-nav-block instance to `Go to your account`; identical `onClick` behavior preserved |
| F4 | P2 | `src/features/SupportFAQ.tsx` | Category filter bar uses bare `<button>` with no tab semantics; ambiguous for both assistive tech and test queries | Vitest `Found multiple elements`; a11y review | Added `role="tablist"`/`role="tab"`/`aria-selected` — genuine accessibility fix, not just a test workaround |
| F5 | P3 (test-only) | `src/__tests__/features/escrowDeepLink.test.tsx` | Tests inline `?escrowId=` deal rendering on the public `EscrowView`, a capability Stage 22 deliberately removed (confirmed: zero references to `getMyEscrowOverview`/`escrowId` in `EscrowView.tsx`) | grep + contradicting, currently-passing assertion in `EscrowView.test.tsx` | Rewrote to assert the current, correct (privacy-preserving) behavior; documented why in-file |
| F6 | P3 (test-only) | `backend/tests/auction/auctionListSoftDelete.test.js` | Asserted `auctionEnd.$gt` strictly greater than a `Date.now()` call made *after* the value was captured — mathematically backwards given both filter fields share one `now` snapshot | Jest failure reproduced on 3 consecutive runs (not intermittent) | Corrected direction to match the sibling assertion directly above it |
| F7 | P3 (validator-only) | `scripts/validate-final-system-surface-guard.mjs`, `scripts/validate-messaging-notification-surface-20261012.mjs` | Exact-literal-string checks pinned to source text that a documented, more-restrictive Stage 21 change (`escrow-operations` added to protected set) and this pass's F1 fix had moved past | Diff against current source, cross-referenced against Stage 21's own audit | Updated regex/string to match current (more-restrictive / behaviorally-identical) source |

No P0 findings (no security, data-exposure, or destructive-regression issues were found in this pass).

## Not verified in this pass (honest gaps)

- **No browser/visual rendering at any viewport width.** No screenshot, Playwright, or real-device evidence of the Stage 11–23 UI claims (mobile menu grid, dashboard identity accents, etc.) was produced in this pass or any prior one. `KAYAD_STAGE23_MOBILE_MENU_PHONE_POLISH_AUDIT_20261012.md` says the same explicitly. **Still required before shipping:** a real browser check at 320/340/360/375/390/412/430/768px.
- **No staging or live-provider certification.** `validate-communications-provider-certification`, `validate-live-runtime`, `validate-local-supabase` all fail for disclosed, non-code reasons (no provider credentials, no Supabase URL, no Docker daemon) — identical to every prior pass's disclosed gap.
- **Node patch version** remains `v22.22.0` vs. the pinned `>=22.22.2`; `validate-phase6-release` and `validate-v14-runtime-preflight` fail on this one check only.
- The deep per-route, per-breakpoint design critique the full brief asks for (every public/portal route judged against every criterion in Sections 3–12) was not re-done from scratch in this pass; Stages 11–22's own documented, source-verified work covers most of that ground already and was spot-checked, not re-litigated. A genuinely fresh, independent critique of all ~30 routes against the full criteria list is a multi-day effort beyond this pass's scope — flagged rather than fabricated.

## Regression evidence (real, this pass)

| Layer | Result |
|---|---|
| Root `npm install` (engine-strict override) | PASS, 0 vulnerabilities |
| `tsc --noEmit` | **PASS, 0 diagnostics** (after F1 fix; 1 error before) |
| `vite build` | **PASS** (chunk-size advisory only, not an error) |
| Frontend Vitest | **PASS, 81/81 files, 645/645 tests, 1 honest skip** (after F2–F5 fixes; 3 files / 5 tests failed before) |
| Backend `npm install` | PASS; `npm audit --omit=dev` 0 vulnerabilities (22 dev-only advisories, not shipped) |
| Backend Jest | **PASS, 79/79 suites, 1159/1159 tests** (after F6 fix; 1 suite / 1 test failed before) |
| Backend Vitest | PASS, 5/5 files, 16/16 tests |
| Backend node:test | PASS, 1/1 |
| Backend boot (`node bootstrap.js`) | PASS, real `/health` → `degraded` (correct without live Supabase credentials) |
| Validator battery (197 scripts) | **192/197 PASS** (after F7 fixes; 190/197 before), remaining 5 traced to 3 disclosed environment gaps (no live credentials, no Docker, Node patch version) |

## Confirmation

No commit, push, deployment, database migration, production configuration change, payment, or live account mutation was performed during this session. All work is local to this pass's working tree, now packaged into the delivered zip.
