# KAYAD Stage 5F.12 — Dealer workflow integration

**Foundation archive:** `KAYAD-STAGE5F11-DEALER-BUSINESS-AUDIT-ONBOARDING-APPROVAL-POLISH-FULL-PROJECT-20261020.zip`  
**Foundation SHA-256:** `db717a86d39281d52563e850df69c790503546fe46d20911d89c968e768abaab`  
**Status:** PARTIAL — source-level hardening completed; full runtime certification not performed.

## Scope executed

Prioritized the first critical chain: dealer application → admin review → approval → listing eligibility, and audited the connection points for team membership and protected dealer operations.

### Defects addressed

1. **Legacy approval could override a newer suspension.** `requireDealerVerification` previously returned early when `dealer.approved === true`, before consulting the current verification record. It now loads the current verification first and fails closed for current `suspended` and `rejected` states, even if a legacy approval flag remains true.
2. **Suspension expiry could automatically reinstate a dealer.** Removed automatic state mutation from suspended to approved. Reinstatement must use an explicit admin transition; an elapsed expiry alone does not authorize access.
3. **Dealer approval could publish all pending listings as a side effect.** Approval now marks the dealer trust attribute but does not bulk-publish pending vehicles. Listing approval remains a separate moderation/readiness decision. This avoids conflating business verification with each vehicle's listing eligibility.
4. Removed the now-unused onboarding-policy import from the verification controller.

### Existing controls confirmed by source inspection

- Verification transitions use compare-and-swap on the prior status to prevent competing decisions from overwriting each other.
- Listing creation and auction setup routes include dealer verification middleware.
- Dealer team organization resolution requires an active membership and checks explicit permissions.

## Tests and checks actually run

- `node scripts/validate-stage5f12-dealer-workflow.mjs` — **13/13 PASS** (source-contract checks).
- `node --check backend/middleware/dealerVerification.js` — PASS.
- `node --check backend/controllers/verificationController.js` — PASS.
- Runtime environment Node: `v22.16.0`; repository engine requirement has historically been `>=22.22.2`.

## Not run / remaining gaps

- Full frontend typecheck/build, Vitest, Jest, API integration, PostgreSQL/RLS and Playwright suites were not run; dependencies are not installed in the isolated archive workspace and current Node is below the declared engine minimum.
- Dealer application submit → admin approval → individual listing moderation has not been proven on a real isolated database. The change deliberately separates these decisions, but every listing mutation route still needs full readiness-path certification.
- Staff invitation acceptance, expired/revoked invitation behavior, cross-dealer isolation, permission revocation and suspended-staff sessions need runtime/API coverage.
- Inventory → auction → sale → settlement must be exercised end to end with real isolated database/RPCs before certification.
- No hosted migrations, production changes, deployment, commit, push or live provider/payment calls were performed.
