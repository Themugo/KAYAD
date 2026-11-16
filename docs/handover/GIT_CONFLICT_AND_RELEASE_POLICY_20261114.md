# Git conflict and release policy — 14 November 2026

## Required behaviour

- No workflow may automatically merge a pull request or fall back to a direct merge.
- A failed/non-fast-forward `git push` is a stop condition, not permission to merge or force-push.
- Never use `git push --force`, `git reset --hard`, or an automatic rebase/merge to make a push succeed.
- Resolve divergence on a dedicated branch, inspect the diff, run checks, and use a reviewed pull request.
- Production deployment remains triggered by a push to `main`; therefore do not push directly to `main` as a routine workflow. Use a PR and repository branch protection/required checks.
- Repository owners must configure branch protection and disable any repository-level auto-merge setting if they require human approval for every merge. Removing a workflow cannot override a GitHub setting enabled by an owner.

## Safe Windows CMD sequence

```cmd
git status --short --branch
git fetch origin
git status --short --branch
git log --oneline --decorate --graph -12
```

If the local branch is behind or has diverged, stop. Do not force-push. Create a new branch from the current local work only after confirming the working tree and intended base, then push that branch and open a pull request. Resolve conflicts manually in the PR after reviewing both sides. Do not auto-merge.

## Scope

This policy does not commit, push, merge, deploy, or alter repository settings. The workflow removal only disables the repository's Dependabot auto-merge action.
