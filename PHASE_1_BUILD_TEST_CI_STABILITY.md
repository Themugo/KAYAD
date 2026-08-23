# KAYAD HARDENING — PHASE 1: BUILD, TEST AND CI STABILITY REPORT

Scope per instructions: no features, no redesign, no business-requirement changes. Every fix below is build/test/CI infrastructure only. All fixes were run and their result directly verified (exit codes checked, not assumed) - not just written and hoped to work.

**The canonical commands now exist and were verified working, exactly as required:**
- `npm run typecheck` — frontend, exit 0
- `npm test` — frontend, exit 0 (317 passed, 1 intentionally skipped, 0 failing)
- `npm run build` — frontend, exit 0
- `npm test` — backend (run from `backend/`), exit 0 (216 passed, 0 failing)

---

## FAILURE 1 — CI's "Test" step failed on every single run, unconditionally

**Root cause:** `ci.yml` ran `npm test`, but the frontend's `package.json` had no `"test"` script defined at all.

**Verification of the problem, before fixing anything:** ran `npm test` directly. Result:
```
npm error Missing script: "test"
```
This is not a hypothetical - it is what running the command actually produces. Every CI run on this workflow would have failed at this exact step, meaning the Build step and artifact upload after it never ran either.

**Exact fix:** added `"test": "vitest run"` to `package.json`'s scripts (Vitest itself was already correctly configured in `vitest.config.ts` - a real, working config with a setup file, jsdom environment, and coverage thresholds already present. The gap was purely that nothing exposed it as `npm test`). Also added `"typecheck": "tsc --noEmit"` as the canonical name (the existing `"lint"` script did this already but under a misleading name - kept as an alias, not removed, so nothing that already calls `npm run lint` breaks).

**Verification result:** `npm test` now exits 0, 317 tests passed, 1 intentionally skipped, 0 failed, across 48 test files.

---

## FAILURE 2 — Backend's own test command failed on every run, despite every test passing

**Root cause:** `backend/jest.config.js` had `collectCoverage: true` and a `coverageThreshold` (50-60% across `controllers/`, `services/`, `middleware/`, and globally). Coverage instrumentation does not function under this project's real module setup (native ESM via `--experimental-vm-modules`, no Babel/TypeScript transform - confirmed intentional, `transform: {}` in the config). The result: every coverage percentage reports as exactly 0%, for every file, including files that are directly and explicitly tested.

**Verification of the problem, before fixing anything:** ran `npm test` in `backend/` directly and checked the actual exit code (not just the pass/fail summary text, which looked fine): **exit code 1**, despite "Tests: 216 passed, 216 total" appearing in the same output. Then isolated the cause further: ran coverage collection scoped to only `utils/**/*.js` and confirmed `utils/AppError.js` - which is directly, explicitly tested by `AppError.test.js`, a real, passing test - still reported 0% coverage. This proves the instrumentation itself is non-functional here, not that those directories are undertested (though `controllers/`, `services/`, and `middleware/` are separately, genuinely never touched by any of the 10 existing test files - a real, distinct fact, not fixed here, see "Remaining gaps" below).

**Exact fix:** set `collectCoverage: false` in `backend/jest.config.js` and removed the `coverageThreshold` block. No test was deleted, skipped, or weakened - all 10 test files and all 216 assertions are unchanged. `collectCoverageFrom`, `coverageDirectory`, and `coverageReporters` were left in place so `npm run test:coverage` (a separate, already-existing, opt-in script) still produces a report for anyone who wants to look at it manually - it just no longer gates the default `npm test` exit code on a metric that cannot currently produce a real number.

**Verification result:** `npm test` in `backend/` now exits 0. Confirmed the exact same 216/216 tests still run and pass - nothing was made to "look" green by removing coverage of real logic; the tests themselves are byte-for-byte unchanged.

---

## FAILURE 3 — CI never ran the backend's tests at all

**Root cause:** `ci.yml` had exactly one job installing and checking code, and it only ever ran `npm ci`/`npm run lint`/`npm test`/`npm run build` against the repository root (the frontend). No step anywhere in any of the four workflow files (`ci.yml`, `deploy.yml`, `security.yml`, `dependabot-auto-merge.yml`) installed backend dependencies or ran the backend test suite. This means the backend's real, substantial 216-test suite has had zero CI coverage - a backend regression could be merged to `main` with CI showing green.

**Exact fix:** added a second, independent job (`backend-quality`) to `ci.yml` that checks out the repo, sets up Node 22 (matching the frontend job and this project's `.nvmrc`), installs backend dependencies via `npm ci` scoped to `backend/package-lock.json`, and runs `npm test` from the `backend/` directory - the exact same command a developer runs locally, per the instruction that CI must run real, local-equivalent commands.

**Verification result:** the workflow YAML was validated as syntactically correct (parsed successfully with a YAML parser). The backend job's own commands (`npm ci`, `npm test`) were verified locally in isolation and both exit 0 (Failure 2's fix + this job together). The GitHub Actions runner environment itself was not available to execute directly in this session - flagged explicitly under "Remaining environment-dependent checks" below, not silently assumed to work.

---

## FAILURE 4 — Frontend `package.json` had no `engines` field at all

**Root cause:** the backend correctly declares `"engines": {"node": ">=20.x"}`, and a root `.nvmrc` file specifies `22` - but the frontend's own `package.json` declared no `engines` field whatsoever, meaning `npm install`/`npm ci` would not warn or fail if run under an incompatible Node version, silently relying on whoever's running it having read `.nvmrc`.

**Exact fix:** added `"engines": {"node": ">=20.0.0"}` to the frontend `package.json`, matching the backend's stated minimum (standard semver range syntax used instead of the backend's `>=20.x`, which is non-standard but was confirmed to parse identically via `semver.validRange()` - not changed in the backend, since that would be an unrelated, unnecessary edit outside this failure's scope).

**Verification result:** `npm ci` at the repository root still completes successfully under the actual Node 22 runtime this environment provides (consistent with the new, now-declared minimum).

---

## FAILURE 5 — A high-severity dependency vulnerability had regressed (again)

**Root cause:** `nanoid <3.3.18` (a transitive dependency) had a known, high-severity advisory (indefinite-loop generator bug). This specific package had reportedly been fixed once already earlier in this project's history, and was found, on direct `npm audit` inspection this pass, to be present again - consistent with a pattern (also seen with a separate `semantic-release`/`dompurify` pair of fixes in prior work on this project) of dependency fixes not persisting across some part of this project's push/deploy process. That underlying process question is out of this phase's scope to diagnose, but is named here since it directly affects "reproducibly installable."

**Exact fix:** ran `npm audit fix` at the repository root (a safe, non-breaking version bump - confirmed by re-running the full test suite immediately after, see below).

**Verification result:** `npm audit` now reports 0 vulnerabilities (was 1 high). Re-ran `npm run typecheck` and `npm test` immediately after the dependency change to confirm nothing broke: both still exit 0, same 317/318 result as before the bump. Backend `npm audit` was also checked and already reported 0 vulnerabilities (no backend fix needed this pass).

---

## Investigated, confirmed as a real inconsistency, not fixed this pass (explicitly out of Phase 1's stated scope)

**Duplicate `src/lib/supabaseClient.js` and `src/lib/supabaseClient.ts` files exist side by side.** Checked which one is actually used: `src/context/SocketContext.tsx` imports a `RealtimeChannel` type that only the `.ts` version exports - confirmed the `.ts` version is the real, resolved one (typecheck passes cleanly on this import). The `.js` version additionally contains cookie-security options (`secure`, `sameSite`, `maxAge`) that the `.ts` version does not have - a genuine, not-yet-reconciled difference between the two, separate from which one is "canonical." Not touched this pass: resolving/deleting duplicate files is explicitly a Phase 0 audit finding, not a Phase 1 build/test/CI concern, and this phase's instructions say not to delete anything without that being the task at hand.

**Neither Supabase client version hard-fails the build or startup on missing `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.** Both silently fall back to a placeholder URL and only `console.error` if `import.meta.env.PROD` is true - meaning a real production deployment missing these variables would build and run without any CI or startup failure, only discoverable via browser console inspection. This is a real "missing environment variable validation" gap matching this phase's own requirement list. Not fixed this pass because doing so (e.g., failing the build hard on missing prod env vars) is a behavior change to the build's own pass/fail contract that goes beyond "make existing commands work reproducibly" - flagged here explicitly rather than silently left out of the report.

---

## Files changed this phase

- `package.json` (root) — added `engines`, added `typecheck` and `test` scripts, kept `lint` as an alias.
- `package-lock.json` (root) — updated by `npm audit fix` (nanoid version bump only).
- `backend/jest.config.js` — disabled non-functional coverage gating (`collectCoverage: false`, removed `coverageThreshold`), left coverage reporting itself intact for opt-in use.
- `.github/workflows/ci.yml` — renamed the typecheck step to match the new canonical script name, added a new, independent `backend-quality` job running the backend's real test command.

No source logic, no tests, no business behavior, and no UI were changed.

---

## Remaining environment-dependent checks

These could not be executed or fully confirmed inside this session's sandboxed environment, and are named directly rather than assumed to be fine:

- **The actual GitHub Actions runner has not executed this updated `ci.yml`.** Local verification confirmed every individual command the workflow now runs (`npm ci`, `npm run typecheck`, `npm test`, `npm run build` for the frontend; `npm ci`, `npm test` for the backend) exits 0 in this sandbox - but GitHub's own runner environment, secrets availability (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` for the build step), and caching behavior were not directly observed.
- **`security.yml` and `deploy.yml` were not re-read or re-verified this pass** - their contents were investigated in earlier sessions' work (a Vercel domain/build-config gap and missing `render.yaml` env vars were found then) but not re-confirmed as still-accurate here, since this phase's explicit scope was build/test/typecheck/CI-command stability, not deployment configuration.
- **Whether the real, deployed production environment has `VITE_ENABLE_DEMO`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and the backend's own required env vars actually set correctly** is an environment-configuration fact this codebase cannot self-report - noted as unverified, not assumed correct.
- **The recurring pattern of previously-applied fixes (specifically the `nanoid` and, in earlier sessions, `semantic-release`/`dompurify` dependency fixes) not persisting across some part of this project's actual push/merge process** was observed again this pass but its root cause (a process or tooling issue outside this repository's own files) was not diagnosed - flagged as the most important open question for whoever owns this project's deployment pipeline, separate from anything fixable by editing files in this repository.

STOP per instructions - no product feature work follows.
