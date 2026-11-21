# Stage 5E.1 — Change ledger and provenance

## Provenance
| Item | Value |
|---|---|
| Foundation | `KAYAD-STAGE5D-HOSTED-PREFLIGHT-READINESS-FULL-PROJECT-20261019.zip` sha256 `b44dc4f2…45c5` — **matches the expected value**; `unzip -t` clean |
| What was pushed | public repo `Themugo/KAYAD`, `main` HEAD = `0a3d10bb…` ("Stage 5E: owner verification recovery…"), parent `a8d79bfd` (first Stage 5E pass), then `552aa5a5` (Stage 5D). Inspected by a **read-only clone in a separate directory** |
| Is `main` the Stage 5D archive? | **No** — `main` = 5D + the two Stage 5E packages. Not assumed identical, compared |
| `main` vs the Stage 5E.2 package I delivered | tree diff: **no content differences** except (a) `*.log` files that `.gitignore` excludes and (b) one file, `runbooks/stage4-rehearsal-20261018/stage4_migration_risk_matrix.tsv`, which is CRLF in every archive since Stage 4 but LF in Git (`.gitattributes`: `* text=auto eol=lf`); identical after stripping CR. Left as is ⇒ `0a3d10bb` is that package |
| Branch / working-tree state of the Windows clone | **not observable from this environment** (read-only commands in `WINDOWS_READONLY_COMMANDS_5E.md`). Whether the owner has uncommitted local changes is UNKNOWN |
| Work copy | `/home/claude/s5f/x` (this stage's edits on top of the 5E.2 tree); pristine copies kept; nothing in the Windows tree touched |
| Preserved | every prior ZIP in `/home/claude/out`, uploads, SQLite files, Git history (no commit, push, rebase or force-push by Claude) |
| Tool provenance | Gitleaks v8.18.4 and actionlint v1.7.7 from their official GitHub releases (hashes in evidence notes); not part of the package |

## Changes (application behaviour: **none changed**)
| # | File | Type | Why | Tests |
|---|---|---|---|---|
| 1 | `backend/tests/regression/stage5eResendCommitOnProviderAcceptance.test.js` | edit | F-5E1-01: fixture value no longer matches the repo secret rule | file passes (13) |
| 2 | `backend/tests/regression/stage5aEmailVerificationGate.test.js` | edit | same fixture, same finding class | file passes (13) |
| 3 | `backend/tests/regression/stage5e1BrevoResendIntegration.test.js` | new | required scenarios 1–10 end to end | 27 |
| 4 | `backend/tests/regression/stage5e1BrevoAdapterRetry.test.js` | new | real retry policy, unset sender | 6 |
| 5 | `backend/tests/regression/stage5e1VerificationRateLimit.test.js` | new | scenario 7 on the real limiter | 5 |
| 6 | `backend/scripts/brevo-readiness.mjs` | new tool | F-5E1-02; read-only, offline by default | `stage5e1BrevoReadiness` 12 |
| 7 | `backend/tests/regression/stage5e1BrevoReadiness.test.js` | new | tool tests | 12 |
| 8 | `runbooks/stage5e1-brevo-first-20261020/*` (10 docs, candidate patch) | docs | deliverables | n/a |
| 9 | `evidence/stage5e1-20261020/*` | evidence | logs, sanitized scan summaries | n/a |
| 10 | `KAYAD_STAGE5E1_BREVO_FIRST_REPORT_20261020.md`, `README_STAGE5E1_RELEASE.md`, SHA-256 manifest | docs | report, manifest | n/a |

## Explicitly NOT changed
`.gitleaks.toml` (no allow-list), all application source, migrations, dependencies and lockfiles, `.github/workflows/*` (candidate patch only), package scripts, any assertion in an existing test, the Windows tree, any hosted system.

## Stage 5E.2 changes still in force (from `0a3d10bb`, unchanged here)
`authApi.ts`/`LoginPage.jsx` owner-unverified panel; `authController.resendVerification` unconditional acceptance check; `owner-bootstrap.mjs --verify-designated`.
