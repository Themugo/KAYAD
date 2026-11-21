# Master Alignment Summary (2026-11-21)

**Exact baseline:** `Themugo/KAYAD` `main` @ `6eb7c98a149b0c0b5066061b110f3bd38c6ba3ba` (2026-11-19). Node 22.23.4.

| Question | Answer |
|---|---|
| Is the current project aligned? | **PARTIALLY.** Source on `main` is coherent and builds, but it is not release-certified and the hosted database is behind it. |
| Is registration/authentication integrated? | **Mostly.** One flow, one endpoint, unified `user` identity, atomic RPC, async email. **Not integrated:** idempotent lost-response recovery. |
| Does duplicate architecture exist? | **Minor.** Legacy `pages/dealer/DealerDashboard.jsx` (tests only), orphan `pages/Dashboard.tsx`, `features/dashboard` `DashboardPage`; layouts and AuthModal already consolidated via re-exports. Nothing deleted. |
| Do critical journeys pass? | **Only registration was exercised** (local, mobile). Seller, dealer, offer, settlement and operations journeys are **NOT TESTED**. |
| Latest homepage and dealer work preserved? | **Homepage yes** (desktop/tablet/390/360 verified; one measured mobile-hero clip). Dealer: source/validators pass, no browser journey. |

## Verified (direct evidence)
- `tsc --noEmit` exit 0; `vite build` exit 0; strict `npm ci` exit 0 (root + backend).
- Backend: jest 242/246 suites pass (4107 tests pass, 5 fail, 21 skipped), vitest 60/61, node:test 13/13.
- 14 newer migrations apply cleanly to a disposable local DB; 229/229 local public tables have RLS enabled.
- Hosted DB (read-only): 213/213 public tables have RLS enabled; `kayad_register_identity_atomic` present.
- Unified personal account is implemented in the register controller (role -> `user`; dealer unchanged).
- Registration happy path, double-tap (1 POST), duplicate/case-variant email, existing-account sign-in handoff with email prefill.

## Failed
- **F-REG-1** On `main`, after a lost response the UI can falsely say "Your first request reached KAYARD KE" for an email owned by someone else (reproduced).
- **F-HOME-1** At 390x844 the hero vehicle image and the "Illustrative" card are clipped out of the hero (measured).
- Frontend: 69/1749 tests fail across 7 files. Validators: 38/353 fail. Backend: 5 jest + 1 vitest tests fail. Causes classified in TEST-AND-VALIDATOR-RESULTS.md (mostly stale tests/validators; none shown to be a production-code defect except F-REG-1).
- **F-DB-1** The hosted database lacks objects from migrations after ~Oct 2026 (e.g. `marketplace_offers`, `personal_listing_lifecycle_events`, `site_designs`, `featured_vehicle_campaigns`, `auction_*` engagement tables, `dealers_business_name_unique`). Code on `main` that depends on them cannot work on hosted until the user applies those migrations.

## Blocked
- Production connectivity (the sandbox cannot reach `api.kayad.space`); real email delivery; credentialed validators (`live-runtime`, `communications-provider-certification`); local Supabase CLI validator; physical-device testing.

## Not tested
Authenticated seller/dealer/offer/escrow/inspection/settlement browser journeys; operations/moderation journeys; rate limiting; CSRF-bootstrap failure; file upload attacks; hosted RLS policy semantics (only "enabled" was checked); performance.

## What should happen next
1. User applies the missing migrations to hosted (their action; I do not write to hosted).
2. Port idempotent registration replay onto current `main` with its regression test.
3. Repair stale tests/validators (list provided) without weakening assertions.
4. Fix the 390px hero clip.
5. Run authenticated journeys on a migrated staging DB.

**Not production-ready.** Critical blockers remain (F-DB-1 and the uncertified journeys).
