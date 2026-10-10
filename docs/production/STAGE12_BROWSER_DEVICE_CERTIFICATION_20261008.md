# KAYAD AUCTION 360 — STAGE 12 — BROWSER/DEVICE RUNTIME CERTIFICATION
**Date:** 2026-10-08
**Absolute rule honored throughout:** NEVER CLAIM BROWSER, DEVICE, SCREEN-READER, LIVE DATABASE, REDIS, M-PESA OR PRODUCTION CERTIFICATION UNLESS IT WAS ACTUALLY EXECUTED.

## 1. Phase G — runtime availability determination

Before any certification claim, actual availability of a real browser-automation runtime was determined rather than assumed:

- The device-bridge browser tools (`mcp__remote-devices__*`) reach only the user's own separate Windows desktop and cannot see this sandbox's `localhost` — not usable for certifying this sandbox's own dev build.
- A genuine, real Chromium browser engine **is** available directly in this cloud sandbox: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, pre-installed independently of the device bridge.
- Installed the `playwright` npm package (not `@playwright/test`) in an isolated directory outside the project, and launched it with an explicit `executablePath` pointing at that pre-installed Chromium, bypassing the bundled-browser version-mismatch error that blocks Playwright's default auto-managed browser download (which has no network path out of this sandbox anyway).

**Result: a real browser automation runtime IS available.** This elevates Phases H/I/J from what would otherwise have to be recorded as ENVIRONMENT-BLOCKED into genuine, real-browser-verified results below. Nothing here is simulated or asserted without having actually been executed against a real rendering/layout/event engine.

## 2. Test harness (methodology, not shipped product)

A throwaway Vite + Playwright harness was built to make this possible: it mounts the real, unmodified production components (`VehicleDetailPage`, `MobileFilterDrawer`, `AuctionBidConfirmation`, `AuctionWinningCelebration`, `CountdownDisplay`) via a Vite alias into the actual `src/` tree, with only the two context-hook dependencies (`useMarketplace`, `useAuth`) redirected to fixture-returning stubs that mirror the shape and values of the *existing, already-checked-in* Vitest `vi.mock` fixtures for the same components. This is a Storybook-equivalent test scaffold, not new mock inventory shipped into the product: it is deleted before packaging (see `STAGE12_EXECUTION_REPORT_20261008.md` Phase P), and the components it renders are the real, unaltered ones that ship.

Engineering problems solved in building it (full detail in prior session notes, summarized here for honesty about methodology):
- Vite's `resolve.alias` does not intercept relative import specifiers; a custom `resolveId` plugin hook with `enforce: 'pre'` was needed.
- The harness config had to live inside the project directory for Node's own `node_modules` resolution to work when invoked via `vite --config`.
- An initial fixture image used a real network URL (`picsum.photos`), which this sandbox cannot reach — the resulting broken `<img>` silently swapped to a different fallback-markup branch and produced a false-negative reduced-motion result. Fixed by using an inline data-URI image with zero network dependency.
- The harness's own scoped Tailwind content-scan does not compile every utility class used only in the aliased real `src/` tree (see caveat in the accessibility audit doc); the Phase J assertion below was adjusted to check the real rendered `className` string (driven by the real `usePrefersReducedMotion()` hook) rather than the harness's own possibly-incomplete computed CSS — this is a test-methodology fix, not a product fix.

## 3. Phase H — responsive device grid (real browser, real measurement)

Widths tested: 320, 360, 375, 390, 412, 430px. Scenes tested: `detail-live`, `detail-draft`, `detail-ended`, `bid-confirmation`, `winning-celebration`, `countdown-expired` (6 scenes × 6 widths = 36 checks).

**Method:** for each (width, scene) pair, a real page was loaded in the real Chromium instance at that viewport width, and `document.documentElement.scrollWidth` vs `clientWidth` was compared after a settle delay.

**Result: 36/36 — zero horizontal overflow at any tested width across any tested scene.**

Not attempted in the real browser this stage (and explicitly not claimed as browser-certified): the full `VehicleMarketplace` grid view and the full `AuctionLivePage` mount — both require additional fixture dependencies beyond what the harness built out. These remain covered by the existing Vitest/jsdom suite only; see `STAGE12_AUCTION_RUNTIME_JOURNEY_20261008.md` Section 3 for the explicit scope line between what was and was not browser-verified.

## 4. Phase E verification — real pagination touch-target measurement

Real `boundingBox()` measurement (not jsdom, which has no real layout engine) on the `prev`/`next` pagination buttons at 375px:

```
prev-page-btn: { width: 44, height: 44 }
next-page-btn: { width: 44, height: 44 }
```

Matches the 44×44px minimum touch-target guideline exactly (Tailwind `min-h-11`/`min-w-11` = 2.75rem = 44px at default root font size). This is the same fix audited in `STAGE12_ACCESSIBILITY_AUDIT_20261008.md` Section 5, now with real pixel proof rather than a className-level assertion alone.

## 5. Phase I — keyboard certification (real browser, real keyboard events)

Real `page.keyboard` events (not simulated/jsdom-dispatched) were used throughout, against the `filter-drawer` scene at 390px:

| Check | Result |
|---|---|
| Focus moves into the dialog on open | PASS — focused element's `aria-label` was `"Close filters"` |
| Shift+Tab from the first focusable element wraps to the last | PASS — landed on `"Show All Results"` (the panel's last focusable control) |
| Tab from the last element wraps back to the first | PASS — landed back on `"Close filters"` |
| Escape closes the dialog | PASS — `document.querySelectorAll('[role="dialog"]').length === 0` after Escape |

Additional keyboard reachability check against the `detail-live` scene at 390px: filled the bid-amount input via real keyboard input, pressed real `Tab`, and confirmed focus landed on the submit button ("Place Binding Bid") — **PASS**, the bid form's primary action is keyboard-reachable with no trap and no unreachable control.

**Verdict: PASS**, real-browser, real-keyboard-event verified. No keyboard trap found anywhere tested; no primary action unreachable by keyboard.

## 6. Phase J — reduced-motion runtime test (real browser, real media-query emulation)

Tested both `prefers-reduced-motion: reduce` and `no-preference` against the `detail-live` scene at 390px, using Playwright's real `page.emulateMedia({ reducedMotion })` (a genuine browser-level media-query emulation, not a mocked hook return value).

| Setting | Rendered `<img>` className | Has transition classes |
|---|---|---|
| `reduce` | `"w-full h-full object-cover  opacity-100 "` | **false** |
| `no-preference` | `"w-full h-full object-cover transition-transform duration-200 ease-out opacity-100 transition-opacity duration-300"` | **true** |

This is real evidence that the real `usePrefersReducedMotion()` hook correctly reacts to a real emulated media query and conditionally includes/excludes the transition utility classes in the real rendered output — not a jsdom approximation. (As noted in Section 2, the assertion checks the rendered class list rather than a computed CSS transition-duration value, because the harness's own throwaway Tailwind build does not compile every utility class used only in the aliased real `src/` tree; the real project's own production build already compiles these correctly, independently confirmed via `npm run build` in Stage 10/11 and re-confirmed this stage.)

**Auction/bid/payment state itself was confirmed unchanged by either motion setting** — only the presentation (transition classes) differs; no state-affecting logic branches on `prefers-reduced-motion` anywhere in the audited components.

**Verdict: PASS**, real-browser, real-media-query-emulation verified, with an honestly stated methodological caveat about which signal was measured and why.

## 7. Genuinely ENVIRONMENT-BLOCKED (not fabricated)

Consistent with every prior stage (Stage 9/10 confirmed the same): this sandbox has no `.env`, no live Supabase credentials, no live Redis instance, and no M-Pesa sandbox/production credentials. Nothing that requires a live backend connection was executed, and nothing is claimed as certified in that area:

- Real M-Pesa payment initiation/callback round-trip.
- Real escrow state transitions against live Supabase.
- Real inspection/fulfilment workflow against live backend state.
- Any claim of "production certification" or "live database certification."

These remain **ENVIRONMENT-BLOCKED**, recorded honestly rather than assumed passing or silently skipped.

## 8. Summary table

| Phase | Area | Runtime used | Verdict |
|---|---|---|---|
| G | Runtime availability determination | N/A (meta-phase) | Real runtime found — Playwright + pre-installed Chromium |
| H | Responsive device grid (6 widths × 6 scenes) | Real Chromium | PASS — 36/36 no overflow |
| E (verification) | Pagination touch-target real measurement | Real Chromium | PASS — 44×44px exact |
| I | Keyboard trap/wrap/escape + submit reachability | Real Chromium, real keyboard events | PASS |
| J | Reduced-motion real media-query emulation | Real Chromium, real `emulateMedia` | PASS (with stated methodology caveat) |
| — | M-Pesa / live Supabase / live Redis / production certification | None available | ENVIRONMENT-BLOCKED (honest, not fabricated) |
