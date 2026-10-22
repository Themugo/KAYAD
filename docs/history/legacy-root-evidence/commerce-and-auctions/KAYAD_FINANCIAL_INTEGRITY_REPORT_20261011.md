# KAYAD Financial Integrity Report

## Convention decision for repository code

The supplied audit documents `FIN-LEDGER-1`: repository posting and reversal use a signed balance convention, but `kayad_rebuild_ledger_balances()` used account-type-dependent normal balances. The application trial-balance report interprets positive values as debit and negative values as credit. The prior execution prompt explicitly recommends signed balances (debit positive, credit negative) because this matches repository posting, reversal and application reporting.

This phase adopted that **repository convention** and added a forward migration. It does not authorize production mutation and does not assert that the hosted ledger has been reconciled.

## Changes

- `supabase/migrations/20261011220000_ledger_signed_balance_rebuild.sql` redefines balance rebuilding as the sum of each journal line's `debit - credit`, regardless of account type.
- Function execution remains restricted to `service_role`.
- The migration does not invoke the rebuild automatically.
- `supabase/preflight/ledger_signed_balance_dry_run.sql` is read-only and reports stored balance, signed journal balance, legacy normal balance and deltas per account.
- `scripts/validate-financial-ledger-sign-convergence.mjs` checks source-level consistency across posting, reversal, rebuild, grants and dry-run behavior.

## Verification

- Financial ledger sign-convergence source gate: **8/8 PASS**.
- Existing ledger reconciliation validator: source/static PASS.
- No PostgreSQL runtime available; migration syntax was not executed against PostgreSQL.
- No ledger rows were read or changed in this session.
- No balance rebuild or production financial operation was run.

## Mandatory staging cutover

1. Verify migration parity and apply the reviewed migration on a staging clone.
2. Run the dry-run SQL and compare every account's stored balance to signed journal-derived balance. Investigate all reversals and any unexplained deltas.
3. Confirm all ledger posting, reversal, trial-balance and reconciliation paths use the signed convention.
4. Pause financial writes during the approved rebuild window.
5. Execute `SELECT public.kayad_rebuild_ledger_balances();` once in the authorized staging environment.
6. Re-run the reconciliation harness, including `FIN-LEDGER-1` test `m15` #7. Confirm the trial balance remains balanced and reversal idempotency still holds.
7. Obtain explicit financial owner approval before repeating the procedure in production.

Do not deploy the updated financial code and then leave mixed convention balances operating indefinitely. Do not rebuild production balances until the read-only diff and cutover plan are approved.

## Remaining financial blockers

- Hosted posting function and balance convention require fresh verification after migration parity is reconciled.
- Provider transaction uniqueness (`mpesa_transactions`) requires a duplicate preflight before adding a unique index.
- Escrow auto-release/warning behavior remains dormant pending policy approval; do not activate it as part of this patch.
- No M-Pesa sandbox transaction, payout, escrow release or refund was executed.
