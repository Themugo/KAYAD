# KAYAD — Test Stability Correction

Date: 2026-09-28

## Trigger
The Windows certification run completed `npm ci`, `npm run lint`, and `npm run build` successfully, but `npm test` ended with 39 test files passed / 188 tests passed and 7 Vitest worker-start errors. The failing workers timed out while starting several frontend suites. This is a test-runner resource/concurrency failure, not a TypeScript or Vite build failure.

## Root cause addressed
The active `vitest.config.ts` did not retain the project's earlier two-fork worker cap. The repository change history documents that a two-fork cap had previously been introduced specifically to prevent large React suites from exhausting worker memory. The correction restores that guard in the active TypeScript config.

## Source correction
`vitest.config.ts`
- pool: `forks`
- maxForks: `2`
- minForks: `1`

No application runtime code, API contracts, database logic, security policy, UI behavior, or business workflow was changed by this correction.

## Required verification
Run on the user's Windows environment with Node >= 22.22.2:

```cmd
cd /d "C:\Users\hp\Desktop\KAYAD-main" && npm run lint && npm run build && npm test
```

Do not mark this correction complete until the full `npm test` run completes without worker-start errors and the complete suite is accounted for. React `act(...)` messages are warnings and should be tracked separately from test-runner errors unless they become failures.
