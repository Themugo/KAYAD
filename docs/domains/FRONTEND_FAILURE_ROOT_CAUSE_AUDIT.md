# KAYAD Frontend Failure Root-Cause Audit — 2026-10-09

Baseline (Stage 14A delivery): Vitest **377 passed / 11 failed / 1 skipped** (54 files). All 11 failures reproduce **individually, per-file and in the full suite** (deterministic; no ordering or leakage dependence).

> Honest process note: investigation and the first fixes were interleaved while tracing; this audit was compiled from the recorded baseline output (`baseline.json`), the revert experiments and the traced source. The root causes below were each *proven by experiment* (revert-fix → fail, old-test-vs-fixed-app, instrumentation), not assumed.

## Method used to attribute causes
1. Original app + original tests → the 11 failures (baseline).
2. Original tests against the *fixed* app → shows which expectations are stale (7 still fail; 2 pass).
3. Corrected tests against each reverted fix → shows each app fix is load-bearing.

## Failures

| # | Test (file) | Source file | Actual (baseline) | Proven root cause | Class |
|---|---|---|---|---|---|
| 1 | `Navbar > renders explicit sign-in and account creation routes for guests` (Navbar.test.jsx) | `src/components/Navbar.tsx` | no button named /create account/i | Obsolete presentation: Navbar has ONE combined "Sign In / Sign Up" entry → `/login`; registration is reached from `/login` ("Create your KAYAD account" → `/register`) and AuthModal. Enforced by `validate-explicit-auth-flows`. | Stale test |
| 2 | `Navbar > navbar Create Account navigates to the standalone registration flow` | `Navbar.tsx` | same | Same contract; the test asserted a control the approved contract does not have. | Stale test |
| 3 | `VM > saved-only mode reuses the canonical marketplace grid without re-querying the full inventory` | `VehicleMarketplace.tsx` | text "Saved Vehicles" not found | **Real customer-facing defect**: the Saved destination reused the grid but titled itself "Vehicle Inventory" / "Marketplace inventory" / "Inventory unavailable". Test also used a full-title identity that the grid never renders. | App defect + stale identity |
| 4 | `… mobile hero … shows ONE vehicle with the canonical tagline and switches with the arrows, wrapping both ways` | `VehicleMarketplace.tsx` | full-title text not found | (a) featured feed read `res.cars` only → `TypeError` when absent (`PaginatedCarsResponse.data` is the required field); (b) reset-state-in-effect race swallowed early taps; (c) stale identity: hero convention is `make model`; (d) test assumed a 2-vehicle wrap. | App defects + stale |
| 5 | `… keeps dots in sync with the active vehicle and lets a dot jump to a vehicle` | same | button "Show featured vehicle 1" not found | Feed defect (no hero rendered) + index race. | App defect |
| 6 | `… changes vehicle on a deliberate horizontal swipe but not on a vertical scroll` | same | `/^View 2021 Toyota Land Cruiser Prado TX-L 2.8L$/` not found | Feed defect/race + stale identity (aria-label is `View Toyota Prado`). | App + stale |
| 7 | `… uses real featured inventory as the hero source and keeps the selected vehicle consistent across desktop/mobile` | same | role img not found | Feed defect (`res.cars`). Passes with old expectations once feed fixed. | App defect |
| 8 | `… ignores legacy showcase hero configuration and keeps public hero identity on real featured inventory` | same | role img not found | Feed defect. Passes with old expectations once feed fixed. | App defect |
| 9 | `… admin-controlled hero configuration applies admin mobile stage height, slide speed and honours an explicit 0 (instant)` | same | `/^View 2021 Toyota Land Cruiser Prado TX-L 2.8L$/` not found | Feed defect + stale identity string. | App + stale |
| 10 | `… admin-controlled hero configuration clamps unsafe stored values so the stage can never break the layout` | same | same | Same. | App + stale |
| 11 | `… never overlays arrows on the vehicle stage and contains the image` | same | same | Same. | App + stale |

Mock note: the mock backend rows lacked `description`, so the caption fell through to the generic fallback; the mock now supplies it (the real API returns it).

## Corrections and regression coverage
- Feed: `(res.data || res.cars || [])` — proven by revert (8 hero tests + count/grid tests fail).
- Index race: derived `{key,index}` slot — proven by revert (tests 4–7 fail).
- Saved identity: `savedOnly`-aware eyebrow/heading/chip/description — proven by revert (test 3 fails); test now also asserts `Vehicle Inventory` is absent and `getCars` not called.
- Navbar: tests now pin the real contract (exactly one "Sign In / Sign Up" button, no Create Account, desktop + mobile drawer → `/login`); `/register` reachability pinned by `LoginPage.test.jsx` and the validator.
- Four stale validators corrected to the same documented contracts (see repair report).

Evidence files: `scratchpad/cyc14a/{baseline.json,revert_log.txt,old_tests_log.txt}`.
