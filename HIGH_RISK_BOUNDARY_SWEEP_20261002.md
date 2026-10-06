# KAYAD High-Risk Boundary Sweep 2 — 2026-10-02

## Baseline
Exact uploaded baseline:
`KAYAD-HIGH-RISK-AUDIT-CONTINUATION-20261002(1).zip`

This sweep does not use the previously generated post-sweep ZIP as its source.

## Scope
1. Payments / ledger
2. Ownership / listing authorization
3. Uploads / documents
4. Admin privileges
5. RLS
6. Communications / webhooks
7. Concurrency / idempotency

## Implemented hardening

### Payments → ledger
- Purchase settlement now converges into the canonical ledger service.
- Escrow funding, release and refund paths now post through the canonical ledger service.
- Ledger posting remains idempotent through the existing `(external_reference, source)` uniqueness contract and atomic ledger RPC.
- Existing payment callback claim/settlement state machine is preserved.

### Ownership → listing authorization
- Passport mutation now requires staff authority, an existing canonical owner-vehicle relationship, or a matching listing owned by the caller.
- A database trigger verifies owner-vehicle VIN/registration consistency with the referenced passport.
- Existing full-passport authorization remains owner/staff constrained.
- Existing atomic dealer listing RPC remains canonical.

### Uploads / documents
- Private Supabase Storage resources are now uploaded as `authenticated`, not public `upload` assets.
- Private delivery URLs are signed.
- Existing API-level ownership checks and `private, no-store` response headers are preserved.
- Existing upload/delete authorization remains intact.

### Admin
- Existing global staff authentication is preserved.
- A centralized permission-routing layer now prevents departmental staff from reaching unrelated high-impact finance, marketplace, user/staff, inspection, support, logs, analytics, advertising and platform-control surfaces.
- Existing route-specific `adminOrSuper` and superadmin-only checks remain authoritative where already present.

### RLS
- Ownership/passport/document tables remain browser-denied and service-role controlled.
- Ledger and communication delivery mutation privileges remain browser-denied.
- Webhook receipts remain backend-owned.
- No browser-facing alternate data-access path was introduced.

### Communications / webhooks
- Communication idempotency keys are now actually persisted when a delivery is created.
- Unique-constraint races recover the canonical delivery instead of creating duplicate sends.
- Provider status callbacks are serialized per provider message ID.
- Inventory webhooks now have durable replay identity plus distributed locking and processed-state tracking.
- Existing provider signature/secret verification is preserved.

### Concurrency / idempotency
- Existing payment callback claim and distributed locking remain intact.
- Existing checkout/pending-payment unique constraints remain intact.
- Communication delivery races now converge through database uniqueness.
- Inventory webhook races converge through durable webhook identity plus distributed locking.
- Passport consistency is enforced at database level, not only in JavaScript.

## Validation

### PASS
- New high-risk boundary validator: 10/10
- Private upload cache/security gate: PASS
- Passport authorization: 7/7
- Financial audit RLS: 7/7
- Payment gateway lifecycle: 13/13
- Payment/Escrow domain: 9/9
- Transactions & Money: 23 PASS
- Database contract alignment: 8/8
- Domain lifecycle integrity: PASS
- Refresh-token reuse integrity: 6/6
- Wave 2 invariants: PASS
- Wave 3 convergence: PASS — OpenAPI 1107/1107
- Canonical architecture: PASS
- Changed backend JavaScript syntax: 9/9

### BLOCKED — environment, not source
`npm ci --offline` correctly stopped on the project's engine contract:

- Required Node: `>=22.22.2`
- Available Node: `22.16.0`

No `node_modules` tree was installed.

Therefore this artifact does **not** claim:
- TypeScript compilation
- production build
- live backend startup
- live Supabase migration execution
- real RLS certification
- Playwright/browser certification
- live M-Pesa certification
- live Brevo/SMS/WhatsApp certification
- production deployment certification

## Changed-file inventory

- `backend/config/Supabase Storage.js`
- `backend/services/communicationGateway.service.js`
- `backend/services/escrow.service.js`
- `backend/services/ledgerService.js`
- `backend/services/paymentCallback.service.js`
- `backend/vehiclePassport/services/vehiclePassportService.js`
- `backend/controllers/ownershipController.js`
- `backend/routes/adminRoutes.js`
- `backend/routes/webhookRoutes.js`
- `supabase/migrations/20261002120000_high_risk_boundary_hardening.sql`
- `scripts/validate-high-risk-boundaries.mjs`
- `package.json`

## Preservation rule
No existing escrow implementation was replaced with a second escrow implementation. Existing atomic RPCs, canonical services, RLS model, communication control plane, payment state machine, listing entitlement RPC and prior authentication/security fixes remain the foundation.

## Release position
**SOURCE / STATIC HARDENING: PASS**

**RUNTIME CERTIFICATION: BLOCKED BY NODE ENGINE VERSION**

The next executable certification should begin after moving the project to Node `>=22.22.2`, then:
1. install dependencies
2. typecheck
3. build
4. backend tests
5. security/payment/ledger tests
6. migration against staging
7. RLS matrix
8. Playwright
9. M-Pesa sandbox
10. communication provider certification
11. complete buyer/dealer transaction
12. production release gate.
