# KAYAD — Owner Decision Register (Stage 5 update)
Stage 5 section first; the complete Stage 4A register follows unchanged (D3, D5–D17 remain as stated there, with the Stage 5 updates noted in S5-D2/S5-D4).
Status key: **OPEN** · **IMPLEMENTED-SAFE** (owner may revert) · **GATED**.

## S5-D1 — Initial onboarding configuration — OPEN (owner must save it deliberately)
- **Evidence:** with no saved row the system applies launch defaults: private sellers **enabled**, dealers **approval_required**, listings **hold_for_review**, both authorities **owner_only**. Dealers are *not* opened.
- **Action:** on launch day the owner opens Settings → Onboarding and saves the intended values so the choice is in the audit log (checklist 12). **Approval:** owner. **Handover value (recommended):** the defaults above.

## S5-D2 — Owner identity and the unverified/unregistered owner address — OPEN (partly IMPLEMENTED-SAFE)
- **Evidence:** owner = email in `WEBHOIST_EMAIL(S)`; exempt from the generic email-verification gate; no database flag. If the account does not exist, whoever registers that address inherits owner powers.
- **Implemented:** the new owner-only controls (policy change, owner-only decisions) additionally require the owner's email to be verified (`OWNER_EMAIL_UNVERIFIED`).
- **Open:** remove the owner exemption from `protect`/login altogether (would lock out an owner who never verified), or keep the exemption and rely on the checklist. **Recommended:** keep, run checklist 4, plan removal after the owner confirms verification. **Approval:** owner.

## S5-D3 — Dealer decision authority and listing decision authority — IMPLEMENTED-SAFE (owner-controlled)
- **Before:** any `admin` could approve a dealer through three endpoints and any admin could moderate listings.
- **Now:** default `owner_only`; the owner can delegate to `admins` in the UI. Suspension stays admin-available. **Approval needed only to delegate.** Revert = set to `admins`.

## S5-D4 — Explicit listing rejection (extends D3) — OPEN / GATED
- The single-listing reject action writes `rejected`, which the database constraint refuses; bulk reject hides (a different status). Rejection is therefore not yet one explicit auditable state. **Candidate 03B rehearsed on a disposable copy; not applied.** Options: A apply 03B (recommended); B change writers/readers to `hidden` + a rejection flag; C leave. **Approval:** explicit authorization before any hosted change.

## S5-D5 — Progressive access in `self_onboarding` — OPEN (parameter)
- Pending dealers may list up to **3** vehicles (existing code constant). Whether 3 is right, and whether their listings should auto-publish under `auto_publish`, is a policy choice. No change made.

## S5-D6 — Private-seller auto-provisioning as an approved dealer record — OPEN
- `requireDealerVerification` auto-creates an *approved* `dealers` row for an `individual_seller` at first listing (pre-existing). Now behind the always-on email-verification gate and the moderation setting, but still bypasses any dealer review. **Recommended:** keep for private sellers (they are not dealers). **Approval:** owner.

## S5-D7 — Generic login/`protect` email-verification gate remains provider-gated — OPEN
- Seller features are now always gated. Buyers are still gated only when `REQUIRE_EMAIL_VERIFICATION`/`BREVO_API_KEY` is set. **Recommended:** set `REQUIRE_EMAIL_VERIFICATION=true` explicitly in production once live delivery is proven; deploying it earlier locks out accounts that cannot receive mail. **Approval:** owner.

## S5-D8 — Registration enumeration (409 "account already exists") — OPEN
- Pre-existing tradeoff; resend/forgot are generic. Options: keep; return a generic success and email existing users. **Approval:** owner/product.

## S5-D9 — Duplicate-index cleanup — OPEN (low)
- Five duplicate index pairs (see risk register). Needs a reviewed migration; no urgency.

## S5-D10 — Verification link as POST — OPEN (hardening)
- Moves token consumption off GET to avoid scanner pre-fetch. Changes the public link flow.

---
# KAYAD — Owner Decision Register (Stage 5 update, 2026-10-18/19) — includes all Stage 4A items unchanged below the Stage 5 section
No decision below was made on the owner's behalf. "Implemented" means a minimal, reversible safety correction that does not choose a business policy; where it touches policy it is stated and can be reverted. Status key: **OPEN** (needs approval) · **IMPLEMENTED-SAFE** (done, owner may revert) · **GATED** (work prepared, not applied).

## D3 — `rejected` as a canonical listing status — OPEN / GATED
- **Affected:** `cars_status_check` (inline CHECK in `20260710043200_…foundational_tables.sql`: available, sold, pending, reserved, hidden, draft); writers `routes/adminRoutes.js` (moderate reject), `controllers/duplicateController.js` (removed), `controllers/reportController.js:250` (report queue); readers `bidController.js:198`, `auctionController.js:90/126/169/242/329`, `operationsDashboardController.js:29`; `carController.js:708` (non-staff cannot set it). Bulk reject writes `hidden`.
- **Evidence:** static; pinned in `stage4aGateClosure › G1`. On a database built from the repository, three workflows violate the constraint.
- **Impact:** security – none; operational – moderation/duplicate/report actions fail at the database; financial – none (sold listings are protected before any write).
- **Options:** (A) make `rejected` canonical: apply low-lock candidate 03B (sequence in the safety pack); (B) retire `rejected`: change the three writers and three readers to `hidden`/a rejection flag; (C) leave as is.
- **Recommended:** A — application policy already treats `rejected` as canonical in six places. **Approval required:** yes (schema change). **Proceeds without it:** sold-listing protections, tests, candidate and runbook (done).

## D5 / D6 — Finance permissions — OPEN
- **Affected:** `middleware/auth.js adminOnly` (admits every `STAFF_ROLES` member and the owner), `routes/ledgerRoutes.js` (reads: balance-sheet, trial-balance, reconciliation, list, get — `adminOnly` only; writes: create, reverse, seed — `adminOnly` + `MANAGE_FINANCE`).
- **Evidence:** `config/roles.js` has `MANAGE_FINANCE` but **no `VIEW_FINANCE` permission exists**; MANAGE_FINANCE is held by accounts, admin, superadmin/owner (+ per-user grants). Ghost_checker, marketing, hr, etc. can currently read ledger data.
- **Impact:** confidentiality of financial records to non-finance staff; no write exposure (fixed in Stage 2).
- **Options:** (A) require `MANAGE_FINANCE` for ledger reads (narrows access, no new permission); (B) introduce a `VIEW_FINANCE` permission and grant it to chosen roles (new permission = new policy); (C) keep reads open to all staff.
- **Recommended:** A now, B later if read-only finance staff are needed. **Approval:** yes (changes who sees data; may affect admin dashboards). **Safe now:** nothing broadened.

## D7 — Dead role aliases `executive`, `staff`, `super_admin`, `manager`, `engineer` — OPEN
- **Affected:** `commandCenterRoutes/Controller`, `ecpRoutes`, `improvementRoutes`, `intelligenceRoutes`, `governanceController`, `disputeController (staff list)`, `auctionSettlementRoutes:17`, `auctionFulfilmentRoutes:20`; SQL RLS in `20260908020000_executive_intelligence_domain.sql`.
- **Evidence:** `users.role` CHECK (foundational migration) and `profiles_role_check` exclude all five; test `G3` proves the list. They can never be held, so they grant nothing; the routes behave as admin+superadmin only. `dealer team role "manager"` is a different, dealer-scoped concept.
- **Impact:** no privilege escalation; misleading code and documentation; any future role addition with these names would silently activate dead gates.
- **Options:** retire from code/policies; or add real roles with explicit permission sets. **Recommended:** retire (keep as is until a role is deliberately introduced). **Approval:** for introducing roles. **Safe now:** guard tests.

## D8 — Feature flags — OPEN
- **Affected:** `routes/featureFlagRoutes.js` (mounted at `/api/feature-flags`, `server.js:873`, authenticated; admin for management), `controllers/featureFlagController.js`, `services/featureFlagService.js`, `middleware/featureFlag.js` (consumed by no route), `models/FeatureFlag.js`.
- **Evidence (correcting Stage 4):** the routes **are mounted**. No migration defines `feature_flags`; the service never imports `FeatureFlag` and calls helpers the model lacks, so every call lands in an error path. Before Stage 4A that path returned **enabled=true for every key** (`GET /evaluate/:key`) and the middleware let requests through.
- **Implemented (IMPLEMENTED-SAFE):** the service now fails **closed** (`false`), every flag middleware answers 503 instead of calling `next()` on error. Nothing depended on the old behavior in the repository (no consumer found in `src/` or routes). Pinned by tests.
- **Options:** (A) retire the routes/service/middleware (no table); (B) build a schema-backed subsystem (table + model + service + tests) — no hosted schema is assumed; (C) leave mounted but inert. **Recommended:** A unless a real feature needs flags. **Approval:** yes for A or B.

## D9 — Audit failure policy — OPEN (policy), interim IMPLEMENTED-SAFE
- **Affected:** `utils/auditAfterCommit.js` (26 call sites in `adminRoutes`, `announcementController`, `bulkAdminController`); `governanceController` (strict, unchanged).
- **Evidence:** domain write and audit write are separate PostgREST calls; no shared transaction exists. Failure of the audit write after commit cannot roll back the action.
- **Implemented:** audit failure never turns a committed action into a 500; it logs `AUDIT_WRITE_FAILED_AFTER_COMMIT` with action, actor, target and error; security/finance actions (user delete/deactivate, kill-switch, dealer verification, referral, subdomain, bulk delete, seller settings) retry once and log `critical:true, attempts:2` for alerting. The code never claims atomicity.
- **Options:** (A) fail-open-with-alert (current); (B) single-transaction RPC per critical action (mutation + audit in one database function) — strict, larger change per action; (C) hybrid: A everywhere, B for the critical set. **Recommended:** C. **Approval:** yes for B/C. **Required either way:** an alert rule on `AUDIT_WRITE_FAILED_AFTER_COMMIT` / `critical:true`. Error-level logs are forwarded to Sentry by `infrastructure/logging/sentry-integration.js` when Sentry is configured; whether the hosted environment has it configured, and whether any alert rule exists, was **not verified** (no repository evidence of a rule).

## D10 — Admin-only checks that excluded superadmin — IMPLEMENTED-SAFE (reversible)
- **Affected:** `leadController` ×6, `paymentController:430`, `bidLogController:192`.
- **Evidence:** they compared `role === "admin"`, which excluded `superadmin` (the owner passed only in payment). Every other admin gate in the system admits `admin` and `superadmin`, so this was an inversion, not a policy.
- **Implemented:** `isRoleAllowed(user, ["admin","superadmin"])` (owner bypass included). **This broadens access for non-owner superadmin** on those six lead operations, the payment status read and the bid-log read to match the rest of the system. Revert = restore the literal check. **Approval:** requested to confirm; no other role changed.

## D11 — Owner exemption at login — IMPLEMENTED-SAFE (reversible)
- **Affected:** `authController.login` (suspended/deactivated owner was rejected at login but exempt in `protect` and refresh).
- **Implemented:** login applies the same owner exemption (owners are immutable by design, `config/owners.js`). Only reachable by editing the database directly. Revert = remove `&& !isOwnerEmail(...)`. Also: password reset now clears the auth cache; revoke-all documentation corrected (it revokes the current session too).

## D12 — Missing backend scripts — IMPLEMENTED-SAFE / OPEN
- Four entries disabled with an explicit failure message (see `PACKAGE_MANAGER_AND_SCRIPT_DISPOSITION.md`). **Open:** restore the owner's implementations or retire the commands and `docs/DEPLOYMENT.md:209`.

## D13 — `bun.lock` — OPEN
- Cannot reproduce `package.json` (8 dependency differences, 14 devDependencies absent). Retained, undeleted, documented non-authoritative; npm (`npm ci`) is the CI/Vercel policy. **Options:** keep as is; regenerate with `bun install`; remove. **Recommended:** remove or regenerate once the owner confirms bun is not used. **Approval:** yes.

## D14 — Escrow capability backfill population (`20261008120000`) — OPEN / GATED
- Grants `granted` to every `individual_seller` at `none` (including banned/deactivated). Preflight B2 gives the exact count. **Options:** approve population; restrict to an allow-list; skip backfill. **Recommended:** approve only after the count and the banned/deactivated subset are reviewed. **Approval:** yes.

## D15 — `profiles.role` reconciliation (`20261011121000`) — OPEN / GATED
- Can raise or lower database-level admin visibility. Preflight C1/C2 give pairs and direction. **Approval:** per pair of privileged roles. Save a pre-image first.

## D16 — `GET /api/ledger/seed` — IMPLEMENTED-SAFE
- Was a state-changing GET (upsert of the chart of accounts). Now `POST /api/ledger/seed` (admin + `MANAGE_FINANCE`); `GET` returns 405 and never reaches the service. No in-repo consumer existed (`src/` and scripts searched). The upsert is idempotent by account code, but it overwrites names/descriptions of existing accounts — **open:** whether seeding should only insert missing accounts (recommended).

## D17 — Referral bonus policy — OPEN (technical guards IMPLEMENTED-SAFE)
- **Affected:** `authController.register` (bonus credited at registration, before the referee verifies an email), `routes/adminRoutes.js /referrals/:id/credit|expire`, `routes/referralRoutes.js`, `models/Referral.js`; schema `referrals` (no unique constraint on `referee`).
- **Evidence:** `credits`/`referralEarnings` are counters; nothing in the repository spends or pays them out; registration credits create no `Transaction` row (stats total only counts admin-credited rows); no cap or per-referrer rate limit.
- **Implemented:** referral code must be a plain string (operator-object injection closed); self-referral compared on normalised email; suspended/deactivated referrers never credited; record-before-credit and no second credit per referee; admin credit amount must be a finite positive number and is claimed with a conditional `pending→credited` update (no double credit).
- **Open policy:** credit only after referee email verification or first purchase; per-referrer cap and daily limit; maximum admin-credit amount; plus-address aliasing; unique index on `referrals(referee)`; whether registration credits should create `Transaction` rows; reversal on fraud. **Approval:** yes. Do not enable payouts before these are decided.

## Stage 4 report corrections recorded here
1. Feature-flag routes are mounted (Stage 4 said unmounted); only the middleware is unused.
2. `20260930110000` preserves live sessions via hash backfill (Stage 4 said sessions end).
3. The `VIEW_FINANCE` permission named in the brief does not exist in the codebase.
