# Stage 5F.13 Dealer Lifecycle Acceptance Matrix

## Required real-runtime journey

1. Submit dealer application with required business identity and documents.
2. Confirm unverified dealer cannot create publishable inventory or activate auctions.
3. Admin requests correction; verify reason and audit record; seller updates and resubmits.
4. Admin approves dealer; verify pending listings remain pending and are not bulk-published.
5. Independently approve one listing; verify only that listing becomes eligible under current moderation rules.
6. Reject another listing; verify it stays unavailable and rejection reason is visible to the dealer.
7. Invite staff member; verify single-use/expiring invitation, correct organization binding and least-privilege default.
8. Accept invitation; verify membership belongs only to the intended dealer organization.
9. Revoke a permission and remove/suspend membership; verify API access, refresh-token sessions, socket rooms and cached UI permissions are denied/updated.
10. Create inventory listing; validate listing moderation and required documents.
11. Create dealer auction; validate auction policy, start/schedule transitions, bids, close and winner assignment.
12. Run settlement against isolated sandbox/payment adapter; verify idempotency, ledger, fees, refunds and reconciliation without external money movement.
13. Repeat with invalid identity, rejected listing, suspended dealer, revoked staff membership, stale approval, duplicate callback, concurrent bids and settlement retry. Each must fail safely without partial state corruption.

## Evidence required for each step

Capture request/response, database before/after state, audit events, authorization principal and test ID. Assert transaction rollback on failure. Do not infer pass from frontend display or static validators.

## Hard stop conditions

- Cannot prove isolated DB is local/disposable.
- Environment points at hosted database or live payment provider.
- Schema migration mismatch or unreviewed destructive migration.
- Staff/owner identity ambiguity.
- Any route bypasses dealer/listing eligibility or membership permissions.
- Duplicate settlement/ledger mutation on retry.
