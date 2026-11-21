# Write-route security audit — 2026-11-21

Labels: **MAPPED** = resolved from source by `scripts/write-route-matrix.py` (a map, *not* proof); **INSPECTED** = route + middleware + handler/service read by hand; **TESTED** = covered by an executed regression test. Static signals are never reported here as vulnerabilities without inspection.

## 1. Scope and method
* `scripts/write-route-matrix.py` parses every `router/app.(post|put|patch|delete)(…)` in `backend/**` route files, resolves the middleware chain **including** file-level `router.use(...)`, parent `router.use(prefix, child)` chains and `server.js` mounts, and writes `WRITE-ROUTE-MATRIX-20261121.csv` (columns: tier, file, line, method, mount, path, auth, authz, validation, rate_limit, idempotency, csrf, handler).
* It finds **690** write routes, not 408: the earlier inventory covered `routes/*.js` only; this one also resolves the inspection module and nested routers. The two numbers are not comparable; 408 should be retired.
* Limits of the static map: handler-level checks (ownership, in-handler signature checks, inline `if (!req.user)`) are invisible to it; custom middleware names not in its vocabulary read as "none" (we found and fixed three such false negatives: `allowRoles`, `*Guard` helpers, nested `router.use`).

## 2. Cross-cutting controls (INSPECTED)
| Control | Finding |
|---|---|
| CSRF | `server.js:836` mounts `csrfProtection` on **all** `/api` (double-submit cookie; Bearer tokens are *not* a bypass). Exemptions are an explicit allowlist of provider callbacks (`/api/payments/callback`, `/b2c/callback`, `/b2c/timeout`, `/bids/mpesa/callback`, `/escrow-vault/webhook/`, `/sms-bidding/webhook/`, `/webhooks/`, `/communications/webhooks/`); versioned `/api/v1` is folded onto `/api`. Money routes (`/bids`, `/escrow`, `/disputes`) additionally mount `idempotencyCheck`. |
| Global rate limit | `globalLimiter` (`server.js:376`) covers every route; stricter limiters on auth, admin, payments (5/min per user, env-overridable), webhooks. |
| Freeze | Every payment-initiating route is classified in `config/featureFreezePolicy.js`; `featureFreezeEnforcement.test.js` fails if a new route is unclassified (TESTED, already green). |

## 3. Matrix summary by priority tier (MAPPED)
| Tier | Write routes | No auth middleware | No authz | No validation | No route rate-limit | No idempotency |
|---|---|---|---|---|---|---|
| T1 auth/account | 18 | 6 | 17 | 13 | 5 | 18 |
| T2 listings/moderation | 72 | 6 | 33 | 30 | 57 | 71 |
| T3 offers/negotiation | 30 | 0 | 25 | 10 | 26 | 26 |
| T4 payments/settlement | 21 | 2 | 12 | 7 | 20 | 14 |
| T5 escrow/reconciliation | 31 | 0 | 15 | 9 | 26 | 7 |
| T6 admin/dealer | 186 | 2 | 28 | 98 | 119 | 186 |
| T7 other | 332 | 13 | 83 | 122 | 294 | 314 |

"No authz" on an authenticated route usually means *owner-scoped by design* (a user acts on their own record); it is **not** a finding. Whether ownership is enforced is a handler/service question — INSPECTED only for the routes below.

## 4. The 29 routes with no authentication middleware — all INSPECTED
| Group | Routes | Verdict |
|---|---|---|
| Public auth (by design, rate-limited `authLimiter`, plus `recoveryLimiter`) | register, login, refresh (CSRF-protected), resend-verification, forgot/reset-password | OK |
| Provider callbacks, IP-allowlisted + idempotent | `payments/b2c/callback`, `b2c/timeout` (`mpesaIpWhitelist`, `idempotencyCheck`) | OK; relies on IP allowlist (see F-2) |
| Provider/partner webhooks with in-handler secret | `communications/webhooks/*` (shared secret / Brevo token, timing-safe), `sms-bidding/webhook/inbound` (API key), `webhooks/inventory` (API key, 500-row cap) | OK; see F-2 |
| Mounted under an authenticated router (analyzer false positive) | `admin/inspection-governance/*` (parent `router.use(protect, adminOnly)`, `adminRoutes.js:188`) | OK |
| Optional-auth engagement/telemetry | car click/favourite counters (`optionalAuth` + `createLimiter`), auction visit, ad events, CMS analytics track, FAQ popularity, funnel view, analytics collect, feedback submit, contact, inspector application | OK for access; integrity issue F-3 |

`scripts/validate-write-route-policy.mjs` now fails if any *new* unauthenticated write route appears that is not in `scripts/write-route-public-allowlist.json` (TESTED: passes, 690 routes / 29 reviewed).

## 5. Money routes inspected by hand (T4/T5)
| Route | Auth / authz | Validation | Ownership | Idempotency | Result |
|---|---|---|---|---|---|
| `POST /api/reconciliation/run`, `/reports/:id/resolve`, `/alerts/*` | `router.use(protect)`, `allowRoles(admin,superadmin,finance,accounts)` | controller | n/a (staff) | none | OK (analyzer showed "none": false negative). Resolve is a state change with no idempotency key: acceptable because resolving is monotonic |
| `POST /api/escrow/operations/{reconcile,anomaly-scan,case/:id/payout}` | `protect` + role guards (`escrowReconcileOnly`/`OperateOnly`/`SettlementOnly`) | `validateObjectId` | staff | `idempotencyCheck` | OK |
| `POST /api/wallet/refunds/:holdId` | `protect` | destination whitelisted in service | `kayad_auction_refund_to_wallet_atomic(p_user_id)` binds hold to user | atomic RPC is idempotent | OK |
| `POST /api/wallet/withdraw` | `protect` | inline only | wallet row of `req.user`; payout **only** to the user's own profile phone | optional client key, else random | **Finding W-1 (fixed)** |
| `PUT /api/dealer/cars/:id/auction/*` | `dealerGuard = [protect, allowRoles(dealer), requireDealerVerification]` (variable the analyzer missed) | service | `userId` passed to services; `getAuctionSetup` returns `forbidden` | n/a | OK (ownership in save/publish services **not** read in depth) |
| `POST /api/leads/:id/offers/:id/pay`, settlement cancel | `protect`, buyer-only in service, `paymentLimiter`, freeze | strict zod | DB trigger binds buyer + amount | DB-level (one active settlement) | OK — TESTED (74 DB-backed checks) |
| `POST /api/payments/initiate` | protect, limiter | schema | server-derived amount; offer settlement override | idempotency | OK — TESTED earlier phases |

## 6. Findings
| ID | Severity | Finding | Status |
|---|---|---|---|
| **W-1** | Medium | `POST /api/wallet/withdraw` accepted fractional amounts; the DB function `ROUND(p_amount,0)`s them, so KES 10.50 silently debits KES 11 (contradicts the whole-KES decision). Money does not leave without a matching wallet debit and payout goes only to the user's own phone, so no theft path. | **Fixed locally** (route rejects non-integers with `AMOUNT_MUST_BE_WHOLE_KES`); TESTED `walletWithdrawWholeKes.test.js` (7). The DB function still rounds as defence in depth; changing it needs a migration and separate approval. |
| W-2 | Low | The same route has no route-specific limiter and the idempotency key is optional (a double click makes two valid withdrawals, each correctly debited). | Open — recommend a required key and `paymentLimiter`. Not changed (client contract change). |
| F-2 | Low | SMS webhook accepts the API key as `?api_key=` (appears in access logs) and answers HTTP 200 on failure; B2C callbacks rely on an IP allowlist only. | Open — recommend header-only key and signature verification where the provider supports it. |
| F-3 | Low | Public telemetry writes (ad events, CMS analytics, funnel view, auction visit, feedback) have no body schema and only the global limiter → analytics/ad-stat inflation possible. No financial effect. | Open — per-route limiters and schemas. |
| F-4 | Info | 98 of 186 admin/dealer routes and 122 "other" routes lack a validation middleware signal. Not inspected individually. | **UNVERIFIED** — see §7. |

## 7. What was NOT done (be explicit)
* Only the routes in §4–§5 (~45) were read end to end. The other ~640 are MAPPED only; no per-route regression test exists for them beyond what the existing 4,100+ jest tests cover. "No validation signal" on a route is a lead for review, not a vulnerability.
* No dynamic probing (no auth-bypass fuzzing, no multi-user IDOR sweep) was run against the 690 routes; the DB-backed journeys exercised registration, listings, offers, payments, chat, leads, inspections and role separation only.
* Recommended next: IDOR matrix test (user A vs user B on every `/:id` write route in T2/T3/T6) in the DB-journey harness.
