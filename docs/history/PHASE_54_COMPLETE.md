# KAYAD Phase 54 — Authoritative Payment History Recovery

## Scope
Restore a real authenticated payment-history surface and reconcile the broken `/api/v1/payments/my` controller query with the canonical payments model and real database field contract.

## Changes
- Replaced the stale Supabase query in `getUserPayments` with the canonical `Payment` model.
- Added authenticated user scoping, validated status/type filters, pagination, total count, safe real payment fields, and vehicle population.
- Applied the same canonical model/field correction to the admin payment listing controller.
- Added server-side query parameters to `paymentsAPI.myPayments`.
- Added the live `PaymentHistoryView` and wired it into authenticated navigation.
- Pending records can be rechecked against the real payment-status endpoint.
- No schema changes, fake transactions, browser persistence, Supabase Auth migration, or Edge Functions were introduced.
