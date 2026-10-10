# KAYAD Escrow Admin Control Plane Hardening — 2026-10-02

## Baseline
This sweep was performed from `KAYAD-ESCROW-END-TO-END-BUSINESS-HARDENED-FOUNDATION-20261002.zip` only. Existing escrow, ledger, payment, dispute and atomic-transition implementations were preserved.

## Business-rights model
| Capability | Escrow Officer | Accounts | Admin | Superadmin |
|---|---:|---:|---:|---:|
| View escrow cases | ✓ | ✓ | ✓ | ✓ |
| Operational escrow work | ✓ | — | ✓ | ✓ |
| Approve release | — | — | ✓ | ✓ |
| Approve refund | — | — | ✓ | ✓ |
| Settle payout/refund reference | — | ✓ | ✓ | ✓ |
| Reconcile custody/ledger/provider | — | ✓ | ✓ | ✓ |
| Configure custody/rules | — | — | ✓ | ✓ |
| View escrow audit | ✓ | ✓ | ✓ | ✓ |
| Emergency escrow control | — | — | ✓ | ✓ |

The legacy `manage_escrow` permission remains for backward compatibility, but default escrow-officer rights no longer imply money-moving release/refund authority.

## Backend hardening
- Escrow collection listing now requires escrow view permission instead of global `adminOnly`.
- Release, refund and refund-completion routes have dedicated permission gates.
- Admin escrow paths are classified separately from general finance paths.
- Existing admin defense-in-depth path regexes were corrected from literal `\\b` matching to real word-boundary matching.
- Escrow admin account numbers are masked in the admin control plane.
- Escrow admin list responses no longer replicate phone numbers, emails or payment-provider records.
- Existing service-role/RPC authorization remains authoritative for money movement.

## Portal hardening
- Escrow portal displays the current operator's effective escrow rights.
- Release/refund actions are hidden unless the corresponding permission exists.
- Custody configuration is read-only without `configure_escrow`.
- The UI explicitly states that client-side visibility is not the security boundary.
- Sensitive customer/payment fields are no longer expected in the admin list payload.

## Verification
- Escrow admin control-plane: **15/15 PASS**
- Escrow business integrity: **20/20 PASS**
- Payment/Escrow domain: **9/9 PASS**
- Financial audit/RLS: **7/7 PASS**
- Admin/control-plane E2E: **11/11 PASS**

## Remaining live certification
This remains subject to the previously documented live-runtime gates: Node >=22.22.2, dependencies, staging Supabase, RLS matrix, Redis, Playwright and provider certification.
