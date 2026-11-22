# 14 - Staging and rollback report

Status: **BLOCKED.** No staging Supabase project or branch is available to this session; hosted access is read-only SELECT; production must not be changed.

| Gate step | Status | Note |
|---|---|---|
| Backup | BLOCKED | needs a staging project or branch plus a dump taken by the owner |
| Ordered apply of 91 unapplied migrations | BLOCKED on hosted. IMPLEMENTED AND VERIFIED on a disposable database: 209/209 apply in order (`evidence/db-journeys-summary.txt`) |
| DB tests and journeys | VERIFIED on the disposable database (overall=PASS, 21 journeys); NOT RUN on staging |
| RLS validation | NOT TESTED on staging (hosted has 120 policies; repo-built policies not diffed) |
| Rollback rehearsal | BLOCKED. Migrations are forward-only; rollback = restore the pre-apply backup. Not rehearsed. |

Exact needs to unblock: (1) a Supabase staging branch or project seeded from a recent production backup; (2) read-write access for the session to staging only; (3) owner decision D-20 on how to reconcile the diverged migration histories (doc 13).
