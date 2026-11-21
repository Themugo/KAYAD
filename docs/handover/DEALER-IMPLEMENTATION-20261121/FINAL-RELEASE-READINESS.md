# Final release readiness

Verdict: **READY FOR OWNER REVIEW — NOT RELEASE-READY.** Code and tests for DA-01 … DA-07 are complete and green on disposable infrastructure, but release needs owner actions and has open items.

Blockers before release
1. The two migrations have not been applied anywhere except disposable databases. Hosted is missing earlier migrations the lifecycle function depends on (see migration review); apply the pending chain in order on staging first.
2. Real image-provider upload is untested (BLOCKED).
3. Owner decisions D-3 … D-8 (Pause / Publish UI, role contradictions, sidebar naming, legacy removal, banking-at-rest).

Safe next steps (cmd.exe, from the project folder, after reviewing the patch):
```
git checkout -b feat/dealer-account-lifecycle
git apply --check dealer-implementation.patch
git apply dealer-implementation.patch
npm test && npm run typecheck && npm run build
```
Then commit only after you approve (use `git add` with explicit paths from `IMPLEMENTED-FILES-AND-CHANGES.md`, not `-A`), open a PR, run `ci/db-journeys/run.sh`, apply migrations to staging, then production in order, and reload PostgREST (`NOTIFY pgrst, 'reload schema'`).
Rollback: see migration review; code rollback is a revert of the PR.
