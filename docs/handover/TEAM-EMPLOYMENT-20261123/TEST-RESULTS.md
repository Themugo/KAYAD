# Test results — Team & Employment (all LOCAL; none is production evidence)

| Suite | Result | Evidence |
|---|---|---|
| Backend Jest (default config) | PASSED — 261 suites passed, 1 skipped; 4,308 tests passed, 21 skipped, 0 failed | evidence/backend-jest-full.txt |
| Frontend Vitest | PASSED — 229 files; 1,961 passed, 1 skipped, 0 failed | evidence/vitest-full.txt |
| TypeScript `tsc --noEmit` | PASSED (exit 0) | evidence/tsc.txt |
| Production build | PASSED (exit 0) | evidence/build.txt |
| DB journey 22 employment lifecycle (real HTTP + Postgres) | PASSED 57/57 | evidence/journey-22_employment_lifecycle.txt |
| Journeys 10, 12, 14, 16, 17, 18, 20, 21 (regression) | PASSED, 0 failures each | evidence/journey-*.txt |
| Browser Team & Employment (desktop + 390px) | PASSED 25/25 | evidence/browser-team-employment-run.txt, evidence/browser/*.png |
| Browser v5 invitation journey (updated for tabbed Team page) | PASSED 55/55 (with the TEST stack's invitation limit raised; production limit unchanged and proven by journey 21) | evidence/browser-invitation-v5-run.txt |
| Migration | Applied cleanly as part of 212/212 migrations on the disposable DB; rehearsed twice on a scratch copy; scratch DB dropped | — |

Notes
* Journeys must run in separate stacks per batch: the per-IP invitation limiter is shared inside one stack run, so chaining 17/21/22 in one stack produces legitimate 429s (limits were not weakened).
* Existing tests deliberately updated (UI/contract changed): DealerTeamRolesPanel, DealerWorkflowWrites, DealerSectionContracts, DealerWorkspaceNavigation, DealershipWorkspace/Hub mocks, dealerWorkspaceDelegation (membership now carries `dealerId`), phase13dDealerIsolation (new controller names), team route policy matrix (19 routes), team roles (6 built-ins), journey 16/18 seeds. The dark-theme generated CSS was regenerated (`node scripts/generate-dark-theme.mjs`).
* NOT RUN / NOT VERIFIED: anything on hosted Supabase, Render or Vercel; PR 266 status; real e-mail delivery (provider stub only); migration on the hosted database.
