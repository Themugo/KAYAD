# Prioritised next-stage plan (after this stage)

**P0 — owner confirmations (no tooling needed)**
1. Confirm the hosted project `ubvgixwhfybbyjuvxboj` is **production** (or name a staging project) — unblocks fresh read-only queries.
2. Decide **D-5E2-1** (legacy activation now vs governance migration first vs staging rehearsal) and confirm the second owner's exact address (**D-5E2-2**).
3. Run the read-only commands in `WINDOWS_READONLY_COMMANDS_5E.md` (A–E) and paste non-secret results: Windows HEAD/branch state, the deploy-log SHA vs the introducing commit, `--verify-designated` booleans from the host shell, `users` row flags, provider flags.

**P1 — read-only evidence**
4. Export the 38 hosted-only migration statements to a scratch directory (`supabase migration fetch`) and review; schema-only dump for a catalog diff. Re-run the read-only inventory (dated) once P0-1 is answered.

**P2 — prepare, do not apply**
5. Ordered, reviewed migration plan for the reconciled subset (privilege hardening `20261011120000…` + candidate for `kayad_activate_dealer_subscription_atomic`, email uniqueness, owner governance) with a tested restore point on the target; one window combining the governance migration and `owner-bootstrap --apply`.
6. Brevo readiness: sender-domain authentication, one authorised test message to an owner-controlled mailbox; fix `FRONTEND_URL`/`BREVO_*` presence.

**P3 — only after P0–P2 and a named authorisation**
7. Staging (or production, if that is the only target and the owner explicitly accepts) execution of the plan; owner activation via Path A; post-change verification against the deploy SHA; then close the bootstrap switch.

**Housekeeping candidates (separate, small):** verify/reset single-statement RPC (F-5E2-09); await provider acceptance in resend (F-5E2-12); require `FRONTEND_URL` outside development (F-5E2-08); mask owner addresses in docs (F-5E2-13).
