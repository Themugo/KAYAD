# KAYAD Frontend Failure Repair Report — 2026-10-09

## Result
- Frontend: **388 passed / 0 failed / 1 skipped** (54 files). The skip is the original baseline skip; nothing newly skipped, deleted or time-out-adjusted.
- `tsc --noEmit`: clean. `npm run build`: success.
- No backend, migration, RLS or authorization change (tree diff vs Stage 14A delivery = 8 files, below).

## Application fixes (`VehicleMarketplace.tsx`)
1. Featured/hero feed reads `res.data || res.cars || []` (was `res.cars.map`, which throws when only the typed `data` field is present).
2. Mobile hero index is derived from a `{key,index}` slot so a tap right after a list change is never discarded by a deferred reset effect (React effect-reset race, proven by instrumentation).
3. Saved destination identifies itself as "Saved Vehicles" (eyebrow, heading, error chip, description). Behaviour unchanged: grid reuse, no inventory re-query.

## Test corrections (all assertions preserved or strengthened)
- `VehicleMarketplace.test.tsx`: hero identity = `make model` (documented convention); mock rows include `description`; carousel test now uses 6 vehicles and asserts wrap in both directions; saved test asserts correct title.
- `Navbar.test.jsx`: asserts the single combined entry (desktop + mobile drawer) → `/login`; asserts no standalone Create Account; `/register` reachability stays covered by `LoginPage.test.jsx` + `validate-explicit-auth-flows`.

## Validator corrections (drift against real contracts; no behaviour changed)
| Validator | Fix |
|---|---|
| premium-presentation-pass | registration path = header → `/login` → `/register`; mobile hero stage markers; login route regex |
| next7-polish | reduced-motion via shared `usePrefersReducedMotion` hook |
| recovery-repair (and the `release` gate it feeds) | removed reference to non-existent `VehicleCard/index.js`; asserts barrel absent + other import repairs |
| phase59 | accepts current `.env.example` header |
| c1-c5-convergence | token-expiry check accepts `new Date()` as well as `Date.now()` (backend hashes tokens at rest and enforces expiry — verified in `authController.js`) |

## Proof cycles (REVERT → FAIL → RESTORE → PASS)
- Feed revert → 12 VehicleMarketplace tests fail; restore → 32/32.
- Race revert → 4 hero tests fail; restore → 32/32.
- Saved heading revert → 1 fails; restore → 32/32.
- Old Navbar tests vs current app → the 2 failures reproduce (no Create Account control exists by design); old VM tests vs fixed app → 7 still fail (stale), 2 pass (pure app defects).

## Validators
95 of the 97 `validate:*` scripts run here pass (fresh-extract run) (including navigation-convergence 40/40, marketplace, auction domain/bid/transport, pwa-mobile, polish, hero, ui-surface, explicit-auth, release gate). Excluded as requiring live infra: live/local runtime, production verifier, vercel-ci, backend-boot, dependency-security.
**Environment-blocked (not fabricated):**
- `validate:communications:providers` — requires real email/SMS provider credentials.
- `validate:phase6-release` — 38/39; requires Node ≥ 22.22.2, sandbox runs 22.22.0.

## Files changed (8)
`src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`, `src/__tests__/components/VehicleMarketplace.test.tsx`, `src/__tests__/components/Navbar.test.jsx`, `scripts/validate-premium-presentation-pass.mjs`, `scripts/validate-next7-polish.mjs`, `scripts/validate-recovery-repair.mjs`, `scripts/validate-phase59.mjs`, `scripts/validate-c1-c5-convergence.mjs`.

## Carry-forward (not defects in the 11)
- Desktop hero pair index uses the same effect-reset pattern (`setHeroPairIndex(0)`); same race class, no failing test.
- "Featured vehicles" section uses unconditional smooth scroll (reduced-motion).
