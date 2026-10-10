# KAYAD Runtime Certification Advancement 3

Date: 2026-09-23

## Scope

Runtime-only hardening. No product features, marketplace behavior, pricing, payments, or UI functionality were added.

## Correction

The local runtime certification reached the backend process and completed root lint, build, and all 308 tests, but the HTTP probe timed out on `127.0.0.1:5099/health/live`.

The backend server previously relied on Node's default listen host. The server is now bound explicitly to `HOST` when supplied, otherwise `0.0.0.0`. This makes local IPv4 probing deterministic while remaining compatible with container and hosted deployments. The runtime validator continues to probe `127.0.0.1`.

## Certification status

This correction is prepared for Windows validation on Node 22.22.2. The complete certification gate must be rerun locally before commit/push. The previous run had already passed lint, production build, and 46 test files / 308 tests with 1 skipped; the runtime gate failed only at `/health/live`.
