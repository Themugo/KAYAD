# KAYAD All-Areas Audit Report
Honest scope: this session fully re-baselined the repo on the required Node, reviewed the Phase 39 payment-security change, swept all backend routes for missing authentication, compared hosted DB state with source migrations, scanned for secrets, and ran every validator. It did NOT perform fresh deep audits of every domain A–N; those are marked PARTIAL in the matrix.

## Findings
| ID | Sev | Domain | Finding | Status |
|---|---|---|---|---|
| AA-D1 | High | C/E | Hosted DB lacks ~58 newer source migrations; auction_setups/auctions tables missing in production (root of known failure) | Open – NEEDS AUTHORIZATION |
| AA-S1 | Medium | G | Public marketplace-health summary/trends/alerts exposed fraud/dispute/financial metrics | Fixed |
| AA-S2 | Medium | A/G | Unauthenticated /api/users/search listed all users' names/emails | Fixed |
| AA-P1 | Info | F | Phase 39 trusted-proxy gate correct: unset/malformed CIDR → socket peer used (fail closed); trusted peer → req.ip; forged leftmost XFF ignored. Caveat: Express `trust proxy: 1` still resolves req.ip one hop; CIDR must match that hop | Verified |
| AA-P2 | Low | F | ipInCidr helper is IPv4-only (IPv6/IPv4-mapped peers fail closed, not open) | Noted |
| AA-R1 | Info | G | mediaEventRoutes.js has no auth but is not mounted | Noted |
| AA-R2 | Low | G | dealer-health-score public endpoints, no consumer | Decision |
| AA-L1 | Low | N | npm + bun lockfiles at root | Open |
| AA-X1 | Info | M | gitleaks: 12 hits, none real | Closed |

Baseline and test numbers: see KAYAD_ALL_AREAS_STATUS_MATRIX.tsv. Route-to-role matrix: KAYAD_ALL_AREAS_ROUTE_ROLE_MATRIX.tsv (heuristic).

---
# Continuation 2 — foundation `all-areas-hardening` (supersedes earlier "Honest scope" caveats where noted)

## Baseline (verified)
- Foundation ZIP `KAYAD-ALL-AREAS-AUDIT-HARDENING-20261012.zip` SHA-256 `102a8d0a…27ba6`: verified; internal manifest 0 mismatches. It has no `.git`; compared against the remote branch read-only: remote `all-areas-hardening` = `d7c85a5b` (matches expectation); the ZIP differs from it only by the one `GITHUB_TOKEN` line in `security.yml` (ZIP predates it). `main` is `f7f1479` (squash-merge of PR #219 = the AA-S1/S2 work); branch is 2 commits ahead of `main`'s base.
- Stray file `t proxy<U+F022>`: ASCII text, 5,672 bytes, ANSI-coloured `git grep` output for `MPESA_TRUSTED_PROXY_CIDRS` created by a redirect typo; no secrets; not packaged; safe to delete in your clone (`del "t proxy*"`).
- Artifact found in ZIP: `backend/data/uploads.sqlite` (empty runtime store created by test runs, 0 rows). Removed from this package; `.gitignore` entry added.
- Runtime: Node 22.22.2 (npm-registry build). Package manager evidence: `npm ci` in every CI job, `vercel.json installCommand`, both Dockerfiles -> **npm is the effective convention**; `bun.lock` is an unreferenced second lockfile (last touched 2026-09-30). Not removed (decision for owner).

## Findings added or revised
| ID | Sev | Domain | Finding | Status |
|---|---|---|---|---|
| AA-S1 (revised) | High | G | Earlier fix used `adminOnly`, which admits **all 10 staff roles** (marketing, hr, accounts, moderator, `ghost_checker` external inspectors...). Runtime test proved 8 non-admin staff roles could read fraud/dispute/financial health metrics (32/57 assertions failed pre-fix). Now `admin`/`superadmin` only | FIXED + runtime test |
| AA-S2 (revised) | High | A/G | Same root cause in `/api/users/search`: "staff" check let the same 8 roles see emails and staff accounts. Now admin/superadmin only | FIXED + runtime test |
| AA-D2 | Medium | D | Public `GET /api/dealer-health-score/:dealerId` populated the dealer's private **email**. Field removed; **access policy unchanged** (per brief). Public `/details`, `/ranking`, `/top`, `/trends` still return full score components - business decision outstanding. No frontend consumer found | FIXED (PII only) / GAP (policy) |
| AA-A1 | High | G | **Systemic:** `adminOnly` and `STAFF_ROLES.includes()` treat every staff role as administrator. 262 registered routes (92 non-GET; includes `/api/v1` mirrors of the same routers) rely on `adminOnly` alone (ledger 8, fraud 11, disputes 10, communications 10, reliability 10, operations...). `carController` update/delete/image mutation allows **any staff role** to edit/delete any listing. Not changed: correct role matrix is a business decision (e.g. accounts/escrow_officer legitimately need ledger/disputes) | GAP - NEEDS DECISION |
| AA-K1 | High | L | `k8s/backend/deployment.yaml`: `optional: true` sat beside `valueFrom` instead of inside `secretKeyRef` (since commit fdd137a); kubeconform strict validation rejected the whole Deployment, so `kubectl apply` would fail | FIXED + test |
| AA-K2 | Low | L | `k8s/strategies/canary-deployment.yaml`: stray `- #` turned the last YAML document into a list; apply would error | FIXED + test |
| AA-D1 (refined) | High | C/E | Object-level drift (replacing filename-based "58 migrations"): **16 source tables absent on hosted** (all `auction_*` incl. `auction_setups`, `chat_message_idempotency`, `chat_message_outbox`, `hero_placements`, `hero_slides`, `provider_service_capabilities`, `purchase_outcomes`, `report_corrections`, `report_versions`) and **24 hosted tables with no CREATE anywhere in the repo** (e.g. `bid_logs`, `transactions`, `dealer_health_scores`, `marketplace_health`, `sms_bidders`, `admin_control_*`). Production cannot be rebuilt from source and source cannot be applied blind | OPEN - NEEDS AUTHORIZATION |
| AA-D3 | Info | E | Earlier note that the `auctions` table is "absent" is corrected: **no migration or live code path uses a table named `auctions`** (auctions live in `cars` + `auction_setups`...). The only reference is a dead string in an un-imported `reminderAutomationService.js`. No runtime failure from this | CLOSED (correction) |
| AA-D4 | Low | C | Migration replay: 179/181 apply on a fresh local PG16; the 2 failures need platform function `public.rls_auto_enable()` which **exists on hosted** (stub-fidelity gap, not a defect). Re-running the whole history a second time fails in 15 files (non-idempotent constraint/policy DDL) - acceptable for forward-only migrations, unsafe for blind re-apply | PARTIAL |
| AA-W1 | Info | H | Webhooks verified fail-closed in code: Brevo (token missing -> 401), Twilio (HMAC signature or shared secret), Africa's Talking/SMS (shared secret/API key), M-Pesa (IP gate + Phase 39 CIDR peer gate). Twilio signature URL is built from `x-forwarded-*` headers (cannot be forged without the auth token) | PASS (source), live NOT RUN |
| AA-G1 | Info | G | Uploads: MIME + extension + magic-byte checks and size limits; GET/DELETE enforce owner-or-admin/superadmin (exact roles, not STAFF) | PASS (source) |
| AA-P3 | Info | A | Auth: HS256 pinned on verify; role/ban/token-version/session re-read from DB each request; separate refresh secret enforced in production; httpOnly+secure(prod)+lax cookies with CSRF layer; recovery/verification rate-limited. No `iss`/`aud` claims (single service - low) and 1h access-token default | PASS (source) / PARTIAL |
| AA-C1 | Info | C | RLS: 201/201 replayed public tables RLS-enabled; hosted 209/209 | PASS (catalog) |

## Method upgrades
- Route matrix is now generated from the **real registered Express routers** (instrumented `Router`, nested routers and `router.use` guards observed): 96 mounts, 1,596 routes, 0 import failures, 111 with no guard (triaged: public catalog/auth/webhook/CMS routes; webhook routes verify inline). Previous regex matrix (1,264 routes) kept as `evidence/route_matrix_regex_v1_superseded.tsv`.
- DB: migrations replayed on a throwaway local PG16 with Supabase stubs - **local substitute, not staging**.
- Manifests: `kubeconform` v0.6.7 (K8s 1.29 schemas) now available; all 26 resources valid after fixes. Helm templates still cannot be rendered.
