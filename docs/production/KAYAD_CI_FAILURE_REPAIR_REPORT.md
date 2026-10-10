# KAYAD CI Failure Repair Report

Run: GitHub Actions run `37886372392` (push event). Reported: **Security Audit** failed (~22 s), **Backend Quality Checks** failed (~26 s), **Quality Checks** succeeded, **Bundle Analysis** skipped.
Date of repair: 2026-10-09.

## 1. What could and could not be verified

| Item | Status |
|---|---|
| Remote run logs / annotations | **Not retrievable.** The GitHub token available to this session is invalid and the API returned 403 for the run; the repository could only be read anonymously. No log lines, annotations or the exact commit SHA of run `37886372392` were seen. |
| Commit SHA of the failing run | **Unknown to this session.** Last SHA known to have been pushed before this work: `ec5bced` (escrow convergence). |
| Root cause | **Reproduced locally**, not read from the remote log. The remote durations (22 s / 26 s) are consistent with an install followed by an early, deterministic failure rather than a test failure. |
| Fix verified remotely | **No.** It cannot be until the change is pushed and the workflow runs. The commands to confirm are in section 6. |

Nothing below is presented as observed in the remote run. Where the evidence is local, it says so.

## 2. Root causes (local reproduction)

The workflow files (`.github/workflows/ci.yml`, `security.yml`) were read in full.

### Security Audit (`security` job)
Steps: `npm ci` → `npm audit --audit-level=high` → grep for secrets in `src/`.
- Local `npm audit --audit-level=high` at the repo root reported **1 high** advisory: `source-map-js 1.0.0–1.2.1` (GHSA-68fv-2mgg-jv7q, event-loop DoS through indexed source-map section offsets). Exit code 1 — that is a failing step.
- The secrets grep (same patterns and `--include` set as the workflow) found nothing: exit 1 from grep = no match = pass.
- **Root cause:** a transitive dependency locked at a vulnerable version.

### Backend Quality Checks (`backend-quality` job)
Steps: `npm ci` in `backend/` → `npm audit --omit=dev --audit-level=high` → `npm test`.
- Local `npm audit --omit=dev --audit-level=high` in `backend/` reported 4 vulnerabilities (1 moderate, 2 high, **1 critical**):
  - `compression <1.8.2` (high, GHSA-vc2v-76pw-4v95, DoS via memory leak on premature response close)
  - `fast-copy 4.0.0–4.0.4` (moderate, GHSA-jggr-w7fw-pc2j, stack exhaustion)
  - `proxy-addr 1.1.0–2.0.7` (**critical**, GHSA-jqcg-44mw-7w3h, IP spoofing via IPv4-mapped IPv6 trust subnet)
  - `source-map-js 1.0.0–1.2.1` (high)
- The backend test suite itself **passed** locally (937 Jest + 16 Vitest + 1 node:test). So the audit step, which runs before the tests, is what stops this job.
- **Root cause:** vulnerable transitive/direct production dependencies in `backend/package-lock.json`.

### Security implication worth stating plainly
`proxy-addr` is what Express uses to compute `req.ip` behind `trust proxy`. KAYAD uses `req.ip` for rate limiting and for the M-Pesa callback IP allow-list. The advisory is therefore not cosmetic: it let a crafted address bypass those checks under some proxy configurations. The fix closes a real exposure.

### Quality Checks (succeeded)
No change needed. It does not run `npm audit`.

### Bundle Analysis (skipped)
`bundle-analysis` has `if: github.event_name == 'pull_request'`. Run `37886372392` was a push, so the job is skipped **by design**, not because something broke. It was left unchanged. It will run on the next pull request.

## 3. Fix

Minimal, semver-compatible lockfile updates. No `package.json` change, no override, no audit suppression, no threshold change, no workflow edit, no test change.

`backend/package-lock.json`: `compression 1.8.1→1.8.2` (adds `destroy 1.2.0`), `fast-copy 4.0.4→4.1.2`, `proxy-addr 2.0.7→2.0.8`, `source-map-js 1.2.1→1.2.2`.
`package-lock.json` (root): `source-map-js 1.2.1→1.2.2`.

Originals are kept in the evidence folder as `*-lock.orig` for diffing.

## 4. Local results after the fix

| Check | Result |
|---|---|
| root `npm audit --audit-level=high` | 0 vulnerabilities |
| backend `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| backend `npm test` | exit 0: 952 Jest passed (63 suites) + 16 Vitest + 1 node:test; 0 failed (937 before; +15 from the identity work) |
| root `npm test` | 70 files, 550 passed, 1 skipped, 0 failed |
| root `tsc --noEmit` | 0 errors |
| root `npm run build` | exit 0 |
| secrets grep from `ci.yml` | no matches |

Environment limits: local Node is 22.22.0 and CI uses 22.22.2; `engine-strict` in the root `.npmrc` makes `npm audit fix` refuse on 22.22.0, so it was run with `--engine-strict=false` for the lockfile update only. `validate-phase6-release` and `validate-v14-runtime-preflight` fail locally only on the "Node ≥ 22.22.2" check, which is an environment condition, not a code defect; CI runs them on 22.22.2.

## 5. Pitfall found while repairing
`npm audit fix --omit=dev` also prunes devDependencies from `node_modules`, which then makes `npm test` fail with "jest not found". That was a local artefact, repaired with `npm ci`; it does not affect CI, which does a clean `npm ci` first.

## 6. How to confirm remotely
1. Push the change. 2. Open the run for the new commit: `Security Audit` and `Backend Quality Checks` should be green. 3. Open a pull request once to see `Bundle Analysis` run. 4. If either audit job still fails, send the log's first failing line: the advisory IDs above are the ones that were present locally, and a newly published advisory after 2026-10-09 would need a fresh `npm audit` read.

## 7. Blockers
Remote evidence (run log, annotations, SHA) could not be obtained. This is the only unverified element, and it is stated rather than assumed.
