# KAYAD Production Cleanup — Pass 1

This working copy removes production-facing demo/sample data and demo access paths before the new Supabase project is initialized.

## Removed
- Supabase demo vehicle seed migration (`seed_demo_vehicles`).
- Backend demo-login endpoint and hardcoded demo accounts.
- Backend auto-reseed/auto-seed behavior.
- Demo/reseed admin controls.
- Frontend demo-login controls and demo mode configuration.
- Hardcoded showroom vehicle fallback.
- Hardcoded hero vehicle fallback imagery/data.
- Hardcoded payment transaction examples.
- Hardcoded notification examples in the cleaned notification components.
- Static comparison vehicle dataset from the active compare path; comparison now loads by vehicle ID from the real API.
- Legacy schema snapshots that conflicted with the migration source of truth.
- Placeholder Supabase production endpoint fallback; production now fails clearly when required configuration is missing.

## Preserved
- Real KAYAD marketplace schema and business tables.
- Custom KAYAD authentication architecture (users/profiles + backend auth).
- Auction/bidding, payment, escrow, inspection, messaging, support and administration schema.
- Real listing, payment and notification API paths.

## Migration state

The demo vehicle seed migration was removed from the fresh-database migration chain. The chain therefore currently contains 27 migrations. No demo records are created by the Supabase migration chain.

## Validation performed
- Backend JavaScript syntax checks passed for modified backend files.
- TypeScript/TSX/JSX parse checks passed for modified frontend files.
- A full npm dependency install could not be completed in this environment because the lockfile currently resolves `jsdom@30.0.1`, which requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`, while this environment is Node 22.16.0. Therefore a complete typecheck/build remains environment-blocked and must be run after dependencies are installed under a compatible Node version.

## Remaining audit scope
The repository still contains legacy/alternate feature modules with internal mock fixtures (auctions, financing, inspections, dealer/admin views, broadcast, bidder portal). They are not part of the clean production data path yet and require a dedicated second cleanup/refactor pass before calling the entire repository demo-free. They were deliberately not deleted blindly because several are imported by application feature surfaces and need real API replacements rather than removal.
