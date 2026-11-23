# Deployment topology (2026-11-23, revised 2)
Classes: Confirmed · Reproduced locally · Inferred · Unverified · Blocked.

## Git state — Confirmed (fresh clone of GitHub, read-only)
| Ref | SHA | Note |
|---|---|---|
| `release/kayard-combined-20261123` (remote) | `0a3cc4ad11531968f5fd865fede4fab446581958` | equals the baseline in the command; verified directly |
| `main` | `51f30b6d` — "Release/kayard combined 20261123 (#267)", 2026-11-23 10:47 +03 | **tree byte-identical to the release branch HEAD** |
| PR #266 | squash-merged into `main` as `2854f5ec` on 2026-11-23 07:01 +03; `refs/pull/266/head` still `7de6f2a` | **PR 266 is already merged** (by the owner, before this command; the command assumed it was open) |
| PR #267 | merged 10:47 +03 (the docs commit `0a3cc4ad`) | |
So everything in the release branch, code and migration files, is on `main`. Nothing was merged, pushed or committed by Claude.

## Deployment pipeline — Confirmed (repo files)
- `.github/workflows/deploy.yml`: **every push to `main`** runs validation and then deploys the frontend to Vercel (`vercel deploy --prebuilt --prod`) if the three Vercel secrets exist. → The merges at 07:01 and 10:47 most likely triggered production frontend deploys (run result: Unverified).
- `vercel.json`: `/api/*` and `/uploads/*` are rewritten to `https://api.kayad.space`; the browser never calls Supabase (no `createClient`/`VITE_SUPABASE_*` in `src/`).
- `render.yaml`: service `kayad-backend` (Docker, oregon); no `autoDeploy` key, so Render's default (auto-deploy on push to the linked branch) is **Inferred**, not confirmed; `SUPABASE_URL`/keys are `sync:false` (values not visible).

## Which backend is live — mixed evidence
- Confirmed: a Node client with the service role calls `ubvgixwhfybbyjuvxboj.supabase.co` continuously (users/user_auth/refresh_tokens, analytics, reconciliation jobs).
- Confirmed: at 2026-11-23 04:06:40 UTC (= 07:06 +03, five minutes after the #266 merge) that client queried all four command-centre sources; the same code is not on the pre-merge `main`. **Inferred (strong): the deployed backend was built from `main` at/after `2854f5ec`.** Exact deployed SHA: **Unverified** (Render dashboard not reachable from here; the live host is not on the session allowlist).
- Supabase project used by the backend: Confirmed that this project receives the backend's traffic; that it is *the Render service's* `SUPABASE_URL`: Likely. Environment: dashboard badge says "Production" (owner paste), no staging project exists.
- Frontend → API target: Confirmed in `vercel.json`; the live Vercel project's commit: Unverified.

## Owner steps to turn Unverified into Confirmed (no secrets)
Render → `kayad-backend` → Deploys: latest live deploy commit SHA and time; Environment: only the host part of `SUPABASE_URL`. Vercel → Deployments: production commit SHA/branch. GitHub → Actions → "Deploy to Production": did the 07:01 and 10:47 runs succeed? (`gh run list --repo Themugo/KAYAD --workflow "Deploy to Production" --limit 5`).

## Consequence
Because `main` is already merged and deploys automatically, the "hold the merge" gate can no longer be applied. The live app is now running code that expects database objects hosted does not have. See `LISTING-RPC-COMPATIBILITY.md`, `LOGIN-ROOT-CAUSE.md` and `PRODUCTION-RECONCILIATION-PLAN.md` (database-first sequence).
