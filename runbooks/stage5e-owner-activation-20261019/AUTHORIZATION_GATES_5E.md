# Stage 5E — Authorization gates (Workstream E)

**No hosted mutation may be performed while any gate below is not MET.** No blanket authorization is requested. Each later request must name the exact target, change, scope, risk and recovery method.

| # | Gate | Status | Evidence / what is missing |
|---|---|---|---|
| 1 | Exact hosted project id + staging/production classification | **NOT MET** | id `ubvgixwhfybbyjuvxboj` known; repository designates it *production*; owner has not confirmed; no staging project/branch exists |
| 2 | Selected target confirmed as the intended environment | **NOT MET** | needs the owner's written confirmation |
| 3 | Read-only hosted schema + migration inventory | **MET** | `HOSTED_RECONCILIATION_MATRIX_5E.md` (135 applied, 11/11 findings re-verified) |
| 4 | SQL / provenance for the 38 hosted-only migrations | **PARTIAL** | effects, object lists, md5 per version obtained; exact text still resides only in the hosted history table → export via `supabase migration fetch` or authorised SELECT-export; 17 overlapping objects need a diff |
| 5 | Reconciled migration plan + reviewed forward/rollback/recovery | **PARTIAL** | forward order rehearsed (0 failures) and 5B/5C/privilege rollbacks rehearsed on disposable PG; reconciliation of overlaps (F-5E-05) and the dropped index (F-5E-06) pending; no rollback for the 63 → restore-point strategy needed |
| 6 | Explicit approval of a *named staging* migration, target + migration set | **NOT MET** | no staging target exists |
| 7 | Decision on owner-governance policy D1 and privilege changes | **NOT MET** | D1 outstanding; candidate `20261019210000_stage5e_privilege_hardening` awaits it |
| 8 | Invitation/acceptance implementation verified with disposable accounts | **MET** | 63 SQL + 35 HTTP + 49 owner-journey checks, all pass |
| 9 | Plan to preserve the existing dealer record and unrelated records | **MET (plan) / DECISION OPEN** | field-impact matrix; hosted account has 0 dealer rows; owner chooses Path A or B (D-5E-1) |
| 10 | Tested backup/recovery appropriate to the target | **NOT MET** | hosted backup/PITR state not observed; disposable restore proven only locally; a Supabase branch (or verified PITR) is the proposed restore point |
| 11 | Known deployed backend revision + how it will be verified | **NOT MET** | not observable; propose a build-id in `/health` or Render deploy log |
| 12 | Provider readiness (Brevo + SMS), without credentials in chat/source | **NOT MET** | no credentials; sandbox cannot reach providers; stub evidence only |
| 13 | Windows working-tree reconciliation | **NOT MET** | tree unavailable; commands in `WINDOWS_READONLY_COMMANDS_5E.md` |

## The next requests, worded exactly (for later; **not** authorised by this document)
1. *Confirmation only:* "Project `ubvgixwhfybbyjuvxboj` is KAYAD production / is not production" plus "my first owner address is `<exact>`" plus "Path A / Path B".
2. *Read-only export:* "Export the statements of the 38 hosted-only migration versions listed in `hosted_only_norm.txt` from `supabase_migrations.schema_migrations` into a local file for review" (SELECT only; no change).
3. *Staging creation:* "Create one Supabase branch of `ubvgixwhfybbyjuvxboj` named `stage5e-staging`" (cost implications are shown by Supabase before creation) — then separately: "Apply migrations X..Y plus the 5B and 5C candidates to branch `stage5e-staging` only; rollback = delete/reset the branch."

## Stop conditions encountered in Stage 5E
* Hosted target cannot be positively identified as staging → **no hosted change** (reported).
* Hosted-only migration SQL partly unknown (text not exported) and overlaps unresolved → no reconciliation claimed.
* D1 missing → no owner-governance or privilege change.
