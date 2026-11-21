# KAYARD KE — Next-phase handover, 2026-11-21

Baseline `main @ 6eb7c98a` + uncommitted work in the working tree (nothing committed, pushed, deployed, or applied to hosted; hosted access was read-only SELECT). **This is not a release-readiness declaration. Release is BLOCKED (section 9).**

Labels: VERIFIED = executed with evidence; FAILED; BLOCKED = needs credentials/infra; NOT TESTED.

## 1. Defects fixed
| ID | Fix | Status |
|---|---|---|
| GAP-ESC-OPS | Escrow ops dashboard 500 and silently wrong finance/reconciliation statistics (queried non-existent `issueDetails`) → single DB function over JSONB `issues`; one definition of "unresolved" (`P1-…md`) | VERIFIED (33 DB-backed checks, unit, guard) |
| GAP-OFFER-TXN | Accepted offers were never bound to payment. Settlement table, server-side amount, DB payment backstop, expiry, cancel, audit (`P2-…md`) | VERIFIED on disposable DB (49 checks); provider steps BLOCKED |
| Offer RPC (earlier) | `kayad_offer_action` filtered a non-existent column (every action failed) | VERIFIED |
| Freeze coverage | New pay route added to the Panic Room `payments` freeze (caught by existing route-inventory guard) | VERIFIED |
| Rate limiting | New pay route uses `paymentLimiter` (5/min/user; override only via env for CI) | VERIFIED by guard; runtime limit NOT separately tested |

## 2. Defects remaining
* **GAP-ANOMALY** (OPEN): `escrow_anomalies` is absent from repo migrations and mismatches application fields; detection service has a `Promise.all` misuse. Dashboard shows "Unavailable" rather than 0. Needs a schema decision.
* **Systemic `aggregate()` shim** silently ignores `$unwind/$count/dotted paths`; other endpoints unaudited.
* GAP-WRITE-ROUTE: 220/408 write routes show no static validation signal (heuristic); dynamic validation NOT TESTED.
* GAP-HERO-CTA, GAP-ORPHAN: documented, owner decisions (`P6-…md`).
* Provider-dependent journeys: BLOCKED (`P5-…md`).

## 3. Financial design decisions (see P2 doc)
Agreed price = amount of the accepted offer, whole KES, copied immutably to a settlement; buyer is sole payer; one active settlement per vehicle; DB trigger on `payments` enforces buyer and amount for every path; pay route takes a phone number only. **Decisions awaiting the business:** D1 payment window (48 h assumed), D2 seller price change after acceptance (agreed price stands), D3 whether acceptance should show the vehicle as reserved, whole-shilling rule for accepted offers (fractional offers cannot be accepted).

## 4. Database migration status
Repo 205 migrations; **applied 205/205 to an empty local PostgreSQL 16** (VERIFIED). Hosted tracking ends 20260922060457; 82 migrations are after it; hosted lacks the offer and purchase-outcome tables entirely. Nothing applied to hosted. Plan, order, backup and rollback: `P3-…md`. Definition-level comparison with staging: BLOCKED. Rollback rehearsal: NOT TESTED.
New migrations (local only): `20261121090000`, `20261121100000`, `20261121110000`.

## 5. Test evidence (final working tree)
| Suite | Result |
|---|---|
| Frontend vitest | 1752 passed, 1 skipped, 0 failed (208 files) — VERIFIED |
| `tsc --noEmit` | exit 0 — VERIFIED |
| Backend jest | see `evidence/jest-final-summary.txt` |
| Backend vitest / node:test | 61/61 / 13/13 — VERIFIED |
| Validators (356) | 350 pass; 6 fail: `live-runtime`, `communications-provider-certification` (credentials) and `local-supabase` (Docker) BLOCKED; `release`, `system-handover-core`, `wave3-convergence` were caused by 3 undocumented routes and now PASS (re-run individually). Log: `evidence/validators-final.csv` is from before that fix. |
| DB journeys (13) | 0 failures, 182 PASS lines — VERIFIED locally |

## 6. CI status
`ci/db-journeys/run.sh` + `.github/workflows/db-journeys.yml`. Local run VERIFIED; the workflow has NOT run on GitHub (NOT TESTED). The existing CI workflows were not changed.

## 7. Browser journey evidence
No new browser journeys this phase (API-level only). Earlier-phase browser evidence is in `ALIGNMENT-VERIFICATION-20261121/evidence/browser/`. New UI change: escrow desk shows "Unavailable" for the anomaly queue — unit-level only, browser NOT TESTED.

## 8. Security review
* Money: browser cannot supply an amount on the new route (strict schema); amount mismatch and wrong-buyer blocked at API and by DB trigger (VERIFIED); settlement and event tables have RLS on, client roles revoked, immutable key fields, append-only audit (VERIFIED).
* New functions are SECURITY DEFINER with pinned `search_path`, service_role only (static guard VERIFIED).
* Staff dashboards: permission boundaries unchanged (VERIFIED).
* Rate limit and freeze coverage of the new route (see above).
* Found, not fixed: the global error handler drops machine-readable `code` fields (worked around locally in the offer controller); 5xx messages are returned in non-production (by design in dev).
* Not reviewed: provider callbacks beyond allow-list rejection; OWASP-style scan of the 220 unvalidated routes.

## 9. Release blockers
1. GAP-ANOMALY unresolved. 2. Hosted DB 82 migrations unapplied and 11 PARTIAL/untracked states unresolved; needs the P3 gates. 3. Provider journeys (STK, callbacks, funding, release/refund, payout, auctions, inspections) unverified. 4. Business decisions D1–D3. 5. Aggregate-shim audit. 6. Write-route validation coverage. 7. Workflow not yet run on GitHub.
