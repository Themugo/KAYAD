# KAYAD full-system audit and remediation report

**Audit date:** 9 November 2026  
**Baseline:** `KAYAD-PRIVATE-SELLER-END-TO-END-1109.zip`  
**Working rule:** preserve the existing KAYAD architecture, route contracts, data stores, permissions and functioning features; no rebuild, duplicate subsystem, Git operation, deployment or production-data mutation.

## Executive result

The source archive has been audited across the public marketplace, personal buyer/seller account, private-seller workspace, dealer operations, auctions, escrow, inspections, administration, backend route contracts, database migrations, package scripts and historical validation inventory.

This is a **corrected source candidate, not a production-certified release**. A maintained source-level handover gate now passes 14/14 checks. The complete build, automated test suite, browser/device journeys, database replay and live provider UAT could not be certified in this execution environment.

## Inventory

| Item | Result |
|---|---:|
| Archive entries | 3,283 |
| Supabase migrations | 194 |
| Package scripts | 168 |
| Validation/verification scripts | 405 |
| Validation/verification scripts not referenced by package scripts | 258 |
| Validator files containing TOPLINE/FLOORING/ROOFING references | 29 |
| Test/spec files across `src`, `backend`, `tests`, `e2e` | 435 |
| Package scripts with missing direct `scripts/` targets | 0 |
| API routes discovered by governance scan | 1,130 |

## Confirmed corrections in this pass

1. **Homepage hero containment:** constrained both desktop vehicle information cards to the available stage width. `validate-home-hero-premium.mjs` now passes 12/12.
2. **API documentation completeness:** added OpenAPI operations for the eight previously undocumented mapped routes: vehicle cover-image selection, dealer-team invitation resend, dealer custom-role list/create/update/delete, dealer paperwork requirements and dealer application start. Route documentation is now 1,130/1,130 (100%).
3. **Maintained release gate:** added `scripts/validate-system-handover-core.mjs` and `npm run validate:system-handover-core`. It runs the 14 current, source-level release checks listed below without relying on the obsolete/historical validator inventory.
4. **Project evidence:** generated the full validator result inventory and a remediation register so failures are visible rather than silently discarded.

No database schema, migration, production setting, payment configuration, live customer record or deployment was changed.

## Maintained source-level gate

`npm run validate:system-handover-core` — **14/14 PASS**

- Private-seller listing workflow
- Private-seller workspace shell
- Supabase migration preflight
- Canonical architecture convergence
- Dependency security floors
- Frontend runtime contracts
- Backend runtime contracts
- UI surface convergence
- Mobile menu viewport behavior
- Marketplace core data/API contracts
- Auction transport convergence
- Dealer subscription domain
- Homepage hero containment
- API and route documentation convergence

The migration preflight confirms 194 unique migration versions and static filename/DDL checks. It does **not** prove that all migrations replay successfully against a fresh PostgreSQL database.

## Full validator inventory

A bounded static run of the 405 `validate*.mjs` and `verify*.mjs` scripts produced:

| Result | Count |
|---|---:|
| Passed | 255 |
| Failed | 149 |
| Timed out | 1 |

The 150 non-passing results are classified in `FULL_SYSTEM_REMEDIATION_REGISTER.csv`; full output tails are in `FULL_SYSTEM_VALIDATOR_RESULTS.tsv`.

| Failure class | Count | Meaning / disposition |
|---|---:|---|
| Validator references absent or relocated files | 85 | Historical validators still expect older source paths, migration names or phase documents. Reconcile or retire these checks; do not treat each as a runtime defect. |
| Other validator/runtime failure | 29 | Requires individual review; some invoke services or expect environment-specific state. |
| Source-contract assertion failure | 24 | Compare each assertion to the current implementation. Several are stale checks that expect superseded patterns; any genuine gap must be separately repaired and regression-tested. |
| External credentials/deployment configuration required | 7 | Requires authorised Supabase, email/SMS/payment provider or deployment credentials. |
| Dependencies incomplete/runtime toolchain | 4 | Repeat after a complete dependency install under the required Node runtime. |
| Local database/service timeout | 1 | Repeat against a disposable local PostgreSQL/Supabase environment. |

**Important validator hygiene finding:** 258 validators are not referenced by the package script registry, and 29 validator files contain cross-project TOPLINE/FLOORING/ROOFING references. These files have not been deleted or moved because some historical scripts call one another and should remain traceable until their dependency graph is reconciled. They must not be represented as current KAYAD release gates.

## Domain status and remaining certification

| Domain | Source evidence | Remaining release proof |
|---|---|---|
| Public marketplace / search | Canonical marketplace API and mapping checks pass; hero containment fixed | Browser search/filter/sort/pagination, real inventory and image-load testing |
| Unified personal account | Buyer/private-seller convergence is retained in source | Registration, email verification, login, account switching, seller capability approval and cross-account isolation UAT |
| Private seller | 12-stage workflow source check passes; workspace shell and Settings/Logout checks pass | Authenticated real listing submission, photo storage, draft recovery, moderation, dashboard actions and phone/desktop browser tests |
| Dealer workspace | Dealer subscription domain check passes; dealer-specific middleware remains in place | Dealer onboarding, approval, inventory ownership, CRM, finance and team permission UAT |
| Auctions | Canonical transport checks pass | Live auction lifecycle, concurrent bids, payment settlement and recovery tests |
| Escrow / payments | Backend runtime contract checks pass | Real M-Pesa/provider callbacks, reconciliation, refund, payout and ledger UAT |
| Inspections | Canonical inspection architecture checks pass | Provider application, booking, assignment, report, settlement and notification UAT |
| Admin / governance | Core architecture and authorization contracts are present | Full role-by-role browser tests, privileged mutation tests and audit-trail verification |
| Communications | Canonical communication gateway and sensitive-token omission logic are present | Provider credentials, inbox/SMS/WhatsApp delivery, retries, callbacks and delivery-state certification |
| Database | 194 unique migrations pass static preflight | Fresh-database replay, linked-project drift check, RLS and RPC role-isolation tests |
| Deployment / recovery | Deployment configuration files are present | Build pipeline, staging smoke test, backup restore, alerting and rollback rehearsal |

## Environment blockers

- Project runtime contract: Node `>=22.22.2`; available runtime: Node `22.16.0`.
- `npm ci` was attempted; strict engine validation blocked the first attempt. A retry with engine strictness disabled did not complete within the available execution window. The partial `node_modules` directory is incomplete and is not included in the release archive.
- TypeScript check was attempted but could not run because required type packages were missing from the incomplete install.
- No authenticated staging Supabase URL/service key or payment/email/SMS provider credentials were supplied. No production or staging API call was made.
- No real browser automation or physical Android/iOS verification was available during this source audit.

## Handover instructions

1. Use this ZIP as a source candidate only after the receiving environment checks out the project and installs dependencies with Node `22.22.2` or newer.
2. Run `npm run validate:system-handover-core`, then `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.
3. Reconcile the 149 failed and one timed-out historical validator results using the attached register. Do not mass-delete old validators or manufacture success output.
4. Replay all 194 migrations against a fresh disposable PostgreSQL/Supabase database, then certify RLS/RPC and storage isolation.
5. Run authenticated browser journeys at 320, 360, 375, 390, 430, tablet and desktop widths for buyer, private seller, dealer, inspector and administrator roles.
6. Complete real staging UAT for registration, listing creation, auction bidding, escrow, payments/refunds, inspections, CRM, communications and account security.
7. Do not deploy or modify production until the above gates pass and a release owner approves the result.

## Files in this audit set

- `docs/handover/FULL_SYSTEM_AUDIT_20261109.md` — this report.
- `docs/handover/FULL_SYSTEM_VALIDATOR_RESULTS.tsv` — bounded validator output inventory.
- `docs/handover/FULL_SYSTEM_REMEDIATION_REGISTER.csv` — every non-passing validator with disposition.
- `scripts/validate-system-handover-core.mjs` — maintained source-level release gate.
