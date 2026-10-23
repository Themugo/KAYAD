# KAYAD Phase 10 — Runtime Recovery

## Result: BLOCKED

The project requires Node.js `>=22.22.2`; the available runtime is Node.js `v22.16.0` with npm `10.9.2`. The repository has strict engine enforcement (`engine-strict=true`).

Attempted the safe dependency check:

`npm ci --ignore-scripts --prefer-offline`

Observed result: exit code 1, `EBADENGINE`. npm reported required Node `>=22.22.2` and actual Node `v22.16.0`. No `node_modules` directory was created.

A request to `https://nodejs.org/dist/v22.22.2/` could not resolve the hostname (curl exit 6). Therefore the required runtime could not be acquired in this environment.

No engine constraints, `.npmrc` values, package manifests, lockfile entries or dependency versions were weakened. Runtime recovery, dependency installation, typecheck, lint, Vite build, Vitest and dependency-backed browser checks remain blocked until a compatible Node.js runtime and dependencies are available.
