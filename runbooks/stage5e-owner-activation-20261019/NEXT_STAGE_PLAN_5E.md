# Stage 5F — prioritised next-stage plan

1. **Owner confirmations (no engineering):** target classification, exact owner address, Path A/B, D1. *Unblocks everything.*
2. **Windows reconciliation** with `WINDOWS_READONLY_COMMANDS_5E.md` (5 minutes).
3. **Export the 38 hosted-only statements** (CLI `supabase migration fetch` or authorised SELECT-export) into a *review baseline* directory; diff the 17 overlapping objects; decide F-5E-06.
4. **Create a restore point / staging branch** and apply, on that branch only: 63 migrations (after step 3 adjustments), 5B candidate, 5C candidate, privilege candidate, in the rehearsed order; run the read-only preflight SQL; rerun `role_api_*` against the branch with a staging backend.
5. **Provider gate:** Brevo key + verified sender in the staging deployment settings; one authorised-recipient test per channel; webhook verification.
6. **Real-owner activation on the *target*, only after 1–5:** `--plan`, then `--apply`, Path per decision, recorded in the audit ledger; second owner invited by the first.
7. **Repo hygiene:** commit the verified baseline of hosted-only objects so a database can be rebuilt from the repository (F-5E-04).
