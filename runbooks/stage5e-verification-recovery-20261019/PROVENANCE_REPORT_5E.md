# Provenance report (Stage 5E — verification-recovery scope)

| Item | Result |
|---|---|
| Foundation archive | `KAYAD-STAGE5D-HOSTED-PREFLIGHT-READINESS-FULL-PROJECT-20261019.zip` |
| Expected SHA-256 | `b44dc4f2d0ada531e9c7e04382f2185b6ce5693b28af793b14d9dd0a6dc845c5` |
| Observed (before extraction) | identical — **HASH MATCH** |
| Manifest verification (fresh extraction, separate directory) | in-archive `KAYAD_STAGE5D_SHA256_MANIFEST_20261019.txt`: 5,810 rows, **0 mismatches**; external `…file-manifest.sha256.txt`: **0 mismatches**; 5,811 files extracted |
| Work copy | `/home/claude/s5f/x` (isolated; the user's Windows tree and all earlier ZIPs untouched) |
| Git identity | The archive is not a Git repository. From the earlier 5E provenance pass (read-only clone of the public repository): `origin/main` = `552aa5a5c260d17325faee83346f1422a137bafc` (Stage 5D), parent `f65292af`; archive vs `origin/main`: 0 paths only in Git, 113 only in archive (`*.log`, git-ignored), 1 blob differing by line endings only (CRLF vs LF). Whether the owner pushed the earlier 5E package is **not observed here** |
| Five-file provenance discrepancy (5D) | Corrected record retained: files originate from commit `30a4529` (2026-10-14), present in `origin/main` and in the 5D archive; the two stale tests were fixed in 5D |
| Changes made in this stage | 4 source files, 4 new test files, harness + evidence + docs — see `CHANGE_LEDGER_5E.md`. Everything else is byte-identical to 5D (diff against the pristine extract) |
| Earlier-5E additions | The prior pass's report, runbooks (`stage5e-owner-activation-20261019/`), evidence (`evidence/stage5e-20261019/`) and migration *candidates* are carried into this package unchanged (copied only where absent) so this ZIP is a superset of both |
| Excluded by design | `.git`, `node_modules`, `.env*`, `*.sqlite`, `dist`, upload residue, runtime `logs/` |
| Migrations | 181 files in `supabase/migrations/`, none added/changed in this stage; candidates live outside that directory so **no push of this package can trigger a migration** |
| Windows working tree | **Not accessible** (no device link in this session) ⇒ **Windows reconciliation NOT complete**; commands in `WINDOWS_READONLY_COMMANDS_5E.md` |
| "Local source = deployed source?" | **No claim made.** Deployed revision UNKNOWN; the observed login message shows ≥ Stage 5A only |
| Clean tree claim | None made (no Git tree was inspected here) |

Outstanding verification gaps: Windows tree state; unpushed local work; deployed revision; whether the earlier 5E package was committed.
