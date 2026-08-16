# PHASE14_PERFORMANCE_OBSERVABILITY.md
KAYAD - Phase 14: Performance and Observability Hardening

---

## 0. A Tension Worth Naming Directly: This Phase's Own Gate Was Not Met

This phase's own first line is explicit: "Optimize the existing KAYAD application only after functional certification." Phase 13 of this series - the most recent prior phase - explicitly did not achieve that. Its own certification matrix recorded 0 of 28 named journeys as a fully live-verified PASS, and closed with two unresolved, significant architectural findings (a full-server shutdown on any unhandled rejection; a live request-hang reproducing this program's very first, previously-unexplained finding).

Proceeding with this phase as a blanket performance-optimization pass would contradict its own stated precondition. This phase does not do that. Instead: this phase investigated whether Phase 13's second finding (the request hang) had a concrete, fixable root cause reachable through this phase's own named scope ("health checks," directly named in this phase's brief) - and it did. That fix is this phase's real, load-bearing contribution, directly continuing Phase 13's unfinished investigation rather than pretending its gate was satisfied. The remainder of this phase's broad optimization scope (bundle size, N+1 queries, Redis usage, and so on) was not attempted, consistent with honoring this phase's own precondition rather than working around it.

---

## 1. Headline Fix: The Root Cause of the Phase 0/13 Request-Hang Mystery, Found and Fixed

Checking this phase's named "health checks" audit item against /health's actual middleware chain, found fastTimeout (and its siblings mediumTimeout/slowTimeout/externalTimeout/uploadTimeout, all built from the same createTimeoutMiddleware factory, used throughout this backend's routes) called req.setTimeout(timeoutMs) and res.setTimeout(timeoutMs) with no callback and no separate event listener attached.

In Node's http module, .setTimeout(ms) alone only configures a socket to emit a 'timeout' event after that many idle milliseconds - it does not abort the request, close the connection, or send any response by itself. With nothing listening for that event and acting on it, the timeout fires into a void: the connection stays open indefinitely, and a request stuck behind a genuinely hung underlying operation (a database call that never resolves, an external API call that never returns) gets no response, no error - forever.

This is not a theoretical finding. Phase 13 of this series built a real, live backend server and empirically observed exactly this symptom on GET /health - a route already using this exact middleware - the request was accepted but never answered, reproducing this program's Phase 0 finding (its very first investigation, months of phases ago) that the server "hangs and never responds to requests despite appearing to start successfully." That finding was never explained until now.

Fixed by attaching a real 'timeout' event handler (via Node's own supported setTimeout(ms, callback) signature, which auto-registers the callback as the event listener) that sends a proper 503 response if headers haven't already been sent, then destroys the socket - the behavior this middleware's own name and intent already promised, now actually implemented.

Verified empirically, not just read: built a minimal, isolated Express test route that deliberately never responds (simulating exactly the hung-dependency scenario this middleware exists to guard against), applied the fixed middleware with a 1-second timeout, and confirmed the request now receives a real 503 response at almost exactly the 1-second mark, instead of hanging indefinitely as it did before this fix. The temporary test file was created inside the backend directory (required for module resolution against real dependencies) and deleted immediately after - confirmed via git status that no test artifact remains in the tracked project.

---

## 2. A Second Fix: Log Redaction Existed But Was Structurally Disconnected

Per this phase's explicit "ensure logs do not expose passwords/tokens/payment credentials/secrets/PII" requirement: found infrastructure/logging/serializers.js already has real redaction logic (objectSerializer, a sensitiveKeys list covering password/token/secret/apiKey/apiSecret) - but it only runs for data explicitly passed under Pino's obj serializer key. Checked the actual logging functions used throughout this entire backend (logInfo/logWarn/logError in infrastructure/logging/index.js) directly: every one of them spreads its meta argument straight into the top-level log call (logger.info(meta, message)), never wrapped under obj. The redaction logic existed, looked correct in isolation, and never actually fired for a single real call site in this codebase.

Checked whether this was a live leak, not just a structural gap: searched every logError/logWarn/logInfo call site in the backend for sensitive-looking fields. None currently logs a raw password, token, or secret this way - existing calls pass user IDs, already-masked phone numbers, or narrow, safe error serializations. This is a latent structural risk, not a confirmed live leak - but exactly the footgun this phase's own instruction exists to close before a future call site (the next logError("...", err, { user }) someone adds without knowing the old redaction didn't apply) trips it.

Fixed using Pino's own native, built-in redact option in pino.config.js's baseConfig (applied globally to every log call regardless of how the caller structures their data, rather than requiring every caller to opt in correctly - the same class of mistake that created this gap) - paths covering the top level and one level deep for every field already named in the old objectSerializer list, plus otp/authorization/cookie/creditCard/cvv/pin/mpesaReceiptNumber, matching this phase's own named categories.

Verified empirically: ran a direct test importing the real logger and calling logError/logInfo with deliberately-included password, otp, token, and a nested user.password field. Confirmed every one now renders as "[REDACTED]" in the actual log output, including the previously-unreachable nested case.

---

## 3. What This Phase Did Not Attempt, and Why

Per section 0's own reasoning, this phase deliberately did not perform the broad performance-optimization sweep its brief otherwise describes (bundle size, N+1 query audits, Redis usage review, Socket.IO reconnect behavior, external-service latency, and so on). Two reasons, stated plainly: first, this phase's own precondition was not met, and working through a long optimization checklist while that remains true would produce plausible-looking work built on an uncertified foundation. Second, and more practically: the two fixes in sections 1-2 required the remainder of this phase's available time to investigate, verify empirically, and confirm safe - matching this program's established practice of completing fewer things with real verification over attempting many things shallowly.

This is not a claim that the rest of this phase's scope is unimportant - it is a claim that it should be attempted once Phase 13's certification gap is closed, so that "before/after" performance measurements (this phase's own "measure before optimizing" instruction) are taken against a system already confirmed to work correctly, not one still carrying open, unresolved correctness questions.

---

## Verification Run This Phase

| Check | Result |
|---|---|
| Backend syntax validation (node --check, all files) | 0 errors |
| Backend unit test suite (npm test, Jest) | 216/216 passing - confirms both fixes introduced no regression |
| Timeout fix - empirical test against a deliberately-hung endpoint | Confirmed: real 503 response at ~1.0s instead of an indefinite hang |
| Redaction fix - empirical test against real sensitive-field log calls | Confirmed: password/otp/token/nested user.password all render as [REDACTED] |
| Frontend | Not modified this phase |
| Temporary test artifacts | Confirmed removed from the tracked project; git status shows only the two real fixes |

---

## What This Phase Deliberately Did Not Do

- Did not perform the broad frontend/backend/database/realtime/external-service performance audit this phase's brief otherwise names - deferred until Phase 13's certification gap is closed, per section 0's reasoning.
- Did not re-attempt live end-to-end testing against the real stack Phase 13 built - that stack's temporary infrastructure was already torn down at the end of that phase; re-verifying the timeout fix against the full live server (rather than the isolated, minimal reproduction used here) is a natural next step for whoever picks up Phase 13's remaining certification work.
- Did not audit or fix any other timeout-adjacent code paths beyond middleware/timeout.js itself - e.g., whether individual route handlers have their own, separate hang risks not mediated by this middleware at all, was not investigated this phase.
- Did not remove or replace the now-redundant objectSerializer/sensitiveKeys list in serializers.js - left in place since it's still technically wired to the obj key (harmless, if now redundant with the new global redact config) and removing it is an unrelated cleanup decision, not part of this fix.
