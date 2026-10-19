# Candidate migration 20261019200000 — subscription activation (NOT EXECUTED on any shared database)

**What:** replaces `public.kayad_activate_dealer_subscription_atomic` so its `INSERT … ON CONFLICT` names the partial unique index predicate (`ON CONFLICT (payment_id) WHERE payment_id IS NOT NULL`). Function replacement only: no table, column, index or data change.

**Why:** without it the RPC errors on PostgreSQL, so an approved dealer who pays can never receive an active subscription (402 `SUBSCRIPTION_REQUIRED` forever).

## Preflight (read-only, run on hosted before any decision)
```sql
select proname, md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and proname='kayad_activate_dealer_subscription_atomic';   -- record hash for the rollback file comparison
select indexdef from pg_indexes where tablename='dealer_subscriptions';              -- confirm a partial unique index on payment_id exists
select count(*) from public.dealer_subscriptions;                                    -- data-preservation baseline
```

## Rehearsal (disposable PostgreSQL 16, `kayad5c_disposable`, tier P) — `migration_rehearsal.txt`
| Step | function md5 | `dealer_subscriptions` rows |
|---|---|---|
| candidate applied | `13b0958005d1cfdc3fa93d1f13b32ede` | 2 |
| ROLLBACK candidate applied | `aebc44c68403da85937326cbbc723e59` | 2 |
| candidate re-applied | `13b0958005d1cfdc3fa93d1f13b32ede` | 2 |

Rollback and re-apply both succeed and are byte-identical to the applied state; row count unchanged. Dealer activation journey (role_api_b) passes with the candidate applied.

## Hosted application
Requires owner decision D5C-B and a separate authorization. Apply in a transaction window, post-verify with the preflight hash, keep the rollback file ready. Not applied by this stage.
