# Phase 14.8 - Database policy audit (dealer_teams)
Environment: disposable local PostgreSQL 16 + all 188 repo migrations (3 Supabase-only statements failed: `supabase_realtime` publication x3, `rls_auto_enable()` x2) + a minimal Supabase role/`auth.uid()` shim + PostgREST 12.2.3. No production/staging access.

## Finding (corrects Phase 14.7)
14.7 reported that a member can update their own `dealer_teams` row directly. On the real schema this is **not reproducible**: migration `20260908043000` already replaced the policy; the live policies are
- `dealer_teams_owner_select` `auth.uid() = dealer OR auth.uid() = member`
- `dealer_teams_owner_insert` (owner-only check)
- `dealer_teams_owner_update` `USING auth.uid() = dealer` (with check likewise)
- `dealer_teams_owner_delete` `auth.uid() = dealer`

Direct-DB tests (`runbooks/phase14-8-20261026/localdb/team_rls_direct_db_test.sql`, output `logs/direct-db-team-rls.txt`), run as the `authenticated`/`anon` roles with a JWT subject claim:
| Test | Result |
|---|---|
| T1-T4 member self-promotes role / grants permissions / re-points org / reactivates status | UPDATE 0 (denied) |
| T5 member deletes own row | DELETE 0 |
| T6 member inserts self into an org | RLS error |
| T7 member reads own row | 1 row |
| T8 unrelated dealer sees/updates/deletes owner team | 0 / 0 / 0 |
| T9 anon | 0 / UPDATE 0 |
| T10 owner changes role | UPDATE 1 (permitted) |
| T11 owner moves row to another org | RLS error (cross-org denied) |
| T12 owner removes member | UPDATE 1 |

(The first lines of that log show a fixture-reuse insert error from re-running on a database where the fixtures already existed; the test rows were present and the results above are valid.)

## Decision
Forward SQL: **none required**. The 14.7 proposed SQL is a no-op equivalent to the existing policy and is marked SUPERSEDED (not applied). Rollback SQL: none (no change made). Deployment ordering: n/a. Residual note: the app uses the service role, so RLS is defence-in-depth; API-level self-promotion, org substitution, revocation and concurrency are tested in `logs/db-e2e-inventory-team.txt` (60/60).

## Real defects found by running against the real database (all fixed)
1. `dealerOrgAccess` selected a nonexistent column (`inviteEmail`) -> every team-member request returned 500.
2. 14.7's guarded soft delete filtered columns not in its `select` -> PostgREST 42703 -> **every dealer delete returned 500** on a real DB (mock tests could not see this). Fixed + regression test.
3. Team API responses exposed `invite_token_hash` (snake_case key bypassed the strip). Stripped.
4. Legacy `POST /api/dealer/team/invite` 500'd and `GET /api/dealer/team` leaked token hashes; the route is retired (410 `TEAM_INVITE_ROUTE_MOVED`) and the list sanitised.
