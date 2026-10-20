# Stage 5E.3 — hosted recovery SQL (APPLIED BY THE OWNER on 2026-10-20)

These statements were run by the project owner, one at a time, in the Supabase SQL editor on project `ubvgixwhfybbyjuvxboj`
(still classified UNKNOWN / treat as production). Claude did not run any of them. They are the repo's own migrations, applied by hand
to a hosted database whose migration history differs from the repo (see the 2026-10-13 audit), so `supabase db push` was NOT used.

| File | Repo migration | What it fixed |
|---|---|---|
| `01_comms_deliveries_schema.sql` | 20260930111500, 20260930113000 | every email failed when recording the delivery, before Brevo was called |
| `02_users_security_columns.sql` | 20261011090000 | columns read on every authenticated request |
| `03_refresh_tokens_rebuild.sql` | 20260930110000 (trimmed) | reset and login failed creating/revoking sessions |
| `04_readonly_verification.sql` | — | SELECT-only checks of the result |
| `05_undo.sql` | — | partial undo (table was empty) |

Rules learned: run ONE statement at a time with nothing highlighted; the editor shows only the last result of a batch, and a
`begin; ... commit;` batch once reported success without persisting. Verify every change with a SELECT.
Do not re-run `03` once real sessions exist: its guard aborts when `refresh_tokens` has rows, by design.
