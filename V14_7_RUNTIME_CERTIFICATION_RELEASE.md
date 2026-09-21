# KAYAD V14.7 — Runtime Certification Readiness

## Scope

V14.7 continues the holistic production-activation approach. It does not add parallel implementations or synthetic production data.

## Changes

- Removed the duplicate `/api/v1/auth/profile` check from the live API certification harness.
- Added `scripts/validate-v14-runtime-preflight.mjs` and `npm run validate:v14:runtime-preflight`.
- The preflight validates the Node production contract, canonical live API target, read-only-after-login behavior, canonical profile endpoint, absence of backend HTTP 501 placeholders, and presence of the holistic/live certification gates.
- The live API harness remains read-only after authentication; its only POST is the canonical login request.

## Verification

- V14 holistic source gate: 18/18 PASS.
- V14 live certification contract: 13/13 PASS.
- New scripts pass `node --check`.
- package.json parses successfully.
- Runtime preflight intentionally reports the execution environment's Node 22.16.0 as below the KAYAD production contract of Node >=22.22.2. The project contract was not weakened.

## Next runtime gate

Run on a machine/CI runner with Node >=22.22.2, install dependencies with `npm ci`, then run lint, tests, build, holistic validators, and the authenticated live API certification with a real non-production certification account. State-changing E2E remains gated until those prerequisites are verified.

## Packaging hygiene

The release archive must not contain `.git`, `node_modules`, `dist`, coverage, logs, or temporary artifacts.
