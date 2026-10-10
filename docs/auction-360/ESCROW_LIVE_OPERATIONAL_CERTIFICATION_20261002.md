# KAYAD Escrow Live Operational Certification — 2026-10-02

## Baseline

This certification layer is built directly on:
`KAYAD-ESCROW-OPERATIONS-RECONCILIATION-HARDENED-FOUNDATION-20261002.zip`

No second escrow engine, dispute engine, payout engine, or reconciliation workflow was introduced.

## Static operational contract

**13/13 PASS**

Covered scenarios:

1. Concurrent release/refund locking and idempotency
2. Dispute release/refund/commission ledger consequences
3. Refund approval versus external refund settlement separation
4. Refund completion remains explicit and idempotent
5. M-Pesa B2C provider amount verification
6. Provider conversation/transaction replay uniqueness
7. Payout state-machine terminal/idempotent behavior
8. Append-only escrow audit storage
9. Client-role denial for escrow audit storage
10. Dedicated escrow audit-view permission
11. Distinct release/refund/settlement permissions
12. Fail-closed money-moving escrow admin roles
13. Explicit emergency-control permission

## Important fixes in this sweep

- Dispute resolution now posts the canonical ledger consequences inside the same database transaction as the dispute decision.
- Buyer refund portions create `Refund Payable` and remain pending until the explicit refund-settlement operation completes them.
- Seller portions create `B2C Disbursement Payable`; commission is separately recognized.
- M-Pesa B2C callback now verifies the provider amount against the canonical payout `net_amount` before marking the payout paid.
- Payout provider conversation IDs and transaction IDs have database-level replay uniqueness.
- `escrow_audits` is protected as an append-only store with RLS/client revocation and an update/delete-blocking trigger.
- Escrow audit viewing now requires the dedicated `view_escrow_audit` permission.
- Legacy payment-less escrow refunds no longer consume a cash account directly; they first create Refund Payable.

## Live staging execution

Live staging execution is **BLOCKED in the current environment** because no staging Supabase credentials are available:

- `SUPABASE_URL`: not present
- `SUPABASE_SERVICE_ROLE_KEY`: not present

Therefore the following have **not** been falsely marked passed:

- real concurrent release/refund execution
- real dispute resolution against PostgreSQL
- real payout callback execution
- real RLS denial tests
- real audit update/delete trigger tests
- real anomaly/reconciliation execution
- real role-by-role HTTP authorization tests

## Required staging run

On Node >= 22.22.2 with staging access:

```powershell
npm ci
npm run typecheck
npm run build
npm run validate:escrow-live-operations-scenarios
npm run validate:supabase-migrations
```

Then reset/apply migrations against a disposable staging database and run the role matrix with dedicated test identities:

- buyer
- seller/dealer
- escrow officer
- accounts
- admin
- superadmin
- unauthorized authenticated user
- anonymous client

### Scenario matrix

| Scenario | Required invariant |
|---|---|
| Two concurrent releases | exactly one release + one seller payable + one commission |
| Concurrent refund/release | one terminal financial outcome; no duplicate ledger event |
| Duplicate dispute resolution | second request is idempotent |
| Full dispute refund | Escrow Payable → Refund Payable; no false cash settlement |
| Partial dispute settlement | seller payable + refund payable + commission balance exactly to escrow |
| Duplicate B2C callback | one paid payout + one payout ledger event |
| Wrong B2C amount | payout is not paid; anomaly/failure is recorded |
| Duplicate provider transaction ID | rejected by database uniqueness |
| Reconciliation mismatch | exception is visible and does not mutate financial truth silently |
| Anomaly escalation | case remains linked to escrow and audit evidence |
| Emergency close | permission + reason + audit; invalid state rejected |
| Audit UPDATE/DELETE | database rejects mutation |
| Escrow officer | can operate only within assigned permissions; no settlement/configuration bypass |
| Accounts | settlement/reconciliation only according to permissions |
| Admin | approved escrow operations; no hidden privilege escalation |
| Superadmin | full authorized control, still through canonical state machine |
| Authenticated customer | cannot access admin escrow operations |
| Anonymous | cannot access protected escrow operations |

## Release rule

Do not call escrow operational certification complete until the real staging database passes the matrix above. Static PASS is necessary but not sufficient for production financial certification.
