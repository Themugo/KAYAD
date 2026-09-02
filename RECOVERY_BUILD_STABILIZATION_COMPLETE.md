# KAYAD Recovery / Build Stabilization — Complete

## Baseline

This package is built from the recovered KAYAD tree corresponding to the Phase 39 work that was pushed to `main` as `f042f7bb`, plus the uncommitted Phase 38 transaction-boundary cleanup and build/test stabilization repairs.

## Repaired regressions

1. Restored `login`, `register`, and `updateProfile` in `src/services/authApi.ts` using the canonical transport and confirmed `/api/v1/auth/*` is an intentional backend mirror.
2. Repaired the relocated `DealerBusinessView` import.
3. Repaired fixture type import depths.
4. Removed stale private-seller consumers of intentionally removed fabricated offer/inspection/completed-sale state.
5. Removed fabricated payment wallet-balance cards.
6. Restored missing inspection type imports.
7. Repaired notification type handling.
8. Removed fabricated financing/bank-partnership claims from marketplace inventory.
9. Repaired stale component-relative imports and CMS service import paths.
10. Removed the orphan `AuctionCalendar` test.
11. Added the missing fail-closed communications smart-action handler.
12. Repaired Phase 10 operational-data test paths so repository-root files are read from the actual repository root when Jest runs from `backend/`.
13. Repaired the escrow/payment callback unit-test isolation so mocked atomic purchase settlement updates the test payment exactly as the authoritative RPC contract does.
14. Restored the Phase 1 Jest configuration rule: default `npm test` does not gate on invalid ESM coverage instrumentation; coverage remains available separately.
15. Removed stale documentation referring to the retired no-op `supabaseSession` transaction shim.

## Preserved intentional architecture

- KAYAD custom authentication remains authoritative; Supabase Auth was not introduced.
- `supabase/migrations/` remains the database schema source of truth.
- The obsolete `escrow_vaults` runtime is not restored.
- The old `schema_clean.sql` is not restored as an alternative schema authority.
- The canonical auction model remains `cars + bids`; no fake `auctions` table was reintroduced.
- Demo/fabricated production data was not restored.
- Phase 39 Socket.IO authorization hardening remains intact.

## Validation performed in this package

- Recovery static validator: PASS after final repairs.
- Phase 38 validator: PASS.
- Phase 39 validator: PASS.
- Backend JavaScript syntax audit: PASS.
- Frontend TypeScript/build validation was already confirmed on the Windows checkout in the supplied execution log: `tsc --noEmit` PASS and `vite build` PASS.

## Windows final gate

Run from `C:\Users\hp\Desktop\KAYAD-main` after applying this package:

```cmd
npm install && npm run lint && npm run build && cd backend && npm install && npm test
```

Do not commit if any command fails.
