# P0-A — Reachable schema reconciliation — 2026-09-19

## Result

Static traversal from the mounted backend route/controller/service surface reaches model wrappers whose `TABLE_MAP` targets are absent from the current migration-derived schema. The audit produced **82 mappings requiring reconciliation** against the live database; the prior 81-count baseline was based on an earlier schema snapshot.

These are not to be fixed by blindly creating 82 tables. Each must be either:

1. **GENUINE_PRODUCTION_DEPENDENCY** — reconcile the model/controller contract with a real canonical table and migration.
2. **EXTERNAL_OR_DERIVED** — isolate the integration and remove database-model assumptions.
3. **OBSOLETE_ROUTE_SURFACE** — remove/unmount the route and its implementation.

## Current trace

The missing mappings are reachable through mounted controllers including AI platform, automation, configuration, low-code, VXP, XOS, digital-twin, platform-factory, auction integrity, dealer health, duplicate detection, escrow anomaly/audit, reports, SMS bidding, NTSA verification, and related administrative surfaces.

Because these route families are mounted and the frontend contains consumers for several of them, they cannot safely be deleted as a bulk operation. The correct next action is domain-by-domain contract reconciliation, starting with the financial/security-sensitive domains and then the platform-extension domains.

## Important distinction

The live Supabase project contains many tables beyond the migration-derived CREATE TABLE set. Therefore **migration schema truth and live production truth are currently not identical**. This is itself a P0 drift finding. No new table should be created until the canonical live-vs-migration diff is reconciled.

## Test gate

The reconciliation stage is not considered feature-complete until the remaining missing mappings reach zero or are explicitly classified and removed/isolated. The release gate should fail if a mounted route newly introduces a model table absent from the canonical schema manifest.
