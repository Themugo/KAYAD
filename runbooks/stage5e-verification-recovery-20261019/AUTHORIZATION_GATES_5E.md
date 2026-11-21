# Hosted authorisation gate checklist (Stage 5E — verification-recovery scope)

Rule: **no hosted mutation while any gate below is NOT MET.** Do not request blanket approval; each later request must name the environment, operation, migration set / account action, expected effects, risk and recovery path.

| # | Gate | Status | Evidence now / what is still needed |
|---|---|---|---|
| G1 | Exact hosted project reference + classification (staging/production) | **PARTIAL** | Ref `ubvgixwhfybbyjuvxboj` identified (prior stage). Classification = production *by repo designation*, **owner has not confirmed**; no staging exists |
| G2 | Selected target is the intended environment | **NOT MET** | Owner statement needed: "the target is production/staging X" |
| G3 | Read-only schema + migration inventory | **MET (stale)** | Prior-stage SELECT-only inventory exists (H-carried). Must be re-taken immediately before any change (and re-queried only after G1/G2) |
| G4 | SQL/provenance for the 38 hosted-only migrations or safe handling | **NOT MET** | Effects profiled (additive); SQL not yet exported to files/reviewed (smallest step: `supabase migration fetch` into a scratch dir) |
| G5 | Reconciled migration plan with forward + rollback/recovery | **NOT MET** | Matrix exists; no reviewed ordered plan; restore-point procedure not tested on the target |
| G6 | Explicit approval for a named staging migration (target + set) | **NOT MET** | None requested |
| G7 | Decision D1 + owner-governance policy and privilege changes | **NOT MET** | **D-5E2-1** (below) and the 5B D1 register remain open |
| G8 | Verified invitation + acceptance implementation | **MET (disposable)** | `role_api_k` 93/93, `role_api_j` 35/35, PG 63/63, jest/vitest suites (see TEST_MATRIX) — **not** hosted evidence |
| G9 | Preservation plan for the dealer record and unrelated data | **MET (plan) / NOT EXECUTED** | Path A preserves password, sessions, role, status, dealer rows (K5.2–K5.8); Path B replaces credentials; hosted has 0 `dealers`/`dealer_verifications` rows for the account, so only the `users` row + `user_auth` are at stake |
| G10 | Tested backup/recovery appropriate to the target | **NOT MET** | Disposable rollback rehearsed (5B/5E); no hosted PITR/branch restore tested |
| G11 | Known deployed revision + later verification plan | **NOT MET** | ≥ Stage 5A inferred from the observed message; exact commit unknown; plan = host deploy log SHA + `GET /api/owner-access/invitation?token=x` shape + `--verify-designated` |
| G12 | Brevo/SMS provider readiness (no creds in chat/source) | **NOT MET** | Only stub evidence; need: `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `FRONTEND_URL` presence confirmed on the host (flags only), sender-domain authentication, one authorised test message to a mailbox the owner controls |
| G13 | Windows working-tree reconciliation | **NOT MET** | No access from this environment. Read-only commands in `WINDOWS_READONLY_COMMANDS_5E.md` |
| G14 | How the two identities are verified without an email-only claim | **MET (design)** | Verification = the mailbox holder opens a single-use link (hash-stored, 24 h); owner authority = database membership created only by the atomic accept function after that; the env list only reserves/limits. **Execution not authorised** |

## Open owner decisions
- **D-5E2-1 (new):** On the current hosted deployment (legacy mode) the verification link *is* owner activation for `ji***@gmail.com`. Choose: **(i)** do nothing until the governance migration is approved and apply migration + bootstrap together (no owner access meanwhile), **(ii)** accept legacy activation now (owner access immediately, unaudited, unprotected) and plan the migration window knowing authority lapses until bootstrap, or **(iii)** approve a reviewed staging rehearsal first.
- **D-5E2-2:** confirm the second owner's spelling (one "a" vs two "a"s in the second word) and that the deployed `WEBHOIST_EMAIL` matches (run `--verify-designated` on the host).
- **D-5E2-3:** is the Brevo sender/domain ready; may one test message be sent to an owner-controlled mailbox.
- D1 / privilege changes from Stage 5B/5D remain as recorded in the decision register.
