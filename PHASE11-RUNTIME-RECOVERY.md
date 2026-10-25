# KAYAD Phase 11 — Runtime Recovery

## Result: BLOCKED

The active runtime is Node.js `v22.16.0` with npm `10.9.2`. The project declares Node.js `>=22.22.2`, and `.npmrc` enables `engine-strict=true`.

Attempted dependency restoration in the extracted Phase 10 project:
`npm ci --ignore-scripts --prefer-offline`

Observed exit code: 1. npm returned `EBADENGINE`, reporting required Node `>=22.22.2` and actual Node `v22.16.0`.

Runtime discovery found only `/opt/nvm/versions/node/v22.16.0/bin/node` and a cached Node `v22.16.0` archive. A request to `https://nodejs.org/dist/index.json` failed because DNS could not resolve `nodejs.org` (`curl` exit 6). No compatible runtime was available locally.

No engine constraints, `.npmrc`, package manifests, lockfile entries or dependency versions were weakened. Runtime recovery and clean dependency installation remain blocked pending a compatible Node.js runtime and accessible package source.
