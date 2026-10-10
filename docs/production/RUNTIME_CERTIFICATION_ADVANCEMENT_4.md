# KAYAD Runtime Certification Advancement 4

Date: 2026-09-23

## Scope
Deterministic local-runtime certification hardening only. No product features or business behavior were added.

## Correction
The local runtime validator now explicitly sets `HOST=127.0.0.1` in the isolated backend process. This prevents a developer-machine `.env` or inherited `HOST` setting from changing the listener address while the validator probes `127.0.0.1:5099`.

## Evidence
The Windows certification run reached lint, production build, and the full test suite successfully (46 test files; 308 passed; 1 skipped), then failed only at the local runtime probe with `timeout /health/live`. The validator already probes `127.0.0.1:5099`, while the backend listener previously allowed `process.env.HOST` to select another address. The correction makes the validator's listener and probe address deterministic.

## Certification status
This change is a targeted runtime-contract correction. Re-run the full Windows certification command before committing. Do not claim the runtime gate is green until `/health/live`, `/health`, `/health/ready`, and `/api/cars` all pass under the validator.
