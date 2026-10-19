# Provenance record (Stage 5C.1) — what each archive and commit actually is

Everything below was **computed from the actual artifacts in this session** (sha256sum of the files, CRC/sha256 comparison of archive members, a shallow clone of the public repository). Nothing is carried over from memory or from a truncated hash.

## 1. Archives (full SHA-256, recomputed)

| Archive | Bytes | Full SHA-256 | Matches its own `.zip.sha256` | Matches the value quoted in the 5C.1 brief |
|---|---|---|---|---|
| `KAYAD-STAGE5B-MULTI-OWNER-GOVERNANCE-FULL-PROJECT-20261019.zip` (**first** 5B archive) | 45,947,366 | `1b2bf64fbdde18f22476664d978842a7e78403d45d8136dced5d975c42fce03a` | yes | yes (`1b2bf64f…ce03a`) |
| `KAYAD-STAGE5B-OWNER-GOVERNANCE-CERTIFIED-FULL-PROJECT-20261019.zip` (**certified closure** archive) | 46,298,202 | `b8b377d7c90c07cb00073600de1161cc138e4e33afb0b4a562d3312d84c1bdee` | yes | begins `b8b377d7` — yes |
| `KAYAD-STAGE5C-ONBOARDING-BREVO-OTP-OWNER-READINESS-FULL-PROJECT-20261019.zip` (Stage 5C) | 51,006,911 | `f6da5adcc07e9bb03b52bb00d437ddda898febaff84a49fd8b7e5634d6090fec` | yes | also matches the value the user computed on Windows with `certutil` |

Member counts: first 5B = 5,629 files; certified 5B = 5,656; 5C = 5,722.

## 2. Which archive was the 5C source?

Member-by-member CRC comparison of the three archives:

* First → certified: 21 files changed, 27 files added, 0 removed.
* Of the 21 files that differ between the first and the certified archive, the 5C ZIP carries the **certified** version in 20, the first-archive version in **0**, and a 5C-modified version in 1.
* All 27 files that exist only in the certified archive are present in the 5C ZIP (26 byte-identical, 1 modified by 5C).
* 5C is identical to the certified archive in 5,633 members and to the first archive in 5,587.

**Conclusion: the certified Stage 5B closure archive (`b8b377d7…bdee`) is the actual foundation of Stage 5C.** It superseded the first 5B archive (`1b2bf64f…ce03a`), which is therefore *not* the 5C source. The Stage 5C report previously did not say this explicitly; it now does (see the report's "Foundation" section).

## 3. Which commit?

* `git ls-remote https://github.com/Themugo/KAYAD main` returned `d9bfccfb34c5fb37dcfe5a2a1340ee053288dd86` — the commit the user pushed (rebased linear history, `675c0ecf..d9bfccfb`). A shallow clone of that commit was inspected.
* **Commit tree vs 5C ZIP** (5,638 tracked files compared by SHA-256): **5,631 byte-identical**, 2 differ, 5 are in Git but not in the ZIP; 89 ZIP members are not in Git.
  * differ: `backend/data/uploads.json` (the 5C ZIP carried a populated test store; the user restored the committed version before committing — see D5C1-01) and `runbooks/stage4-rehearsal-20261018/stage4_migration_risk_matrix.tsv` (line endings: the Windows checkout converted CRLF→LF).
  * in Git, not in the ZIP and not in any 5B archive: `KAYAD_STAGE3_CHANGE_LEDGER_20261013.md`, `KAYAD_STAGE3_SHA256_MANIFEST_20261013.txt`, `backend/tests/regression/leadControllerPersistence.test.js`, `backend/tests/regression/logoutBehavior.test.js`, `runbooks/APPROVED_READONLY_SCHEMA_REHEARSAL_20261013.md`. These were added to the commit by `git add -A` from the user's local working tree (the Windows-tree reconciliation blocker); they were **not reviewed or tested by Stage 5C or 5C.1**.
  * in the ZIP, not in Git: 87 evidence logs (`*.log` is git-ignored) and 2 test PNGs under `backend/uploads/` (git-ignored; shipped by mistake, D5C1-01).
* The statement in earlier hand-offs that the pushed tree was "byte-identical" to the certified tree is therefore **narrowed to**: identical except for the items above. Full list: `evidence/stage5c1-20261019/provenance/commit_vs_5czip.txt`.

## 4. What was NOT verified

* The user's local Windows working tree (not reachable; blocker unchanged).
* Whether the hosted deployment runs this commit (blocker B10).
* Commit `972bd276` (the pre-rebase local commit) was not inspected in this session; only `d9bfccfb` on `main` was.
