# KAYAD Worker Runtime Holistic Correction — 2026-09-29

## Problem

Production successfully initialized Redis and the BullMQ queue infrastructure, but the bootstrap reported a generic `Worker startup failed (non-fatal)` message.

The worker layer was using the same ioredis connection model as queue producers. BullMQ workers require an ioredis connection with `maxRetriesPerRequest=null`; queue producers may use a bounded retry policy. Sharing the bounded connection can cause worker construction/startup failure even while queues and Redis appear healthy.

## Holistic correction

1. Separate the queue Redis connection from the BullMQ worker Redis connection.
2. Configure the worker connection with `maxRetriesPerRequest=null`.
3. Preserve bounded retries for normal queue producers.
4. Make worker startup independent per worker so one failure cannot prevent the remaining workers from starting.
5. Record failed worker names and error messages in worker-manager state.
6. Return an explicit healthy/degraded startup result.
7. Make server bootstrap consume that result instead of emitting a generic swallowed worker failure.
8. Preserve the existing optional integration policy; no SMS, WhatsApp, M-Pesa, or email provider is made mandatory by this correction.
9. Close both queue and worker Redis connections during queue shutdown.

## Certification contract

The repository includes `scripts/validate-worker-runtime.mjs` and the package script `validate:worker-runtime` to prevent regression of the worker Redis and startup lifecycle contract.
