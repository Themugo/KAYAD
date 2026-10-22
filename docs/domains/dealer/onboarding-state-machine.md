# KAYAD Dealer Onboarding — State Machine (Phase 3)

Derived from the EXISTING contract: live schema of the connected Supabase project ("KAYAD EA", `ubvgixwhfybbyjuvxboj`), confirmed via direct `information_schema` queries (not assumed from migration files alone — migration files were cross-checked against the live table, which is how the critical gap in §4 was found).

## 1. Existing data model (live, confirmed)

**`dealers`** (10 columns): `id`, `user` (FK→users), `business_name`, `location`, `approved` (bool, default false), `verified_at`, `is_suspended` (bool, default false), `suspension_reason`, `created_at`, `updated_at`.

**`dealer_verifications`** (18 columns): `id`, `user` (FK→users), `dealer` (FK→dealers), `verification_status` (text, default `'pending'`), `documents` (jsonb), `submitted_at`, `rejection_reason`, `rejection_details` (jsonb), `reviewed_at`, `reviewed_by` (FK→users), `admin_notes`, `suspension_reason`, `suspension_expires_at`, `created_at`, `updated_at`, `otp_hash`, `otp_expires_at`, `otp_attempts`.

The original table CHECK constraint only allowed `verification_status IN ('pending','approved','rejected')`; `backend/middleware/dealerVerification.js` and the admin RPC (`kayad_apply_dealer_verification_atomic`) also reference `under_review` and `suspended` as live values. No migration narrowing/widening the CHECK constraint was found in the repository's migration set — **this needs confirming directly against the live constraint before Phase 12 relies on it** (not done in this pass; flagged as a carry-forward, see §5).

## 2. Canonical state machine (built from existing states, not invented)

Two parallel-but-linked state tracks exist in the real schema, matching the brief's instruction to reuse existing states rather than invent a new enum:

**Dealer record state** (`dealers.approved` / `is_suspended`):
- `false / false` — pending (default on creation, at first `/dealer/onboarding` GET)
- `true / false` — approved, active
- `true / true` — approved but suspended (`suspension_reason` set)
- (no "rejected" state on `dealers` itself — rejection lives on the verification record, see below)

**Verification state** (`dealer_verifications.verification_status`):
`pending` → `under_review` → `approved` | `rejected` | `suspended`, with `rejection_reason`/`rejection_details` populated on reject and `suspension_reason`/`suspension_expires_at` on suspend.

**Mapped onto the brief's requested vocabulary** (Registration started / Contact verification pending / Onboarding not started / in progress / Evidence incomplete / Ready for submission / Submitted for review / Under review / Changes requested / Rejected / Approved / Suspended-or-revoked):

| Brief's state | Real condition |
|---|---|
| Registration started | `users` row created with `role='dealer'`, no `dealers` row yet |
| Onboarding not started | `GET /dealer/onboarding` auto-creates a `dealers` row (`approved:false, isSuspended:false`) on first visit — this *is* "not started", there's no separate flag |
| Onboarding in progress | Dealer has a `dealers` row, no `dealer_verifications` row yet (form not submitted) |
| Evidence incomplete / Ready for submission | Client-side only (`DealerOnboarding.jsx`'s step validation) — **there is no persisted partial-draft state**; the real submission is one atomic `PUT` with the full payload, not a save-as-you-go draft. This is a genuine gap against the brief's "draft/resume" UX requirement (Phase 10), not a defect in what exists today. |
| Submitted for review | `PUT /dealer/onboarding` succeeds → `dealer_verifications` row created via `submitDealerVerification`, `verification_status='pending'`, `submitted_at` set |
| Under review | Admin (or automated check) advances `verification_status` to `'under_review'` |
| Changes requested | Not a distinct status value in the schema — `rejected` + `rejection_reason`/`rejection_details` is the closest existing mechanism; the brief's "changes requested" (implying resubmission without a hard rejection) does not have its own state today |
| Rejected | `verification_status='rejected'`, `rejection_reason` populated |
| Approved | `verification_status='approved'` (verification record) **and** `dealers.approved=true` (dealer record) — set together by the admin RPC `kayad_apply_dealer_verification_atomic`, confirmed atomic (single `UPDATE ... WHERE` per table in one function call) |
| Suspended/revoked | `verification_status='suspended'` + `dealers.is_suspended=true`, both settable by the same admin RPC |

## 3. Transition authority (confirmed)

- **Dealer-initiated**: create pending `dealers` row (implicit, on first onboarding visit) → submit onboarding+verification (`PUT /dealer/onboarding`, requires `protect, allowRoles("dealer")` — any authenticated dealer, including unapproved ones, which is correct: this is exactly the step that MUST be reachable before approval).
- **Admin-initiated**: `pending/under_review → approved/rejected/suspended`, exclusively via `kayad_apply_dealer_verification_atomic(p_user, p_action, p_admin, p_reason)`, a `SECURITY DEFINER` function with `REVOKE ALL ON FUNCTION ... FROM PUBLIC` — confirmed only invokable by a privileged backend path, not directly by any client role.
- **No path found for a dealer to self-approve or self-advance `verification_status`** — confirmed via the live grant check in the gap register's R11 (no `authenticated`/`anon` UPDATE grant on `dealer_verifications` at all).

## 4. CRITICAL FINDING — onboarding completion is currently broken (confirmed against the live database)

`PUT /api/dealer/onboarding` (`backend/routes/dealerRoutes.js:38-95`) calls `update("dealers", dealer.id, { businessName, location, bio, paymentDetails, onboardingComplete: true, onboardingCompletedAt: ... })`. The field-mapping layer (`mapPayloadOut`/`mapKeyOut`, confirmed to have no special-case entry for the `dealers` table in `backend/utils/fieldMap.js`) converts this to snake_case and sends it verbatim to Supabase as `{business_name, location, bio, payment_details, onboarding_complete, onboarding_completed_at}`. **The live `dealers` table has no `bio`, `payment_details`, `onboarding_complete`, or `onboarding_completed_at` columns.** This call will fail with a Postgres "column does not exist" error on every real invocation — confirmed against the actual live schema, not inferred from code alone, and not currently covered by any existing regression test (`fieldMapSchemaReconciliation.test.js`/`routeSchemaTriageFixes.test.js` do not mention these fields).

**Effect:** no dealer can currently complete onboarding through the canonical flow. This blocks `DEALER_REGISTRATION_GATE` step 12 (Phase 2) and the entire approval pipeline downstream of it (Phase 4, Phase 8). This is the most severe concrete finding of this phase.

**Proposed fix (additive, reversible, matches the brief's migration rules), not yet applied — awaiting the user's go-ahead since it touches the live database:**
```sql
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
```
Purely additive (no existing column altered/dropped), nullable/defaulted (no backfill required, no existing row broken), and directly closes the exact mismatch the code already expects. No destructive statement, no data loss risk, reversible by dropping the same four columns.

## 5. Carry-forward items

1. **Checked against the live database (resolved, not a defect):** the `verification_status` CHECK constraint is indeed still `IN ('pending','approved','rejected')` only — confirmed via `pg_get_constraintdef`. This does NOT break anything in practice, because `kayad_apply_dealer_verification_atomic`'s own `CASE` statement (`approve→'approved'`, `reject→'rejected'`, else→`'pending'`) never actually attempts to write `'under_review'` or `'suspended'` into this column — it was never going to hit the constraint. The middleware code (`dealerVerification.js`) and two dashboard count queries (`operationsDashboardController.js`, `adminRoutes.js`) reference `'under_review'`/`'suspended'` as if they are real stored values, but nothing ever writes them — so those branches are effectively **dead code / silently-undercounting queries**, not constraint-violating writes. Low severity; noted for Phase 7/12 cleanup, not a release blocker.
2. **New finding from the same trace:** the suspend action's fallthrough to `v_status='pending'` means suspending a previously-`approved` dealer resets `dealer_verifications.verification_status` to `'pending'` (while correctly setting `dealers.approved=false` and `dealers.is_suspended=true`). Combined with `requireDealerVerification`'s progressive-access carve-out ("allow listing creation if status is pending/under_review AND existing car count < 3"), **a suspended dealer with fewer than 3 existing listings could still pass the progressive-access check and create new listings**, because the middleware's dedicated `verificationStatus === "suspended"` branch is never reached (that value is never actually stored, per item 1). This is a real, if narrow, authorization-adjacent gap — added to the gap register as R12 rather than fixed here, since Phase 12 is where authorization-adjacent fixes get made under change control, not mid-Phase-3 discovery.
3. No persisted partial-draft/resume state exists for onboarding (§2) — a real Phase 10 UX gap, not something to retrofit here without being asked.
4. "Changes requested" (distinct from a hard rejection) has no dedicated state in the schema — product/schema decision for the user, not something to invent unilaterally.
