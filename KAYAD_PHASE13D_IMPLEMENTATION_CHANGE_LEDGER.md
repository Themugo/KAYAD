# KAYAD Phase 13D — Implementation Change Ledger
Eight files differ from the verified foundation (verified with `diff -rq` against the pristine copy, excluding `node_modules`/`dist`). No frontend, database, migration, payment, escrow, ledger, bidding, auction, webhook, Super Admin authentication, public layout, or capability-schema file changed.

| # | File | Kind | SHA-256 before → after (first 16) |
|---|---|---|---|
| 1 | `backend/middleware/dealerIsolation.js` | NEW | — → `2cf568a82aeb91e0` |
| 2 | `backend/routes/dealerRoutes.js` | modified | `25c42d6853013fc2` → `29455a1a5f62a056` |
| 3 | `backend/routes/dealerPlatformRoutes.js` | modified | `ff4643e481f0afa3` → `b55963020d1b040d` |
| 4 | `backend/routes/listingQualityRoutes.js` | modified | `b5af42152dee46fc` → `b073aa53a1589508` |
| 5 | `backend/routes/searchAnalyticsRoutes.js` | modified | `c49e1267c334a7ef` → `254c9e60bedab415` |
| 6 | `backend/middleware/dealerVerification.js` | modified | `158be9e67fe0e8f2` → `4567afe6259146e4` |
| 7 | `backend/tests/regression/phase13dDealerIsolation.test.js` | NEW test (173 cases) | — → `d33ff76cd9cc4575` |
| 8 | `backend/tests/onboarding/onboardingFlow.test.js` | test updated (one case) | `0554cab9f2bdfcd5` → `7a01d3f0c5529ec4` |

`middleware/auth.js` is deliberately **not** modified (the new guards live in a new file, so `dealerOnly`'s behaviour for every other caller is byte-identical).

## C-1 DI-1 — legacy dealer router (`routes/dealerRoutes.js`)
- **Original defect:** private sellers reach dealer-business operations.
- **Correction:** the router-level guard is unchanged. Per-route `dealerBusinessOnly` (role `dealer` + existing staff roles + owner bypass) was added to: `GET /team`, `POST /team/invite`, `PATCH /team/:memberId`, `DELETE /team/:memberId`, `POST /upgrade`, `PATCH /cars/:id/wholesale`, `GET /trade-listings`, `POST /pricing-recommendations`.
- **Callers:** frontend `dealerAPI` (dealer dashboard pages only). No private-seller UI calls these.
- **Tests:** `Workstream A — legacy` (8 routes × 6 non-dealer personas = 48 denied cases, plus dealer-owner, staff, team-member, anonymous and seller-own-route preservation).
- **Security rationale:** a personal role or seller status must never confer dealer-business permission. The 403 body keeps the existing `{success:false,message}` shape.
- **Rollback:** restore the file from the foundation; remove the one import line.

## C-2 DI-2 — dealer platform (`routes/dealerPlatformRoutes.js`)
- **Correction:** all 25 `protect, dealerOnly` → `protect, dealerBusinessOnly`. Team routes (`dealerOrgAccess`) and public profile routes untouched.
- **Tests:** 11 representative business routes × 6 personas denied; dealer owner keeps all; team routes: owner and active member allowed, seller/buyer denied; member without `canManageTeam` refused invite; client-supplied `dealerId` does not select the organisation.
- **Rollback:** as above.

## C-3 DI-3 — listing-quality ownership (`routes/listingQualityRoutes.js`, `middleware/dealerIsolation.js`)
- **Correction:** `requireOwnDealerResource("dealerId")` after `validateObjectId` on the three dealer routes. The caller may address only their own id; staff and the owner bypass keep cross-account access. The id is compared with the authenticated identity, never trusted. A non-owner receives the same 403 whether or not the id exists (no existence leak). Malformed ids still get the existing 400 first.
- **Preserved:** an owner (dealer or private seller) reading/recalculating their own data; staff.
- **Tests:** owner allowed ×3; unrelated dealer denied ×3 with the service never invoked; four seller statuses denied on another dealer's id; nonexistent-id substitution; malformed id; buyer/member/anonymous; staff; query/body `dealerId` cannot override.
- **Rollback:** remove the middleware from the three routes.

## C-4 DI-4 — no dealership created for private sellers (`middleware/dealerVerification.js`)
- **Original defect:** `Dealer.create({approved:true,…})` for any `individual_seller` lacking a row.
- **Correction:** no insert. A private seller without a row proceeds with `req.dealer = null` (same authorization outcome, minus the dealership record). Suspended/rejected verification records still block. Existing rows are neither modified nor removed, and role `dealer` is unchanged (still refused without a row, trigger-created row path and progressive onboarding intact).
- **Callers:** `/api/cars` writes and `dealerPlatform POST /inventory`. Downstream readers of `req.dealer` are feature-flag checks that already use `req.dealer || null`.
- **Tests:** 4 seller statuses; legacy row untouched; buyer; dealer without row; verified dealer; suspended/rejected/pending dealer gating.
- **Rollback:** restore the file (note: restoring re-enables the auto-provisioning defect).

## C-5 `searchAnalyticsRoutes.js`
`GET /dealer/demand` (market demand insights) → `dealerBusinessOnly`. No frontend or test caller was found.

## Decisions to leave unchanged (with reasons)
`POST /api/leads` (existing test pins private-seller 201), all `/api/cars` guards, auction routers, and the caller-scoped legacy dealer routes listed in the remaining-risks document.
