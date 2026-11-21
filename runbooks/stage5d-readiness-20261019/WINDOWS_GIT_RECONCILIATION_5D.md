# Stage 5D — Windows / Git reconciliation of the five unreviewed files (Gate 2)

The Windows tree (`C:\Users\hp\Desktop\kayad-fresh`) is **not accessible** from this session (device bridge not connected); nothing is claimed about it beyond what the user pasted from `git status`. The public repository clone at `f65292af` was inspected. Nothing was deleted, renamed, staged, committed or pushed.

| Path | Bytes | SHA-256 | In HEAD | In 5B/5C/5C.1 ZIPs | Origin / purpose |
|---|---|---|---|---|---|
| `KAYAD_STAGE3_CHANGE_LEDGER_20261013.md` | 4335 | `9b25066173d371460e9125741a79b09f0f146979aeb9eb2e37b47c26a6e616da` | yes | no | Stage 3 pre-staging change ledger, commit `30a4529` (2026-10-14) |
| `KAYAD_STAGE3_SHA256_MANIFEST_20261013.txt` | 539637 | `e2308d350601c18be84a278401e279c6b24ba45c7f6018c3dd74bab1538b4f9c` | yes | no | Stage 3 SHA-256 manifest, same commit |
| `backend/tests/regression/leadControllerPersistence.test.js` | 4620 | `9909d4440dc8dffe3530e55e0cff69bce34683447f24053c401a033370780a4b` | yes | no | lead persistence regression test; **stale** |
| `backend/tests/regression/logoutBehavior.test.js` | 3906 | `99e4262259fac039ac0eb392845ff2dfe2c156991eb74527637763a35d22d226` | yes | no | logout regression test; **stale** |
| `runbooks/APPROVED_READONLY_SCHEMA_REHEARSAL_20261013.md` | 9240 | `96614bb5b254925e3eced7c20ad2428fc4f5279f8554f262bfca3596c7a99ff8` | yes | no | procedure for an owner-approved read-only schema export; does not authorize production access |

(hashes = HEAD content as committed; the 5D tree restores them byte-identical before the test fixes.)

**Provenance correction.** `PROVENANCE_RECORD_5C1.md` §3 says these were added by `git add -A` from the local tree. That is wrong: they were introduced by commit `30a4529`. The Windows `git status` showed them as ` D` because the 5B/5C archives omitted them; the user restored them from HEAD before committing `f65292af`. The released 5C.1 ZIP is unchanged.

**Finding fixed in 5D (Gate 8).** Because the archives omitted the two tests, no certified run executed them; on `main` both fail to load (stale mocks): `logoutBehavior` lacked `logWarn`; `leadControllerPersistence` mocked renamed service exports (`createLead`→`resolveLead`, `updateLeadNotes`→`setLeadNotes`) and missed `db/index.js`. Role gating moved to the `dealerOnly` route and trimming moved to the zod route schemas. The tests were updated to the current contract — every original behavior is still asserted at the layer that owns it (trim → schema test, role gate → route; controller ownership 403 retained) — plus the `created` flag. No production code was changed.

**Plan for approval (not executed).** Retain all five. Apply the two corrected tests from the 5D ZIP to the Windows tree and commit them with the 5D docs; do not delete the other three.
