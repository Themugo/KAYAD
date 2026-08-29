# KAYAD — KNOWN_LIMITATIONS

Every gap below is real and confirmed, not speculative. Stated plainly so nothing is quietly assumed working.

## Deployment (the primary blocker)

The live, deployed environment (`kayad.space`/`api.kayad.space`) was found down in this project's own most recent direct check: frontend deployment missing, backend returning 502 on every endpoint, `www` TLS certificate expired. No newer evidence exists to contradict this - this sandbox cannot reach the live domains at all. **This is the single reason the project is not certified production-ready**, independent of how much application-level work is complete. See `PRODUCTION_CERTIFICATION.md`.

## UI stages not wired beyond their entry point

Auction bidding, inspection requests, and seller listing publish each have a real, verified, working connection at their entry point (place a bid, request an inspection, publish a listing). The richer surrounding UI for each - a buyer choosing their own inspector or a time slot, a bidder's full auction-session presentation data, several of the seller wizard's own form fields - is not backed by matching real data, because the real backend does not support those specific choices. Not a bug; a real product-scope gap, documented rather than papered over with invented data.

## Inspection execution/report/completion UI

The backend state machine (assign -> start -> submit -> complete, with report locking) is fully verified. The frontend UI for a provider to actually execute an inspection and submit a report, and for a buyer to view a completed report, was not additionally connected this program - only the request-creation entry point was.

## Auction closing and winner determination

A real, existing implementation (with a real race-condition fix from earlier in this program). Not independently re-executed during this program's own final certification passes.

## Marketplace search/filter

Not independently re-verified against a real database this program, though real, existing code exists.

## Logout

Route exists; not independently re-executed this program's own certification passes.

## Real-money payment paths

Never activated for testing, per explicit instruction throughout this entire program. The safe/mock-mode payment path is verified; the real M-Pesa/real-money path is not, and should not be, exercised outside a real, controlled environment with real oversight.

## Redis / background queues

No real Redis instance exists in this sandbox. The application correctly, honestly degrades (health check reports `redis: unhealthy` accurately) rather than failing silently - this is confirmed correct behavior, not a defect, but it means queue-dependent features (notification delivery, background image processing, etc.) were never exercised against a real queue in this program's own testing.

## Observability in production

Sentry integration exists in code and is real. Whether it is actually configured with a real DSN and receiving real events in the live (currently down) deployment is not verified.

## This program's own file-delivery mechanism

Confirmed, repeatedly, across nearly every phase: delivering fixes via a zip extracted with `robocopy /E` silently reverts prior deletions, because that command only adds/updates files, never deletes ones missing from the source. Every phase's own regressions were ultimately traced to this. Recommend a `robocopy /MIR` or equivalent mirroring approach, or a clean `git status`-driven diff, for any future delivery of this kind.

## Remaining technical debt, named directly

- `src/api/api.ts`/`api.exports.ts` (Bearer/localStorage auth) coexists with the newer, cookie-based `AuthContext` pattern - both real, both used, not unified (a genuine architectural decision, out of this program's "no rewrite" scope).
- `backend/inspection/` (a separate, real, mounted "inspection marketplace" subsystem) has no real frontend consumer - a deliberate, undeployed feature, not a bug.
- The frontend production bundle exceeds Vite's default 500kB chunk-size warning threshold; not addressed, since code-splitting is a structural change outside this program's cleanup-only scope.
