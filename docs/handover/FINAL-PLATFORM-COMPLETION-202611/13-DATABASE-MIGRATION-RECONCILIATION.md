# 13 - Database and migration reconciliation

Hosted project "KAYAD EA", read-only SELECT only. Nothing was written or applied.

## History (VERIFIED, `evidence/hosted-migrations.txt`)
- 135 hosted migrations, last version `20260922060457`. Repo has 209 migration files that apply cleanly to a fresh database.
- Histories have diverged: by name, **91 repo migrations have no hosted counterpart** and **38 hosted migrations have no repo file** (`evidence/unapplied-now.txt`, `evidence/hosted-only-migrations.txt`). Many hosted entries are timestamped differently from the repo files, so a name-based match was used.

## Object comparison (VERIFIED, read-only queries on hosted)
| Object class | Expected from the 91 unapplied migrations | Missing on hosted |
|---|---|---|
| Tables | 59 | 44 |
| Functions | 129 | 107 |
| Columns (122 sampled pairs) | 122 | 95 (58 on tables that exist; 37 because the table is missing) |
| Triggers (16 key ones) | 16 | 14 |
| Unique index `uq_cars_owner_listing_number` | 1 | missing |

Notable consequences on hosted today: no `cars.listing_number`, no numbering trigger or counter table, no `cars.sold_at`/sold read-only guard, no refresh-token rotation columns, no `dealers.payment_details` check beyond what exists, no support-ticket idempotency/row_version, no inspection-organisation tables.

## Not compared (labelled)
Grants, views, enums, storage policies, RLS policy bodies and constraints were NOT compared object-by-object: NOT TESTED. Repo-built vs hosted full diff requires a schema dump, which this session cannot take.

## Verdict
Hosted is materially behind the repo. The application code requiring these objects must not be deployed against hosted until the migration reconciliation (D-20) is decided and rehearsed on staging (doc 14). Release readiness: **BLOCKED**.
