# KAYAD — Super Admin operational data failure remediation (2026-11-01)

Scope: the 13 Super Admin screens reporting HTTP 503 / "System under scheduled maintenance."
Everything is local. **No commit, push, deployment, production migration, database write or financial operation was performed.** One strictly read-only `SELECT` was run against the hosted settings table to establish the real maintenance state.

## 1. Root-cause summary

**Shared cause (all 13 screens, one defect — not 13).**
The hosted `system_settings` row `system_status` (read-only query, project "KAYAD EA", 2026-11-01) is:

| field | value |
|---|---|
| isMaintenanceMode | `true` |
| maintenanceScope | **absent** |
| maintenanceVersion | **absent** |
| emergencyMessage | `System under scheduled maintenance.` |
| updated_at | 2026-10-27 06:17 UTC |

This is the *legacy* flag shape. By documented design (`KAYAD_MAINTENANCE_SCOPES_20261027_POLICY_MATRIX.md` §1, `config/maintenancePolicy.js`) an unscoped row is treated as **GLOBAL** maintenance, and under GLOBAL "admin & financial APIs stay closed" for every identity, the System Owner included. Only session routes and the maintenance control plane stay reachable (owner / `platform_recovery` staff). So every admin read answers `503 {code:"SYSTEM_MAINTENANCE", maintenance:true, scope:"global"}`.

Diagnosis against the prompt's candidate list:

| Candidate | Finding |
|---|---|
| Intentionally active | Cannot be proven from the data; the flag is 5 days old and carries no scope, reason, incident or version (the scoped control plane always writes those). **Owner decision needed.** |
| Stale | Plausible — it predates any scoped activation and nobody has recorded ending it. |
| Incorrectly scoped | The *effect* is wider than a typical operational pause (it also closes the whole public marketplace and every admin read), because a legacy flag can only mean GLOBAL. |
| Incorrectly enforced | **No.** Policy, pre-auth check and identity-aware check agree; 122 policy tests pin it. |
| Wrong routes / roles / base paths / DB error mapped to 503 | **No.** Reproduced for every one of the 13 read endpoints; all are ordinary routes refused by the same decision. |
| Panic Room state not persisting | **No.** The row is what Panic Room/control plane reads; the control plane honestly reports it. |

**Why the screens looked different from each other (independent, secondary defects — D-18…D-21).** The screens each hand-rolled error handling, so the same 503 produced different, often misleading output: confirmed-looking zeros (`0`, `KES 0`, `Showing 0–0 of 0`), raw axios text, unlabelled stale rows, rows of another filter kept under new filters, and Escrow Custody showing *default* rules as live with **Save enabled** (financial risk). Separately, `/admin/users` rejected `role=individual_seller|superadmin` (400) and Seller Management filtered one page client-side.

**What was deliberately NOT done.** Maintenance was not disabled, scoped, bypassed or written to. No exemption for Super Admin reads was added: the documented policy closes them, and the prompt forbids inferring otherwise. The UI hint that sent every Super Admin to "end or scope the maintenance in the Panic Room" was inaccurate (only a System Owner / `platform_recovery` holder can) and was reworded.

## 2. File-by-file changes

Backend
| File | Change |
|---|---|
| `backend/validation/query.schema.js` | `userListQuerySchema.role` now includes `individual_seller`, `superadmin` (unknown roles still 400). |
| `backend/routes/adminRoutes.js` | `GET /admin/users`: server-side `status` filter, whitelisted to `pending|approved|rejected`. |
| `backend/tests/regression/superAdminOperationalReadsMaintenance.test.js` (new, 122 tests) | Hosted row ⇒ GLOBAL; all 14 screen read endpoints refused under GLOBAL for superadmin-label, admin, owner, platform_recovery; allowed under each scope; control plane/session reachability; 503 body contract; users role schema. |
| `backend/tests/regression/stage5f5AdminStatsContract.test.js` | +5 tests: status tabs, injection-shaped status ignored, banned filter, new roles accepted. |

Frontend (new)
| File | Purpose |
|---|---|
| `src/utils/adminLoadFailure.ts` | Classifies the *real* response: maintenance, maintenance-policy-unavailable, session, forbidden, missing, rate-limited, server, timeout, network, invalid. Curated text only (no raw server text/stack). |
| `src/components/admin/AdminLoadNotice.jsx` | One alert: cause, "stale + last successful refresh" or "no records shown, not an empty result", Retry. |

Frontend (changed) — all: failure classified, unconfirmed counts shown as `—`, stale data kept only for the same query/page/filter, labelled with refresh time, refresh keeps visible rows.
| File | Specific changes |
|---|---|
| `AdminUsers.jsx` | Notice; summary/rows retained only for same query. |
| `AdminSellers.jsx` | Server-side tabs (`status`, `banned`), paging, server total, Refresh button, array-shape guard, unreported sales/ratings = "Not reported" (was KES 0). |
| `AdminCars.jsx` | Shared wording (`getLoadErrorMessage`), last-refresh time, same-query guard. |
| `AdminCarModeration.jsx` | Maintenance no longer reported as "records have been retained"; same-filter guard; stale time. |
| `AdminAuctions.jsx` | Counts/tab counts `—` until loaded; stale banner with time. |
| `AdminBids.jsx` | Total/paid/unpaid `—` until loaded; classified messages; same-query guard. |
| `AdminEscrows.jsx` | Classified message; filter guard; dashboard totals marked stale/unverified; "unverified" instead of "0 visible". |
| `AdminEscrowCustody.jsx` | **Failure state replaces form; payload validated; writes disabled when stale.** |
| `AdminTransactions.jsx` | Classified message; same-query guard; stale rows no longer replaced by "Loading…". |
| `AdminNtsaQueue.jsx` | Counts `—` until loaded and when another filter hides them; same-filter guard. |
| `AdminInspections.jsx` | Tiles `—` until loaded; stale rows kept during retry; classified message. |
| `AdminDealerVerifications.jsx` | Summary starts unconfirmed (was zeros); footer count unavailable until load; Refresh button. |
| `AdminInspectorApplications.jsx` | Unreported counts stay `null` (was `?? 0`); notice; same-query guard. |
| `features/AdminView.tsx` | Maintenance cause text corrected (no Panic-Room promise to every Super Admin). |
| `scripts/validate-business-command-centre-phase04.mjs` | Alert check accepts the shared `AdminLoadNotice` (still requires an alert + "Retry loading applications"). |

Tests updated for deliberate wording/contract changes (still assert the same safety properties): `AdminCars.test.jsx`, `adminCommandCentre.test.tsx`, `adminTables.test.jsx`.
Tests added: `adminOperationalFailureMatrix.test.jsx` (96), `adminCustodyAndSellersTruth.test.jsx` (8), `utils/adminLoadFailure.test.ts` (13).

## 3. Workflow matrix (frontend, real components, network mocked)

Cases per screen in `adminOperationalFailureMatrix.test.jsx`: records ✔ · genuine empty · 503 maintenance (no empty-state, no confirmed zero) · 401 · 403 · 500 (raw server text not echoed) · retry/refresh recovers and re-calls the same loader · failed refresh keeps data + stale label. 8 cases × 12 screens = 96, all pass.

| # | Area | Records | Empty | 503 | 401/403 | 5xx | Retry | Stale | No fabricated 0 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Dashboard statistics | existing | existing | existing + wording | existing | existing | existing | existing (`statsStatus: stale`) | existing (`Unavailable`) — *not in the new matrix* |
| 2 | Users | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 3 | Sellers / pending dealers | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (+8 targeted) |
| 4 | Vehicle records / Listing Mgmt | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 5 | Car Moderation | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 6 | Auction Control | ✔ | ✔¹ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 7 | Bid Management | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 8 | Escrow Operations | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 8b | Escrow Custody config | ✔ | n/a | ✔ | — | — | — | ✔ (writes disabled) | ✔ (defaults never shown as live) |
| 9 | Transactions | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 10 | NTSA queue | ✔ | ✔¹ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 11 | Inspection orders | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 12 | Dealer Verifications | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| 13 | Inspector Applications | ✔ | ✔¹ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

¹ Asserted as "no records shown, no failure notice" (the page has no distinct empty headline text that the test pins). Row 8b tests: `adminCustodyAndSellersTruth.test.jsx`. Row 1 was not re-tested in this task beyond the wording change; its behaviour was already covered by `adminCommandCentre.test.tsx` (34 tests, pass).

Not covered: real-browser (Playwright) run of these 13 screens against a live backend — no authenticated backend/DB is available here; the hosted API was not called.

## 4. Validation (exact commands, after the last code change)

| Check | Command | Exit | Result |
|---|---|---|---|
| Typecheck | `npm run typecheck` | 0 | clean |
| "Lint" | `npm run lint` | 0 | this repo's `lint` is `tsc --noEmit`; **no ESLint is configured** |
| Production build | `npm run build` | 0 | built |
| Frontend tests | `npm test` | 0 | **137 files passed; 1187 passed, 1 skipped (pre-existing skip)** |
| Backend Jest | `cd backend && npm run test:jest` (via `npm test`) | 1 | 181/182 suites, **3291/3292 tests**; sole failure `stage5f5RoleRouteMatrix › GET /api/admin/stats › ghost_checker` = **D-11, pre-existing policy decision, unchanged** |
| Backend Vitest | `npm run test:vitest` | 0 | 6 files, 36 tests |
| Backend node:test | `npm run test:node` | 0 | 1/1 |
| Validators | 152 `validate:/certify:/verify:` scripts | 0 ×140 | the 12 non-zero are exactly the baseline blockers (env credentials, missing deployment URL, missing `PHASE_39_COMPLETE.md` / `APPLY_RECOVERY_TO_REPO.cmd`, cosmetic palette) |
| Frontend prod audit | `npm audit --omit=dev` | 0 | 0 vulnerabilities |
| Backend prod audit | `cd backend && npm audit --omit=dev` | 1 | **16 advisories (1 critical dompurify, 6 high, 9 moderate) — OPEN, D-23, not changed** |

Notes: `npm test` in `backend/` chains Jest → Vitest → node:test with `&&`, so the D-11 failure stops the chain; Vitest and node:test were therefore run separately. `validate:business-command-centre-phase04` regressed from my own change and was fixed (13/13). Logs: this folder.

## 5. Decisions for the product owner

1. **Maintenance state (blocking all 13 screens).** Is the 2026-10-27 flag intentional? If yes, nothing to do — the screens now say so truthfully. If not, a **System Owner** ends it in the Panic Room (owner password + MFA). I did not and will not do this unprompted.
2. **Legacy flag handling.** Should an unscoped legacy flag keep meaning GLOBAL (current, fail-closed), or should the hosted row be migrated to an explicit scope? Recommend: end it or re-activate with an explicit scope/reason so it has an audit trail.
3. **Admin reads during maintenance.** Current policy: *no* admin/finance reads under GLOBAL, even for the owner. If operations need read-only visibility during an incident, that is a new, deliberate server-side policy class (e.g. owner-only, read-only), not a UI change. Not implemented.
4. **`platform_recovery` grants** (no staff MFA yet — see maintenance risk doc condition 1).
5. **D-11** `ghost_checker` access to `/admin/stats`.
6. **D-23** approve `npm audit fix` in `backend/`.
7. Pre-existing from the previous checkpoint: D-12 missing `PHASE_39_COMPLETE.md`, `APPLY_RECOVERY_TO_REPO.cmd`.

## 6. Limitations / honesty

- The fix to the screens is **reporting and data-state truthfulness plus two small contract fixes**; the screens will still show "maintenance" until decision 1 is taken. They will not load data while maintenance is GLOBAL, by design.
- Not verified against a live authenticated backend or the hosted API; hosted maintenance behaviour is inferred from source + the one row read.
- Dashboard (row 1) not newly matrix-tested.
- Node used locally differs from the pinned 22.22.2 (as in earlier rounds).
- `npm run lint` provides type checking only.

## 7. Safety statement

No commit, push, merge, deployment, production migration, database write, maintenance change, or real financial operation was performed. No secrets were printed or stored; no `.env` files are packaged.
