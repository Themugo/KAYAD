# KAYAD Stage 5F.8 — Backend enforcement implementation report

**Date:** 20 October 2026  
**Foundation:** Stage 5F.7 ZIP SHA-256 `2f491d45c6551c327fa15d62f9e7caa70e47c5c4c018d3ea8e80df3cf43acf9a`  
**Status:** PARTIAL — persistence contract added; runtime enforcement not certified.

## Implemented
- Added local migration `supabase/migrations/20261020160000_private_seller_auction_custody_contract.sql`.
- Added versioned proposal, evidence, verification, custody, appeal and admin decision persistence fields.
- Added audit event table and explicit garage/dealer vehicle-custody capability table.
- Enabled RLS on the new tables without broad client policies (fail-closed pending reviewed least-privilege policies and service integration).
- Migration remains local source only; it was NOT applied to a hosted database.

## Critical limitations
This stage does NOT yet connect the persistence contract to seller proposal routes, canonical payment callbacks, inspection booking/report records, provider governance, custody intake, admin approval/appeal, auction publication, scheduled start, admin start, public live projections, or bid placement. Therefore it does NOT yet enforce the new policy at runtime and must not be described as production-secure or deployable.

The repository has mixed Supabase/model-wrapper data paths and legacy vehicle ownership shapes. The next integration must resolve actual user-role and car-owner mapping and canonical inspection/payment/provider IDs before wiring services; guessing these can break existing dealer operations.

## Required next integration
1. Reconcile canonical car ownership and role mapping.
2. Map existing inspection payment settlement, booking/report and provider organization IDs.
3. Implement idempotent proposal, payment confirmation, custody receipt, admin decision and appeal services.
4. Add least-privilege RLS and cross-tenant authorization tests.
5. Wire one eligibility evaluator into publication, canonical start service (including scheduled/admin starts), public live projection, manual bid and atomic/auto-bid database paths. Enforce the bid invariant inside PostgreSQL RPC/transaction to prevent races.
6. Add negative integration tests for missing payment, failed/inconclusive/stale inspection, inactive custody capability, missing receipt, stale approval, pending appeal, incident hold and revoked eligibility.
7. Run Node >=22.22.2, semantic typecheck, unit/integration, real PostgreSQL/RLS and Playwright staging.

No hosted migration, production mutation, payment, deployment, commit or push was performed. No tests are claimed as passing unless executed and observed.
