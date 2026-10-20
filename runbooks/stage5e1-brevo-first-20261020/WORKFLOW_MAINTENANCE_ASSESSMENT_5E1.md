# Stage 5E.1 — GitHub Actions maintenance warnings (separate from the Gitleaks failure)

**The two warnings and the Gitleaks failure are unrelated.** The failure is a rule match in a test file (fixed, `GITLEAKS_FINDING_5E1.md`). The warnings are runtime-deprecation notices.

## 1. What the repository actually uses (`.github/workflows/*.yml`, read from `main` @ `0a3d10bb`)
| Action | Current | Files | Runtime of current (read from its `action.yml`) |
|---|---|---|---|
| `actions/checkout` | v4 | ci, deploy, security | node20 |
| `actions/setup-node` | v4 | ci, deploy | node20 |
| `actions/upload-artifact` | v4 | ci, deploy | node20 |
| `actions/download-artifact` | v4 | deploy | node20 |
| `actions/github-script` | v7 | dependabot-auto-merge | node20 |
| `github/codeql-action/{init,autobuild,analyze}` | v3 | security | (v3 — scheduled for deprecation Dec 2026, per the CI annotation) |
| `gitleaks/gitleaks-action` | v2 | security | node20 |
The project's own Node pin (`22.22.2` in `setup-node`) is for *your* code and is unaffected.

## 2. Timeline (secondary source, a vendor blog; the CI annotations you quoted are the primary signal)
Node 20 reached end-of-life in April 2026; runners began defaulting JavaScript actions to Node 24 on 16 June 2026 (this is the "forced onto Node.js 24" warning); **removal of Node 20 from hosted runners is announced for fall 2026 with no opt-out** — i.e. now. After that, workflows still pinned to node20-only actions are expected to fail. So this is a *scheduled-breakage risk with a near deadline*, not just noise.

## 3. Versions verified to run on Node 24 (each `action.yml` read directly from GitHub, 20 Oct 2026)
| Action | Lowest verified Node-24 major | Notes |
|---|---|---|
| checkout | **v5** (v6, v7 also exist) | v5 and v6 `node24` confirmed |
| setup-node | **v5** | `node24` confirmed |
| upload-artifact | **v6** (v7 `node24` confirmed) | **v5 is still `node20`** — a vendor blog claimed otherwise; the source says node20 |
| download-artifact | **v7** (v6 is `node20`) | upload and download should move together (same artifact backend generation) |
| github-script | **v8** | `node24` confirmed |
| codeql-action | **v4** | `node24` confirmed; same `init/autobuild/analyze` structure |
| gitleaks-action | **v3** | `node24` confirmed; v2 is `node20`. Behaviour of v3 vs v2 with `GITLEAKS_CONFIG` **not tested** |

## 4. Decision: **recommended, NOT applied**
Why not applied in this change: (a) it cannot be reproduced locally — a hosted CI run is the only real test; (b) bundling a CI-runtime change with the secret-fix would blur two independent changes and make a CI regression hard to attribute; (c) the production-deploy workflow is in the set; (d) the instruction was to change only what is safe.
A ready, syntax-checked candidate is provided: `workflow-candidate/WORKFLOW_ACTIONS_NODE24_CANDIDATE.patch` (23 changed lines across 5 workflow files; `git apply --check` clean against `main`'s workflow files). Proposed pins: checkout@v5, setup-node@v5, upload-artifact@v7, download-artifact@v7, github-script@v8, codeql-action/*@v4, gitleaks-action@v3. Nothing else (triggers, permissions, node-version, job structure, scan config) is touched; **CodeQL and Gitleaks coverage are preserved** (same jobs, same config).
Local validation done: `actionlint v1.7.7` on the workflows before and after — **identical output** (one pre-existing issue, below). Not done / cannot be done here: executing any workflow, confirming v3 gitleaks-action behaviour, confirming artifact hand-off between upload v7 and download v7 in `deploy.yml`.
Suggested rollout: separate PR from a branch; watch CI + the first non-production run; merge only if green. Do **not** let the first run of changed `deploy.yml` be the production deploy — see §5.

## 5. Operational caution found while reading the workflows
`deploy.yml` ("Deploy to Production") triggers on **every push to `main`** and runs `vercel deploy --prod`. It is a *separate workflow* from the secret scan, so the failing Gitleaks job did **not** block a production frontend deployment of `0a3d10bb` (the validate job in `deploy.yml` is what gates it). Whether the Render backend auto-deploys on push is **unknown** (`render.yaml` sets no `autoDeploy`; `render-staging.yaml` sets `true`). Recommendation: from now on push to a branch and merge a PR so required checks (Gitleaks, CodeQL, CI) can pass *before* production deploys; make "Secret Scan" a required status check on `main` (repository setting — owner action).

## 6. Pre-existing workflow defect (not changed)
`actionlint` reports `dependabot-auto-merge.yml:113:13: property "result" is not defined … steps.<id>.result` — step contexts expose `outcome`/`conclusion`, not `result`; the expression is always empty. Same before and after the proposed bumps.
