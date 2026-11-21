# Stage 5E — Provenance report (Workstream A)

| Item | Result |
|---|---|
| Source archive | `KAYAD-STAGE5D-HOSTED-PREFLIGHT-READINESS-FULL-PROJECT-20261019.zip` |
| Expected SHA-256 | `b44dc4f2d0ada531e9c7e04382f2185b6ce5693b28af793b14d9dd0a6dc845c5` |
| Observed SHA-256 | identical — **HASH MATCH** (checked before extraction) |
| Extraction | 5,811 files, fresh directory; `KAYAD_STAGE5D_SHA256_MANIFEST_20261019.txt` verified with `sha256sum -c`: **0 mismatches** over 5,810 rows |
| Excluded by design | `.git`, `node_modules`, `.env*`, `*.sqlite`, `dist`, upload residue (guards in the 5D package script) |
| Git identity in the execution environment | The extracted tree is **not** a Git repository. A read-only clone of the public repository was fetched: `origin/main` = `552aa5a5c260d17325faee83346f1422a137bafc` ("Stage 5D: hosted-schema preflight…"), parent `f65292af` (5C.1). |
| Archive vs `origin/main` | 5,698 paths in both; **0** paths only in Git; **113** only in the archive (all `*.log` evidence files — `.gitignore` excludes `*.log`); **1** blob differs: `runbooks/stage4-rehearsal-20261018/stage4_migration_risk_matrix.tsv` is CRLF in the archive and LF in Git (`.gitattributes` `* text=auto eol=lf`) — identical apart from line endings. **No unexplained difference.** |
| Migration filenames | 181 files in `supabase/migrations/`; no duplicate version prefixes; list unchanged from 5D (63 not on hosted: `evidence/stage5e-20261019/hosted/miss63.txt`). |
| Five-file discrepancy | Corrected record retained (5D): the five files originate from commit `30a4529` (2026-10-14), not from `git add -A`. They are present in `origin/main` and in the 5D archive. The two stale tests were fixed in 5D. |
| Windows working tree | **Not accessible** (no device link in this session). Windows reconciliation is **not complete**. Read-only commands for you to run are in `WINDOWS_READONLY_COMMANDS_5E.md`. |
| Worktree status here | Extract is pristine apart from the Stage 5E additions listed in `KAYAD_STAGE5E_READINESS_REPORT_20261019.md`. |

Outstanding verification gaps: Windows tree state; whether the user's local branches/stashes hold unpushed work; the deployed backend revision.
