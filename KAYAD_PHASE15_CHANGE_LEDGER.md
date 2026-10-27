# KAYAD Phase 15 - Source Change Ledger
Foundation: KAYAD-PHASE14.9-ACCOUNT-SECURITY-DEALER-PAYMENT-READINESS-20261026.zip (SHA-256 4e24422a...cd26a), unchanged. Brand: display text is "KAYAD KE"; no identifier, route, key or code name was renamed.

| # | File | Change | Reason (evidence) |
|---|------|--------|-------------------|
| 1 | backend/utils/adminPaymentView.js (new) | Read-only payment oversight projection: masked phone, no checkout id / metadata / user id, derived reconciliation state | Admin payments list returned full phone, checkout ids, raw metadata and labelled every failed payment plainly "failed" (governance E2E B2-B9) |
| 2 | backend/routes/adminRoutes.js | payments list uses the projection + summary `totalCollected` (basis stated); toggle-ban: rank rule (403 ADMIN_RANK_REQUIRED), optional explicit `{banned}` (idempotent), response `{isBanned, changed}`, token-version bump + refresh-token revoke on ban, audit entry; system/health returns `warning` / `no_critical_alerts` + `basis`; seller-settings save answers 503 SELLER_SETTINGS_NOT_PERSISTED on missing schema | Admin could ban a superadmin (defect reproduced on 14.9); ban non-idempotent/un-audited; health said "healthy" from absence of alerts; unbacked commission columns surfaced raw DB errors |
| 3 | backend/routes/platformFactoryRoutes.js, improvementRoutes.js, automationRoutes.js, lowCodeRoutes.js | `router.use(protect, adminOnly)` | Buyers/dealers/anonymous could read and call platform internals (A1-A3) |
| 4 | backend/routes/dealerHealthScoreRoutes.js | `/:dealerId/details`, `/trends` -> protect + adminOnly | Dealer score breakdown was public (A4) |
| 5 | backend/controllers/automationController.js | AI suggestions built from live counts (pending dealer verifications, pending cars) with `meta.source`; hard-coded fabricated figures removed | Fabricated metrics (A5) |
| 6 | src/api/api.exports.ts | `toggleBan(userId, banned?)` | Explicit target state |
| 7 | src/pages/admin/AdminUsers.jsx | UI adopts server-confirmed ban state; shows server error text | UI must not report success before server confirmation |
| 8 | src/pages/admin/AdminTransactions.jsx | "Successful collections" label, reconciliation labels, receipt, masked phone, load-error alert instead of "No transactions" | Misleading "Total Revenue"; failed load looked like empty list |
| 9 | src/pages/admin/ControlRoom.jsx, PanicRoom.jsx | Health banner shows `warning` / `no_critical_alerts` wording with basis | Honest health |
| 10 | src/pages/admin/AdminSellers.jsx | Shows server error message | |
| 11 | Brand: VehicleMarketplace.tsx, App.tsx, backend/tests/admin/navigationAuthority.test.js | "KAYAD KE" display text (legacy "KAYAD EA" hero default normalised to KE) | Owner instruction |
| 12 | Tests: backend/tests/regression/superAdminOperationalIntegrity.test.js (23), src/__tests__/phase15/superAdminOperationalIntegrity.test.jsx (3), src/__tests__/pages/admin/adminTables.test.jsx (assertion changed) | New regression coverage. The one old expectation changed: `toggleBan('u1')` is now `toggleBan('u1', false)` (explicit target state) and the test additionally asserts the UI adopts the confirmed state - stronger, nothing removed | |
| 13 | runbooks/phase15-20261026/ | Inventory, role probe, 5 DB E2E scripts, browser check | Evidence |

Not touched: bidding, auction execution, deposits, escrow, ledgers, settlement, payment callbacks (`paymentCallback.service.js` byte-identical to 14.9), payment routing, 14.9 deletion guard and phone step-up.

## Rollback
Each change is isolated; revert the file(s) in the row. Behaviour changes to be aware of: staff-only access to the four tooling routers and dealer score details (any non-staff caller now gets 401/403); ban endpoint now rejects admin-on-superadmin bans (403); health status strings changed (`warning` / `no_critical_alerts`; frontend updated in the same change - revert together); admin payments list shape (fields renamed to masked/projection form; frontend updated together); seller-settings save returns 503 instead of a raw database error.
