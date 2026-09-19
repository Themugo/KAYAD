# KAYAD TypeScript Contract Hardening — 2026-09-19

This release reconciles the TypeScript contracts identified by the September 19 Windows validation run.

## Fixed contract areas

- Dashboard APIs now consume already-unwrapped ownership responses.
- Socket.IO transport types are separated from the React context unsubscribe contract.
- Marketplace search exposes a live facet adapter over the canonical `/api/search` transport.
- Auction records are normalized at the API/UI boundary instead of using unsafe structural casts.
- Inspection marketplace API methods now return explicit typed payloads.
- Inspection dashboard, earnings and booking consumers now receive typed results.
- Payment history maps backend `carDetails` into the UI's payment record shape.
- Localization returns an explicit translation payload type.
- Lead and review services use the canonical HTTP request adapter.
- Payment requests use the canonical `HttpRequestOptions` contract.
- Inspection payment processing propagates the authenticated user ID to the atomic payment RPC.

## Validation performed in this package

- 362 TypeScript/TSX source files parsed successfully with the TypeScript parser.
- Modified inspection backend controllers/services pass `node --check`.
- No `.git`, `node_modules`, `dist`, `build`, or `coverage` artifacts are included in the release package.

## Runtime certification

The latest Windows validation supplied for the preceding source baseline reports 45 test files passed, 305 tests passed, 1 skipped, and a successful Vite production build. The Windows machine must rerun `npm run lint`, `npm test`, and `npm run build` against this exact package because the TypeScript contract fixes are new source changes.

## Database synchronization

The KAYAD Supabase project already contains the September 18 hardening migrations and the inspection financial workflow completion migration. Do not reapply those migrations manually; the checked-in migration history is the source of truth.
