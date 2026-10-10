# STAGE 11 — SURFACE CONVERGENCE MATRIX
**Date:** 2026-10-08
**Scope:** Phase B (design-token convergence), Phase C (iconography convergence), Phase D (reduced-motion convergence).

---

## Part 1 — Design Token Convergence (Phase B)

**Finding:** There was never a true 3-way conflict. `src/index.css` defines one canonical "KAYAD Slate Teal" palette as CSS custom properties (`--kayad-brand-deep`, `--kayad-brand-dark`, `--kayad-brand`, `--kayad-brand-accent`, `--kayad-brand-muted`), and a Tailwind v4 `@theme` block in the same file re-exposes the identical hex values under `--color-navy-50`…`--color-navy-900` (with an explicit in-code comment: "Legacy navy/beige utility names remain as compatibility aliases"), which Tailwind auto-generates into real utility classes. A separate, unrelated `brand`/`charcoal`/`gold` system in `tailwind.config.js` exists but has **zero usages** in any of the 5 primary customer-facing auction/marketplace files — confirmed by grep, not assumed. The only real "duplication" was stylistic: the same canonical hex values also appear as hardcoded Tailwind arbitrary-value classes (`bg-[#0A3340]`) in many files, with no value drift from the token.

**Decision:** Converge the 4 primary customer-facing files this stage (scope discipline — avoid an unverifiable broad redesign with no browser available); do not invent a 4th system; do not touch the unrelated, unused `tailwind.config.js` palette (out of scope — it isn't in conflict with anything live).

| File | Hex-literal occurrences before | Converted to | Occurrences after |
|---|---|---|---|
| `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx` | ~101 (`#0A3340`/`#176B87`/`#13B8A6`, classes + 1 inline style) | `navy-900`/`navy-700`/`navy-600` utility classes; `var(--color-navy-900)` for the inline style | 0 |
| `src/components/VehicleCard.tsx` | 8 (`#0A3340`/`#176B87`) | `navy-900`/`navy-600` utility classes | 0 |
| `src/components/detail/VehicleDetailPage.tsx` | 163 (`#0A3340`/`#176B87`/`#13B8A6`) | `navy-900`/`navy-600`/`[var(--kayad-cyan)]` | 0 |
| `src/pages/AuctionLivePage.jsx` | 3 (inline style `'#0A3340'`) | `'var(--color-navy-900)'` | 0 |

**Verification:** Zero value drift (converted classes resolve to byte-identical colors — confirmed by comparing the `@theme` hex values against the replaced literals before conversion). Full frontend suite re-run after conversion showed 0 regressions (component tests don't assert on literal class strings for color, only on rendered text/roles, so this was a safe behavior-preserving rename). No visual regression testing was performed (no browser) — this is a **PARTIAL**, not a full visual certification, consistent with Phase G/H honesty labeling.

**Remaining carry-forward:** ~133 other files in the codebase still use the equivalent hardcoded hex-literal classes. Not touched this stage — out of the traced scope (the master prompt names "canonical" convergence where evidence shows duplication/conflict on the auction/marketplace-critical surfaces, not a repo-wide mechanical find/replace). Recommended for a dedicated future pass with browser-based visual diffing available.

---

## Part 2 — Iconography Convergence (Phase C)

| Concept | Before | After | Files | Rationale |
|---|---|---|---|---|
| "Inspected" trust signal | `CircleCheck` (lucide-react) | `ShieldCheck` | `AuctionWowExperience.tsx` | Converges to the same icon already used for the canonical ESCROW/trust badge family elsewhere in the app, for a single "verified/trustworthy" visual language. Same `size={12}`, same usage context (soft chip). |
| Promotional "LIVE" teaser | `🔴` emoji + text | `Gavel` icon (lucide-react) + text | `VehicleMarketplace.tsx` (promotional teaser card) | Converges to the same auction-concept icon (`Gavel`) used elsewhere for auction/bid actions, replacing an emoji (which renders inconsistently across platforms/fonts and carries no semantic/accessible structure of its own) with a proper icon component. |
| Pagination prev/next | Unlabeled `ChevronLeft`/`ChevronRight` icon buttons | Same icons, now with `aria-label="Previous page"`/`"Next page"` and `aria-hidden="true"` on the icon itself | `VehicleMarketplace.tsx` | Not an icon *swap* — an accessibility fix alongside the icon audit (icon-only controls must carry an accessible name per the master prompt's explicit Phase C requirement). |
| Mobile filter-drawer close | Unlabeled `X` icon button | Same icon, now with `aria-label="Close filters"` | `VehicleMarketplace.tsx` | Same accessibility rationale as above. |

**Explicitly NOT converged (evaluated and preserved as distinct concepts):**

| Pair considered | Verdict | Why kept distinct |
|---|---|---|
| `Wrench` (mechanical/condition-related action icon) vs. `ShieldCheck` (verified/trust-status icon) | Not converged | Different concepts — one denotes a maintenance/condition action or attribute, the other denotes a verified trust status. Visually similar in some icon sets but semantically unrelated; forcing one icon onto both would reduce clarity, not improve it. |
| `CheckCircle2` (used in checklist-style, multi-item lists) vs. `ShieldCheck` (used in single-badge/chip trust signals) | Not converged | Different UI roles — a checklist item's completion marker vs. a standalone trust badge. The master prompt explicitly warns against forced convergence where usage context differs; these were judged to be exactly that case. |

**Verification:** Both actual icon swaps (`CircleCheck`→`ShieldCheck`, emoji→`Gavel`) and all 3 accessibility `aria-label` additions were covered by the full frontend suite re-run (0 regressions: no test asserted on the prior icon identity or the prior unlabeled state in a way that would mask a real break, and the existing `AuctionLivePage.test.jsx`/`VehicleMarketplace`-adjacent tests continued to pass unchanged).

---

## Part 3 — Reduced-Motion Convergence (Phase D)

**Finding:** 3 real local `matchMedia('(prefers-reduced-motion: reduce)')` duplicates were found (`Navbar.tsx`, `MobileBottomNav.tsx`, and a fully dead/unused duplicate hook `useReducedMotion()`/`getAnimationClass()` inside `hooks/useAccessibility.tsx`), plus 3 Framer-Motion-tree surfaces (`AuctionWowExperience.tsx`'s cinematic gallery, bid confirmation, and winning celebration) that had no reduced-motion handling at all.

| Location | Before | After |
|---|---|---|
| `src/components/Navbar.tsx` | Inline `window.matchMedia(...).matches` computed fresh inside a scroll-to-top effect | Routed through the shared `usePrefersReducedMotion()` hook; effect's dependency array updated to `[prefersReducedMotion]` |
| `src/components/MobileBottomNav.tsx` | Inline `window.matchMedia(...).matches` computed inside a search-item action callback | Routed through the shared `usePrefersReducedMotion()` hook (single top-level call, reused) |
| `src/hooks/useAccessibility.tsx` | Dead, unused `useReducedMotion()` + `getAnimationClass()` exports (duplicate of the canonical hook, never imported anywhere) | Removed entirely (plus their shorthand references in the file's default-export object, which a subsequent `tsc` run proved were also required to remove) |
| `src/hooks/index.ts` | Re-exported the now-removed dead hook/helper | Re-export updated to add `usePrefersReducedMotion` from `useMediaQuery` and drop the removed names |
| `src/components/auction/AuctionWowExperience.tsx` (cinematic gallery, bid confirmation, winning celebration) | Each used raw Framer Motion `motion.*`/`AnimatePresence` with no reduced-motion handling | Each wrapped in `<MotionConfig reducedMotion="user">`, Framer Motion's own official mechanism for OS-level reduced-motion respect across an entire subtree |
| `src/components/detail/VehicleDetailPage.tsx` (image zoom transition) | Unconditional CSS `transition-transform`/`transition-opacity` classes on the main vehicle image | Conditionally omitted via `usePrefersReducedMotion()` when the OS setting is enabled — image still renders and swaps, only the animated transition is removed |

**Explicitly NOT converged:** a direct `window.matchMedia` call inside `runAuctionTransition()` (a plain utility function, not a React component/hook) was left untouched — a React hook cannot be called from a non-component function, so routing it through `usePrefersReducedMotion()` was not possible without introducing a new, out-of-scope architecture (e.g., passing the value in as a parameter from every call site). This is the correct, evidence-based judgment call, not an oversight.

**Correctness boundary preserved:** no reduced-motion change in any of the above touches bid state, lifecycle state, countdown truth, payment state, escrow state, or winner/loser state — confirmed by inspection (every change is either a CSS class conditional or a Framer Motion presentation wrapper, never touching the state variables or API calls that drive those truths) and by the full regression suite passing unchanged for all state-related tests.

**Regression proof:** Wrapping the 3 `AuctionWowExperience.tsx` surfaces in `MotionConfig` broke 4 tests in `AuctionLivePage.test.jsx` (the project's global `vi.mock('framer-motion', ...)` stub in `src/__tests__/setup.js` had no `MotionConfig` export). This was root-caused with a minimal repro, fixed by adding `MotionConfig: ({ children }) => children,` to the mock, and confirmed to restore the full suite to 0 regressions — this break/fix/restore cycle doubles as the Phase K proof of necessity and correctness for the Phase D changes.

**Tested with both settings:** the `prefers-reduced-motion` conditional branches (`VehicleDetailPage.tsx`'s image transition classes, `Navbar.tsx`/`MobileBottomNav.tsx`'s `behavior: 'auto' | 'smooth'`) were inspected for both the `true` and `false` branches in source; a literal OS-level reduced-motion toggle + visual confirmation is ENVIRONMENT-BLOCKED (no browser/device runtime), consistent with the honesty labeling used throughout this stage.
