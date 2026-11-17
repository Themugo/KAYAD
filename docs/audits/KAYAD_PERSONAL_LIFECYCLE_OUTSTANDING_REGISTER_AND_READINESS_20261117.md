# Outstanding Work Register and Release Readiness (2026-11-17)

| ID | Sev | Area | Evidence | Correction | Depends on | Blocks production? |
|----|-----|------|----------|-----------|-----------|-------------------|
| OW-01 | High | Migrations | New migration `20261117090000` replayed only on disposable Postgres | Apply to staging Supabase, run `supabase/tests/personal_listing_lifecycle_atomic.sql` and the DB script (non-loopback host is refused by design — run the SQL suite manually) | Staging DB | Yes |
| OW-02 | Low | Dead code | `PrivateSellerPlatform.tsx`, `BuyerPlatform.tsx` orphaned; referenced by tests/validators | Owner approves removal, then retire matching validators | Owner decision | No |
| OW-03 | Medium | Platform | `rls_auto_enable` missing outside Supabase; 2 migrations unreplayable locally | Verify on Supabase staging | Staging DB | Yes |
| OW-04 | Medium | Validators | 28 environment-bound validators fail in sandbox | Run with network/credentials/Docker in CI | CI | Yes (must pass in CI) |
| OW-05 | Medium | Live integration | No live backend, M-Pesa, Brevo, real-device testing | Staging UAT | Staging | Yes |
| OW-06 | Low | Enquiries | Capped ~200, no cursor | Add cursor pagination | — | No |
| OW-07 | Low | Photos | Delete by array index | Delete by image id | — | No |
| OW-08 | Low | CSS | Dead per-item dock classes for retired tabs | Remove with visual check | — | No |
| OW-09 | Medium | Backend tests | Full jest suite OOMs in one process; ran in 13 chunks | Chunk in CI or raise memory | CI | No |

## Release-readiness decision
**Ready for staging validation. NOT production-ready.** Code, unit, DB-logic and browser certification are clean within the sandbox; production approval requires OW-01, OW-03, OW-04 and OW-05 to be closed on staging.
