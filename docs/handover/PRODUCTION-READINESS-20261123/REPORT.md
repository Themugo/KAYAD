# KAYARD KE — Production recovery, reconciliation & release readiness (REPORT, revision 2, 2026-11-23)
Previous revision kept at `evidence/REPORT-v1-2026-11-23-1030.md`. Classes: **Confirmed · Reproduced locally · Implemented and tested locally · Inferred · Unverified · Blocked · Requires owner approval.**
No production write, migration, restore, configuration or environment change was made. Claude did not commit, push, merge or deploy.

## Executive summary
1. **`main` is already merged and auto-deploys.** PR #266 was squash-merged at 07:01 (+03) and #267 at 10:47; `main` (`51f30b6d`) is byte-identical to branch `release/kayard-combined-20261123` (`0a3cc4ad…`, verified). `deploy.yml` deploys the frontend to Vercel on every push to `main`. The live app therefore runs code that expects database objects the hosted database does not have. *(Confirmed)*
2. **Recovery gate NOT met.** No dump has been supplied; the Free-plan project has "No backups". Procedure and verification queries are ready (`BACKUP-AND-RESTORE.md`). The database is tiny (30 MB; 3 users, 2 dealers, 2 cars) and holds **no financial rows at all** (0 bids, escrows, payments, refunds, ledger entries, leads). *(Confirmed)* → Blocked on owner.
3. **Registration is broken on production** (placeholder function). *(Confirmed + Reproduced locally)* Fix prepared and rehearsed: `20261122200000`.
4. **Listing creation is very likely broken on production**, and more broadly than reported before: all three listing forms send `Idempotency-Key`; the backend then reads `cars.creation_idempotency_key`, which hosted lacks → PostgREST 400/42703. *(Reproduced locally; live failure Unverified – no attempt in the 24 h log window.)* Fix prepared and rehearsed: `20261122120000`, database-first, backward compatible. No code fallback was added, by design.
5. **Login failure: stage NOT ESTABLISHED.** Server side is healthy for the 3 existing accounts; no login attempt reached the database during your 09:47 report; one browser capture is needed. No source defect found, no login code changed.
6. **CI**: the DB Journeys workflow's GitHub failure is Blocked (log), but the **entire suite passes locally on the `main` tree** (211/211 migrations on a clean DB, 29 journeys, overall PASS). One earlier local failure was caused by my own interference and discarded.
7. **A real, reproduced source defect was fixed and tested locally:** `backend/db/index.js` serialised range operators in `$or` as `[object Object]`, making the hourly dealer-health job fail with HTTP 400 against the live database. *(Implemented and tested locally; not deployed.)*
8. **Financial drift (22 functions):** hosted is mostly an **older point of the repo's own history** (10 are byte-identical to an older migration; 8 are near-variants; 2 hold hosted-only logic). Direction is therefore mostly "repo newer", not "hosted newer" — but nothing is chosen or applied; the 15 money-moving functions have a decision matrix. *(Confirmed lineage / Inferred safeguards)*
9. **Offers/settlement/auction/lifecycle:** offers core is isolable; settlements, auction outcomes and lifecycle are dependency-blocked (`purchase_outcomes`, `auction_setups`, `auction_platform_policies`). `20261121160000` alone would break the lifecycle RPC (reproduced). *(Reproduced locally)*
10. **Next safe sequence:** Gate 0 → database-first Steps 1–2 → decisions on the rest (`PRODUCTION-RECONCILIATION-PLAN.md`).

## Findings register
| # | Finding | Class |
|---|---|---|
| R1 | Baseline: remote branch HEAD = `0a3cc4ad11531968f5fd865fede4fab446581958`; `main` = `51f30b6d`, tree identical; #266 squash `2854f5ec` | Confirmed |
| R2 | `deploy.yml` deploys on push to `main`; Render auto-deploy default | Confirmed / Inferred |
| R3 | Deployed backend built from `main` at/after the 07:01 merge; exact SHA | Inferred / Unverified |
| R4 | Hosted registration RPC is a placeholder | Confirmed + Reproduced |
| R5 | Listing replay lookup fails on hosted (42703); 4-arg RPC PGRST202 | Reproduced locally |
| R6 | `dealer_listing_policy` row absent → default free path (RPC not used by default) | Confirmed |
| R7 | No backup/PITR; dump not supplied | Confirmed / Blocked |
| R8 | 0 financial rows; 3 users; 2 dealers; 2 cars; 3,046 reconciliation reports | Confirmed |
| R9 | Login attempt absent from DB in the report window; accounts healthy | Confirmed (absence) |
| R10 | `db/index.js` `$or` operator defect | Reproduced + Implemented and tested locally |
| R11 | Hosted lacks 11 repo tables and 4 `cars` columns; 3 objects used by code are defined in no migration | Confirmed |
| R12 | 22 function bodies: lineage groups A–E | Confirmed (lineage) |
| R13 | Blanket replay unsafe (stops at `20261002180000`; overwrites 14 money functions) | Reproduced locally (previous report) |
| R14 | Command centre reports unavailable sources honestly; no zeros; missing-column also reported as unavailable | Confirmed (source + journey 18) |
| R15 | CI GitHub failure cause | Blocked |
| R16 | Local DB Journeys full pass | Reproduced locally |

## Acceptance criteria status
| Criterion | Status |
|---|---|
| Full dump exists and restore verified | **Blocked – exact owner action in `BACKUP-AND-RESTORE.md`** |
| Deployment relationship | Partly established; SHA/env **Unverified**, owner steps given |
| Listing RPC mismatch solution | Precise database-first dependency plan + tested migration; backend fallback deliberately not added |
| Login root cause | Missing diagnostic identified (browser capture) |
| CI root cause | Missing log identified; local suite passes |
| 22 functions inventoried; decision path for 15 | Done (`FUNCTION-DRIFT-INVENTORY.md`, revision 2) |
| Dependencies mapped | Done (`MIGRATION-DEPENDENCY-GRAPH.md`) |
| Recorded local test results | `TEST-RESULTS.md` |
| Controlled production plan | `PRODUCTION-RECONCILIATION-PLAN.md` (never executed) |
| PR 266 unmerged | **Not possible – already merged by the owner before this command** |
| No unauthorised production change | Met (read-only SELECT only) |

## Release gate (Phase I)
Must be resolved **before the app is dependable** (merge already happened): Gate 0, then Steps 1–2. **Database-first:** `20261122200000`, `20261122120000`. **Deployable independently:** the `$or` fix. **Coordinated:** none if database-first. **Financial approval:** Steps 4–5. **PR #266/#267 are not "release-ready"**: mandatory gates (recovery, database steps, deployed-SHA confirmation, GitHub CI evidence) have no evidence yet.

## Not done / not tested
Full E4 financial regression on synthetic data for the hosted-shaped schema (not built in this session; the full-chain journeys run the repo's own financial scenarios), password reset and verification-callback in a live browser, real email delivery, any production write. Local validation is not production verification.
