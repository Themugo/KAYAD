# KAYAD — Final Integrated Foundation Release Gate (2026-10-09)

Candidate: integrated tree at commit `db081f3` + gate commit `fb0ecb1`. No feature work, redesign, deployment or production migration was performed.

## Verdicts

| Layer | Verdict |
|---|---|
| Source-level correctness | **CORRECT, with 1 open product gap and 2 owner decisions** (below) |
| Local verification | **PASS for everything applicable**; 7 inherited validator failures classified, none hidden or weakened |
| Staging verification | **NOT RUN** — no staging/KAYAD Supabase credentials, no provider credentials in this environment |
| Production verification | **UNCONFIRMED** — no access to the deployed backend, logs or `public.auction_setups` |

Production readiness remains unconfirmed until the real-environment checks listed under "Outstanding blockers" pass.

## 1. `deletedAt` semantics (real adapter tests)
`backend/tests/auction/deletedAtSemantics.adapter.test.js` runs the real `createModel("Car")` and the real `auctionController` over a PostgREST-shaped evaluator with three row kinds: field **absent**, explicit **null**, non-null **timestamp**. 7 tests pass. Finding: the adapter silently skips `null`/`undefined` filter values, so `deletedAt: null` was a no-op and deleted vehicles were exposed. Fixed earlier with the additive operator `{ $exists:false }` (= IS NULL). Revert proof: restoring `deletedAt: null` makes 1 test fail. No active vehicle is excluded; no deleted vehicle is exposed. No further filter change was needed in this gate.

## 2. Support rating migration — existing-data review
Aggregate-only, sanitized SQL in `evidence/support/data_review_pre_migration.sql`, `data_review_post_migration.sql`, outputs in `data_review_output.txt`, `support_hardening_proof_output_final.txt` (PostgreSQL 16 built from the migration chain, legacy-shaped seed; **not** a hosted database).
- Legacy resolution notes preserved: moved rating comments are backed up in `legacy_resolution_notes`, plus one aggregate audit row `support.migration_rating_comment_moved`.
- Ticket numbers: legacy `SUP-YYYYMMDD-<6 hex>` vs new `SUP-YYYYMMDD-<6 digits>` could in theory collide. **Defect found and fixed in this gate:** the trigger now loops until the number is unused. Migration run twice is idempotent.
- Audit rows preserved; no NOT VALID constraints; support functions `service_role` only; trigger function revoked from anon/authenticated; owner RLS limited by column GRANT.
- **Residual risk:** `legacy_resolution_notes` retains former free-text; on production, review it for personal data before retention is decided. The same review must be repeated on a copy of real data — not possible here.

## 3. Auction API vs intended runtime — UNCONFIRMED
Blockers (exact): (a) no KAYAD Supabase project is visible to the connected Supabase tool (only SAFESPACE, inactive, and TOPLINE FLOORING); so `to_regclass('public.auction_setups')` could not be queried; (b) container egress to the deployed host is blocked for curl (proxy 403); WebFetch works but returns a summarized view, not raw HTTP, and showed `limit:1` on every list request, which is inconsistent with our controller — it is not accepted as evidence; (c) the deployed build id `30f8a764fa2bdb79005674cc930e5355bc4f33f3` cannot be matched to any local commit; (d) no backend logs. Note `errorHandler.js` masks every 5xx as "Internal server error" outside development/test, so the symptom alone cannot name the cause.
Locally proven: the scheduled list depends on `auction_setups` (migration `20261002190000`); live/ended read only `cars`; missing table reproduces the draft 500; UI now degrades per section (`Promise.allSettled`, 14/14 browser checks). **Production cause: unconfirmed.** Required: run `select to_regclass('public.auction_setups')` and read the backend log for the failing request on the deployed project.

## 4. Least-privilege authorization
`backend/tests/support/supportRouteSurface.test.js` (9 tests) introspects the Express stack and scans source:
- Read/answer/internal-note/assign routes require `requireSupportViewer`/`requireSupportAgent`; every write route is agent-only; customer routes use `protect` only; no `adminOnly` on support.
- `PERM.SUPPORT_AGENT` = role `technical_support` only. `PERM.SUPPORT_OVERSIGHT` (admin/superadmin/owner) is read-only, needs a 10–300 char reason, is audited fail-closed, sees no internal notes, and is not satisfied by the generic all-permissions shortcut.
- Only an allow-list of files reads `support_tickets`; dashboards only count (guarded by regex on the `c()` alias).
- Customer projections exclude internal notes (service tests + PostgreSQL proof P1–P21); SQL support functions are `service_role` only.

## 5. Inherited validator failures (10 → 7 on Node 22.22.2)
| Validator | Class | Evidence / action |
|---|---|---|
| phase6-release | ENVIRONMENTAL | Needs Node ≥22.22.2; passes on 22.22.2 |
| v14-runtime-preflight | ENVIRONMENTAL | Same; passes on 22.22.2 |
| lead-crm-domain-end-to-end | **PRODUCT defect — FIXED** | Orphan `models/Lead.js`, `LeadActivity.js` (no importers) removed; passes |
| communications-provider-certification | ENVIRONMENTAL | Requires live provider credentials; NOT RUN |
| live-runtime | ENVIRONMENTAL | Requires Supabase env |
| local-supabase | ENVIRONMENTAL | Requires Docker/Supabase CLI |
| communication-event-convergence | **OUTSTANDING PRODUCT GAP** | `BID_CONFIRMED`/`OUTBID` are not emitted by `bidController`. Not fixed: new behaviour = out of scope for this gate. |
| escrow-custody-domain | VALIDATOR DRIFT | Asserts a pre–Stage 9 capability model; product changed deliberately. Assertion not weakened; validator needs an owner-approved update. |
| home-hero-premium | VALIDATOR DRIFT | The 2026-10-07 audit deliberately moved the hero to cutout assets; validator still asserts the older asset contract. Hero dimensions untouched. Not weakened; owner-approved validator update needed. |
| production-host-contract | **OWNER DECISION** | Validator expects absolute `https://api.kayad.space/api`; `.env.production.example`, `DEPLOY.md`, `vercel.json` rewrite use relative `/api`. Genuine conflict; resolve before deploy. |

Final: 167 of 174 validators pass; 7 fail as classified above (the 3 non-environmental ones are a real gap, drift or conflict — not "baseline noise").

## 6. Extracted-copy verification (ZIP re-extracted; file list and content digest identical to commit `fb0ecb1`, tree digest `c0e0f5895814565e`)
Node 22.22.2.
- Backend Jest: 68 suites, **1038 passed**, 0 failed, 0 skipped, exit 0
- Backend Vitest: 5 files, **16 passed**, exit 0
- Frontend Vitest: 73 files, **567 passed, 1 skipped**, exit 0
- `tsc`: exit 0; `vite build`: exit 0
- Validators: 167/174 pass; failures as classified
- Browser journeys (mocked HTTP, Vite dev server on the extracted copy): support 56/56, inspection 66/66, automotive 71/71, auction partial-failure 14/14 = **207/207**
- Raw outputs: `evidence/release-gate/`.

**Known flaky test-runner issue:** `node --test tests/response-lifecycle.test.js` prints `ok` but the process occasionally never exits under Node 22.22.2 (≈1 in 15–25 runs; 0 in all 22.22.0 runs). A handle dump shows only a `MessagePort` (no sockets/timers), so this points to the node:test runner, not product code. The test's `finally` now closes keep-alive connections (benign hardening, reduces but does not eliminate it). CI should run `node --test` with a timeout. Not claimed as fixed.

## 7. Staging
RLS, migration-on-staging and real provider delivery: **NOT RUN** (no credentials/environment). Queries and procedure: `KAYAD_SUPPORT_RUNTIME_CERTIFICATION.md`.

## 8. Preservation
UI, information architecture, hero dimensions, identity foundation, support work and auction fixes unchanged apart from the corrections above (ticket-number guard, orphan models, added tests, test-hardening).

## Outstanding blockers
1. Staging Supabase for KAYAD: apply migration chain, RLS and `has_function_privilege` checks.
2. Deployed backend: `to_regclass('public.auction_setups')`, failing-request log, deployed commit identity.
3. Provider credentials for real email/in-app delivery.
4. Owner decisions: `/api` vs absolute API host; validator updates for escrow-custody and home-hero-premium; whether to emit BID_CONFIRMED/OUTBID.
5. Review `legacy_resolution_notes` content on real data before production migration.

ZIP name, size and SHA-256 are recorded in the external manifest `KAYAD-FINAL-RELEASE-GATE-20261009.zip.sha256` delivered beside the ZIP (a file cannot contain its own hash).
