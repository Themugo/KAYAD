# KAYARD KE — Git Conflict and Release Policy

**Effective:** 19 November 2026  
**Applies to:** all contributors, automation, release branches and production hotfixes.

## 1. Protected release principles

- Preserve the shared branch history. Never use `git push --force`, `--force-with-lease`, history rewriting, or ref deletion to bypass a conflict or rejected push.
- Do not reset, clean, checkout-overwrite, or discard another contributor's uncommitted work without explicit owner approval.
- Do not merge a release branch until the working tree, target branch, upstream and commit ancestry have been inspected.
- Do not claim a merge, commit, push, migration or deployment succeeded unless the corresponding command/result confirms it.

## 2. Required preflight

Before integrating `main` or another release branch:

1. Record `git status --short --branch` and `git branch --show-current`.
2. Fetch the intended remote and inspect `git log --graph --oneline --decorate --all -30`.
3. Confirm the merge base and inspect incoming/outgoing commits.
4. Run the project's required Node version from `.nvmrc` / `.node-version`.
5. Confirm dependency lockfiles are unchanged unless dependency changes are intentional.
6. Run the relevant source validators before and after integration.

## 3. Conflict handling

- Resolve conflicts by understanding both sides and preserving valid behaviour from each.
- Do not blanket-accept `ours` or `theirs` for application, migration, lockfile, authorization, financial, or workflow files.
- For each conflict, inspect the base and both variants; document the chosen resolution and why.
- Re-run the validators and tests covering every resolved area.
- If the correct resolution cannot be established, stop and request owner direction rather than guessing.

## 4. Release gates

A release candidate must record:

- Exact source commit and branch (or archive SHA-256 when Git metadata is unavailable).
- Node and package-manager versions.
- Clean dependency installation result.
- Type-check, lint, unit, integration and production-build results.
- Authenticated browser journeys for the supported roles and responsive viewport coverage.
- Database migration review and deployment/rollback plan.
- Known blockers, environment dependencies and any checks not run.

Static source-contract validators are useful evidence but do not replace runtime, browser or authenticated workflow tests.

## 5. Deployment and database safety

- Never run production migrations, data repair, destructive jobs or deployments as an incidental validation step.
- Require explicit environment selection and a reviewed migration/rollback plan.
- Keep secrets out of source, logs, reports and archives. Use environment examples with names only.
- Do not report a deployment as healthy based only on a successful build or HTTP process start.

## 6. Recovery

If a merge or release operation is interrupted, preserve the repository state and logs. Identify the current HEAD, index state, working-tree changes and remote refs before attempting recovery. Prefer a new recovery branch or a documented revert over rewriting shared history.

## 7. Evidence

Every handover must separate **passed**, **failed**, **blocked**, **not run**, and **historical** checks. A previous report is not current evidence unless its exact source snapshot and execution environment are verified.
