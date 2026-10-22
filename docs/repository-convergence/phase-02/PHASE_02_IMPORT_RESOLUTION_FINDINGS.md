# Import Resolution Findings

- Source/config-like files scanned: **2162** source-extension files in archive (excluding none by root inventory; node_modules not present/ignored where applicable).
- Import dependency edges extracted: **6,655**
- Relative local imports resolved by common extension/index candidates: **3,844**
- Unresolved relative local import candidates: **31**
- Alias-like specifiers requiring config resolution: **76**
- Dynamic import candidates: **26**

## Important limitations

This is a regex-based static scan. It can miss imports in unusual syntax, template strings, macro-generated code, framework conventions, and dynamic path expressions. It can also misread some import-like strings. Unresolved entries are candidates for manual/compiler confirmation, not automatically confirmed defects.

## Highest-priority unresolved candidates

- `scripts/validate-auction-bid-surface.mjs:11` → `../services/bidApi` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-support-user-surface.mjs:23` → `./features/SupportView` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-common-component-convergence.mjs:11` → `../../SearchSidebar` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-common-component-convergence.mjs:12` → `./features/common/ReportButton` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-common-component-convergence.mjs:14` → `./features/admin/AdminWidgets` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-common-component-convergence.mjs:17` → `./ReportButton` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-chat-surface-convergence.mjs:17` → `./features/ChatView` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-system-owner-staff-governance.mjs:12` → `../config/owners.js` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-phase34.mjs:21` → `./adSlotRoutes.js` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-wave3-convergence.mjs:45` → `./features/EscrowView` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-wave3-convergence.mjs:46` → `./features/InspectionsView` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-wave3-convergence.mjs:47` → `./features/SupportView` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-wave3-convergence.mjs:48` → `./features/PaymentHistoryView` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-phase06-department-capabilities.mjs:14` → `./AdminDepartmentCapabilities` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-inspection-marketplace-activation.mjs:7` → `./inspection/routes/inspectionRoutes.js` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-stage26-global-theme-convergence-20261012.mjs:11` → `./styles/kayad-theme-convergence.css` — No matching file among common JS/TS/JSON/index candidates
- `scripts/validate-stage24-theme-convergence-20261012.mjs:8` → `./styles/kayad-theme-convergence.css` — No matching file among common JS/TS/JSON/index candidates
- `scripts/seed-ledger-accounts.js:1` → `../models/LedgerAccount.js` — No matching file among common JS/TS/JSON/index candidates
- `lib/db/src/schema/index.ts:2` → `./posts` — No matching file among common JS/TS/JSON/index candidates
- `evidence/stage5f10-20261020/role_api_5f5_merged.mjs:4` → `./lib.mjs` — No matching file among common JS/TS/JSON/index candidates
- `evidence/stage5f10-20261020/ui_5f5_admin_merged.mjs:6` → `./lib.mjs` — No matching file among common JS/TS/JSON/index candidates
- `evidence/stage5e2-20261019/harness/role_api_k.mjs:6` → `./lib.mjs` — No matching file among common JS/TS/JSON/index candidates
- `evidence/stage5e2-20261019/harness/ui_owner_unverified.mjs:5` → `./lib.mjs` — No matching file among common JS/TS/JSON/index candidates
- `evidence/stage5e-20261019/harness/role_api_j.mjs:6` → `./lib.mjs` — No matching file among common JS/TS/JSON/index candidates
- `backend/utils/io.js:6` → `./utils/io.js` — No matching file among common JS/TS/JSON/index candidates
- `backend/routes/healthRoutes.js:10` → `../middleware/replicaSetHealth.js` — No matching file among common JS/TS/JSON/index candidates
- `backend/routes/v2.js:6` → `./v2/authRoutes.js` — No matching file among common JS/TS/JSON/index candidates
- `backend/routes/v2.js:7` → `./v2/carRoutes.js` — No matching file among common JS/TS/JSON/index candidates
- `backend/controllers/lowCodeController.js:799` → `./api` — No matching file among common JS/TS/JSON/index candidates
- `runbooks/stage5f5-admin-governance-20261020/harness/role_api_5f5.mjs:4` → `./lib.mjs` — No matching file among common JS/TS/JSON/index candidates
- `runbooks/stage5f5-admin-governance-20261020/harness/ui_5f5_admin.mjs:6` → `./lib.mjs` — No matching file among common JS/TS/JSON/index candidates
