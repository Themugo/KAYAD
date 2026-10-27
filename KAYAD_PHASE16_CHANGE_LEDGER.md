# KAYAD Phase 16 — Change ledger (relative to the Phase 15 tree, hash `eb20a3e4…6d580f`, decision A)

| File | Change | Why |
|---|---|---|
| `backend/utils/totp.js` | new — RFC 6238 TOTP on `node:crypto` | owner second factor |
| `backend/services/ownerMfa.service.js` | new — AES-GCM secrets, enrolment, verify (replay guard, lockout), recovery codes, reset | MFA |
| `backend/services/ownerGovernance.service.js` | step-up now password **+ second factor**; `mfaCode` threaded through invite/resend/revoke/remove/recover; recovery & emergency paths reset the factor | MFA enforcement on owner changes |
| `backend/routes/ownerRoutes.js` | `mfaCode` passthrough; new owner-only `/api/owner/mfa*` routes; duplicate object key removed | MFA + hygiene |
| `backend/controllers/authController.js` | owner login gate (`MFA_REQUIRED`, invalid code, store failure ⇒ 503) | sign-in challenge |
| `backend/validation/auth.schema.js` | `mfaCode` accepted on login | schema would otherwise strip it |
| `backend/middleware/rbac.js` | `requireAnyPermission` (ANY-of) | least-privilege gates |
| `backend/config/staffAccessPolicy.js` | new policy table | single source for the gates |
| `backend/routes/ledgerRoutes.js`, `communicationControlRoutes.js`, `salesDashboardRoutes.js` | gates applied | close Phase 15 governance gaps |
| `src/services/authApi.ts`, `src/context/AuthContext.tsx`, `src/pages/LoginPage.jsx` | `mfa_required` kind; code field shown only when the server asks | sign-in UI |
| `src/api/api.exports.ts`, `src/pages/admin/AdminOwnerManagement.jsx` | MFA API + panel; code field in owner dialogs | owner UI |
| `backend/tests/regression/phase16OwnerMfaAndStaffPolicy.test.js` | new (17 tests) | unit |
| `backend/tests/regression/stage2EntryCorrections`, `stage4AuthorizationPolicy`, `stage4aGateClosure` | **deliberately updated**: they pinned the old “ledger reads are adminOnly” behaviour (decision D6, now closed); mock gained `requireAnyPermission` | behaviour changed on purpose |
| `src/__tests__/pages/LoginPage.ownerMfa.test.jsx`, `AdminOwnerManagement.mfa.test.jsx` | new (7 tests) | UI |
| `backend/utils/accountDeletionGuard.js` | optional dependency list: `owner_memberships.user_id` (ON DELETE RESTRICT) is checked when the table exists and skipped when it does not | found by the carried drift-guard test (D1): deleting a former owner would have hit an FK 500 after soft-deleting cars; hosted (table absent) unchanged |
| `scripts/validate-phase06-department-capabilities.mjs` | pin updated from the literal `requirePermission(...)` text to the policy-based gate + policy file check (intent unchanged: ledger writes need MANAGE_FINANCE) | stale text pin, deliberate |
| `runbooks/phase16-20261026/**` | migration candidate + rollback, pg checks, E2Es (owner/identity/…), probes, shim, dry run | evidence |
| `evidence/phase16-20261026/**` | logs | evidence |
| `KAYAD_PHASE16_*.md/csv` | reports | deliverables |

**Not changed:** Phase 15 archive and its reports; `supabase/migrations` (no migration added to the live chain); hosted database; any commit/push/deploy; KAYAD KE brand text; payment/auction/escrow logic.
