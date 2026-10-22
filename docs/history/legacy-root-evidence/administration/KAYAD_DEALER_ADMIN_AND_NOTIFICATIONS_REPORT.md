# KAYAD Dealer Admin Integration & Notifications (Phases 8–9)

## Phase 8 — Admin review & control-plane integration

**No second admin portal built or needed.** Dealer verification review already lives entirely inside the existing admin control plane via `/api/verification/admin/*` (`verificationRoutes.js`, `allowRoles("admin","superadmin")`) and `adminRoutes.js`'s RPC call — both already audited in Phases 4-5. Approve/reject/request-changes-via-reject-with-reason/suspend/reinstate are all real, persisted, actor-and-timestamp-logged transitions (`reviewedAt`/`reviewedBy` server-set, never client-supplied — confirmed in Phase 4).

**Configuration-store overlap carried over from Stage 36, reconfirmed still open, not touched:** `PlatformConfig`, `ConfigEntry`, and `FeatureFlag` remain three separate models (`backend/models/ConfigEntry.js`, `FeatureFlag.js`, plus `PlatformConfig` referenced throughout `carController.js` and elsewhere). Per the brief's own instruction, this is explicitly NOT to be merged without a proven migration/compatibility plan — reconfirmed present, left alone.

**Admin-visible delivery-failure state — gap found:** the communication gateway (`communicationGateway.service.js`) correctly tracks `dead_letter` as a terminal state with retry/backoff, but no route in `adminRoutes.js` (or elsewhere) was found exposing failed/dead-lettered communication events to an admin. An admin currently cannot see "this dealer's approval notification failed to deliver" anywhere in the control plane. Added to the gap register as a build item (R16), not a security defect.

**Stage 36 footer-bypass finding — explicitly scoped out per this brief's own instruction:** the brief's Phase 8 text says to address it "only if it is required for the same admin-control-plane convergence or can be resolved without widening this phase." Nothing in the dealer admin-integration work done across Phases 0-8 touches `App.tsx`'s rendered footer, `BrandingContext`, or either dead `Footer.tsx` component — there is no dependency in either direction. Per the brief's own instruction, this is correctly left untouched and out of scope for this mission; it remains an open, disclosed, unfixed finding from Stage 36, to be scheduled as its own piece of work if the user wants it addressed.

## Phase 9 — Notifications & communication events

Confirmed, by direct code read of `communicationGateway.service.js`:
- **Idempotency**: `idempotencyKey` is threaded through every dealer-lifecycle event already traced (registration verification email, welcome email, verification-decision notifications) and deduplicated via a Postgres unique-constraint conflict path (`error.code === "23505"` → re-fetch the existing delivery rather than send twice) — a genuinely race-safe implementation, not just an advisory check.
- **Retry / dead-letter**: exponential backoff (`2^retryCount` minutes, capped at 1 hour), max 3 retries before `dead_letter`, both states modeled explicitly in a `TERMINAL` state set with a defined transition table (`VALID_TRANSITIONS`-style `failed`/`dead_letter` sets) — this is a real, deliberately-built state machine, not an afterthought.
- **Recipient/tenant correctness**: every dealer-lifecycle `deliver()`/`sendNotification()` call traced in Phases 2-4 passes `userId`/`recipient` derived from the authenticated actor or the verification record's own `user` field — never a client-supplied recipient.
- **Sensitive-info protection**: verification/approval/rejection notification bodies (`authController.js`, `verificationController.js`'s `transition()` message builders) include only business-relevant text (status, reason) — no payment details, ID numbers, or KRA PIN appear in any notification payload read in this audit.
- **Gap**: no admin-visible failure view (see Phase 8 above) — this is the one concrete Phase 9 gap found, not a correctness defect in the pipeline itself.

No Brevo/provider credential check was performed in this phase (no live send was attempted — this phase is a code-level trace, consistent with the brief's own instruction to report external certification as the relevant Phase 11F gate rather than fake delivery evidence here).
