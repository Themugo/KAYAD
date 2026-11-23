# Baseline and Git state (verified before any change)
| Item | Value | Label |
|---|---|---|
| Working clone | `/home/claude/p11`, branch `release/kayard-combined-20261123` | Verified locally |
| Baseline HEAD | `0a3cc4ad11531968f5fd865fede4fab446581958` (tree identical to GitHub `main` 51f30b6d before my edits) | Verified (GitHub refs) |
| PR #266 | squash-merged to `main` as 2854f5ec (07:01 +03) | Verified |
| PR #267 | merged 10:47 | Verified |
| Deployment implication | `.github/workflows/deploy.yml` runs on push to `main`: validate, then Vercel prebuilt prod deploy when secrets exist. `render.yaml` defines `kayad-backend`. Whether either deployed which SHA is **Unverified** | Evidence incomplete |
| User's original tree `/home/claude/p1/repo` | 20 uncommitted modified files; untouched | Preserved |
| Protected tree `/home/claude/p8` | untouched | Preserved |

Defect present on GitHub `main` but fixed in the ZIP and this tree: the `$or` range-operator bug in `backend/db/index.js` plus its regression test (`backend/tests/regression/dbOrRangeOperators.test.js`). No commit, push, merge or deploy was performed by me.
