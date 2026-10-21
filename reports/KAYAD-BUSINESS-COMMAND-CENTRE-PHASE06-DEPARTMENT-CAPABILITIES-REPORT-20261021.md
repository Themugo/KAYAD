# KAYAD Business Command Centre — Phase 06
## Departmental Operations and Business Capability Convergence

**Foundation archive:** `KAYAD-BUSINESS-COMMAND-CENTRE-PHASE05-REAL-HEALTH-PROVIDERS-20261021.zip`  
**Foundation SHA-256:** `ab1658c46896b25fb518a73ec873e966bd37660cf3e51559d52efca84f24560a`

## Executive decision

Phase 06 adds a read-only, source-audited departmental capability matrix to the existing `AdminView` Command Centre. It does not create department-specific backend APIs, domain models, tables, migrations, financial totals, or duplicate records. Canonical pages and APIs remain the source of business behavior.

**Runtime/release status: NOT CERTIFIED.** Source-level validators passed, but Vitest and Vite are not installed, dependencies are absent, and the available Node version (`v22.16.0`) is below the repository's declared requirement (`>=22.22.2`). No department is classified `IMPLEMENTED AND VERIFIED` because this phase could not run the full application, API integration or browser tests.

No deployment, financial data migration, production data mutation or permission/role change was performed.

## Foundation verification

The SHA-256 of the Phase 05 ZIP was recomputed before extraction and matched the adjacent checksum file exactly. Changes were made only in an extracted working copy.

## Implementation summary

### Files changed

- `src/features/AdminDepartmentCapabilities.tsx` — new source-audited matrix covering the eight requested departments, capability classifications, evidence/source notes, access-boundary notes and links to existing canonical admin routes. It does not fetch data or invent operational metrics.
- `src/features/AdminView.tsx` — mounts the matrix as an owner-only `Departments` module in the existing Command Centre. The display gate requires `sessionUser.isOwner === true`; existing backend route guards remain authoritative.
- `src/__tests__/features/adminCommandCentre.test.tsx` — tests owner-only visibility, forged owner marker rejection, capability classification, route links and no-fake-data/security messaging.
- `scripts/validate-phase06-department-capabilities.mjs` — source-contract validator for the matrix, canonical route map, no new backend API, finance guard preservation and security caveats.
- `package.json` — adds `validate:phase06:departments` script.

No backend routes, services, database schemas, migrations, role grants, ledger behavior or financial business rules were changed.

## Department capability matrix

| Department | Capability | Classification | Evidence / limitation |
|---|---|---|---|
| Sales & Orders | Listing and vehicle administration | IMPLEMENTED BUT UNVERIFIED | Existing `/admin/cars`, `/admin/moderation`, `/api/cars` and related listing routes. |
| Sales & Orders | Transaction oversight | IMPLEMENTED BUT UNVERIFIED | `AdminTransactions`; `/api/payments` and `/api/transactions`. |
| Sales & Orders | Auction operations | IMPLEMENTED BUT UNVERIFIED | Existing auction administration, settlement and fulfilment routes. |
| Sales & Orders | Unified order-management lifecycle | PARTIAL | Transaction, marketplace fulfilment and auction fulfilment are separate domains; no single end-to-end order lifecycle was established. |
| Accounting & Finance | Payment/transaction oversight | IMPLEMENTED BUT UNVERIFIED | Existing transaction UI and payment/transaction APIs. |
| Accounting & Finance | Escrow and custody | IMPLEMENTED BUT UNVERIFIED | `AdminEscrows`, escrow/custody APIs and existing financial invariants. |
| Accounting & Finance | Ledger and reconciliation | IMPLEMENTED BUT UNVERIFIED | `/api/ledger`, `/api/reconciliation`, `/api/finance`; ledger writes require `MANAGE_FINANCE`. |
| Accounting & Finance | Certified financial close and unified reporting | PARTIAL | No full runtime/database/separation-of-duties certification in this checkpoint. |
| Technical Operations | Platform health/provider governance | PARTIAL | Health and provider-governance sources exist; active health-view composition and runtime certification remain unresolved in the Phase 05 report. |
| Technical Operations | Operations control room | IMPLEMENTED BUT UNVERIFIED | `/admin/control-room` is registered as Super Admin only. |
| Technical Operations | Security log | IMPLEMENTED BUT UNVERIFIED | Existing security-log page and security/audit routes. |
| Technical Operations | Incident lifecycle/on-call acknowledgement | NOT IMPLEMENTED | No verified end-to-end incident ownership and acknowledgement contract established. |
| Inspections | Inspection operations | IMPLEMENTED BUT UNVERIFIED | Existing inspection page and canonical inspection route family. |
| Inspections | Inspector application review | IMPLEMENTED BUT UNVERIFIED | Dedicated page and `/api/inspector-applications`. |
| Inspections | Vehicle/document verification | IMPLEMENTED BUT UNVERIFIED | Existing NTSA verification queue and APIs. |
| Inspections | End-to-end inspection SLA reporting | PARTIAL | Inspection and analytics sources exist, but no certified cross-stage SLA contract was established. |
| Support & Disputes | Support workspace and tickets | IMPLEMENTED BUT UNVERIFIED | `AdminSupportWorkspace`, support-ticket and support-dashboard routes. |
| Support & Disputes | Dispute workflow | IMPLEMENTED BUT UNVERIFIED | Protected `/api/disputes` and canonical escrow-centric dispute UI exist. Legacy `AdminDisputes` is not a separate registered route. |
| Support & Disputes | Feedback/conversation moderation | IMPLEMENTED BUT UNVERIFIED | Existing feedback/chat moderation pages and route families. |
| Support & Disputes | Unified case-resolution SLA analytics | PARTIAL | Support analytics and disputes exist separately; unified case correlation is not verified. |
| Marketing & Communications | Templates, controls and delivery history | IMPLEMENTED BUT UNVERIFIED | `/api/communications/admin/*` and `AdminCommunications`. |
| Marketing & Communications | Provider governance | IMPLEMENTED BUT UNVERIFIED | Existing provider-governance component and provider health/governance contracts. |
| Marketing & Communications | Broadcast/ad placement | IMPLEMENTED BUT UNVERIFIED | Existing broadcast and ad-manager pages/routes. |
| Marketing & Communications | Campaign attribution and ROI | PARTIAL | Campaign-adjacent models and analytics exist, but a single verified campaign attribution/ROI contract was not established. |
| Administration | Staff and permission governance | IMPLEMENTED BUT UNVERIFIED | Existing staff pages, role/permission utilities and admin RBAC APIs. |
| Administration | Owner management | IMPLEMENTED BUT UNVERIFIED | Existing owner-management page and owner-only route guard. |
| Administration | Platform settings | IMPLEMENTED BUT UNVERIFIED | Existing settings page and configuration routes. |
| Administration | Certified department-level access matrix | PARTIAL | Roles and route guards exist, but authorization is not uniformly expressed as a department-capability contract. |
| Reporting & Analytics | Submitted report moderation | IMPLEMENTED BUT UNVERIFIED | `AdminReports` and `/api/reports`; this is user-submitted report handling, not proof of unified analytics. |
| Reporting & Analytics | Sales/operations analytics APIs | IMPLEMENTED BUT UNVERIFIED | `/api/v1/analytics/sales`, `/api/operations-dashboard` and executive analytics routes. No unified owner-facing analytics page was verified. |
| Reporting & Analytics | Finance reconciliation reports | IMPLEMENTED BUT UNVERIFIED | `/api/finance`, `/api/reconciliation`; escrow operations exposes reconciliation exceptions. |
| Reporting & Analytics | Cross-department reporting semantic model | NOT IMPLEMENTED | No shared metric definitions and cross-domain aggregation contract found. Do not sum UI samples into financial reports. |

These classifications describe code and contract evidence, not live service status. All existing capabilities remain unverified at runtime in this environment.

## Integration map: UI → route/API → domain/data evidence

| Domain | Canonical UI surfaces | Backend API/route families | Data/domain evidence | Access notes |
|---|---|---|---|---|
| Sales/listings/orders | `/admin/cars`, `/admin/moderation`, `/admin/transactions`, `/admin/auctions` | `/api/cars`, `/api/transactions`, `/api/payments`, auction/marketplace fulfilment routes; `/api/v1/analytics/sales` | Existing car/auction/transaction/payment domain services and models | Existing route-level middleware preserved; no new order entity introduced. |
| Finance | `/admin/transactions`, `/admin/escrows`, `/admin/settings` | `/api/finance`, `/api/ledger`, `/api/reconciliation`, `/api/escrow`, `/api/payments` | `LedgerEntry`, `EscrowAccount`, `ReconciliationRecord`, `ReconciliationReport`; existing escrow and transaction migrations | `ledgerRoutes.js` applies `MANAGE_FINANCE` to writes. Ledger reads use `adminOnly`; finance routes allow `admin`/`superadmin`; reconciliation allows `admin`, `superadmin`, `finance`, `accounts`. These are not uniform controls. |
| Technical operations | `/admin/control-room`, `/admin/security-log`, `/admin/provider-governance`, `/admin/settings` | `/api/operations-dashboard`, `/api/reliability`, `/api/security-logs`, `/api/audit`, `/health` | `OperationLog`, `SecurityLog`, configuration and health services | Control room and several platform tools are Super Admin only; API authorization remains authoritative. |
| Inspections | `/admin/inspections`, `/admin/inspector-applications`, `/admin/ntsa-queue` | `/api/inspection`, `/api/inspections`, `/api/inspector-applications`, `/api/ntsa-verification` | `Inspection`, `InspectionOrder`, `InspectorApplication`; inspection SQL schema and Supabase inspection/RLS migrations | Existing inspection ownership, role and RLS controls retained. |
| Support/disputes | `/admin/support`, `/admin/support-tickets`, `/admin/feedback`, `/admin/chats`, `/admin/escrows` | `/api/support`, `/api/admin/support-tickets`, `/api/support-dashboard`, `/api/disputes`, `/api/feedback`, `/api/chat` | `SupportTicket`, `Feedback`, `Chat`, escrow/dispute records; support ticket and resolution migrations | Support dashboard uses `requireSupportViewer`; dispute routes retain protected/idempotent/CSRF middleware where mounted. |
| Marketing/communications | `/admin/communications`, `/admin/provider-governance`, `/admin/broadcast`, `/admin/ads`, `/admin/cms` | `/api/communications`, `/api/communications/webhooks`, `/api/ads`, `/api/announcements`, `/api/cms` | `Campaign`, `CMSCampaign`, `Audience`, `PlatformTemplate`; communications/content schemas and control-plane migrations | Admin provider/template controls use `protect` + `adminOnly`; campaign lifecycle/ROI is not certified by this matrix. |
| Administration | `/admin/staff`, `/admin/staff-permissions`, `/admin/owners`, `/admin/settings`, `/admin/security-log` | `/api/admin`, `/api/organizations`, `/api/config`, `/api/audit`, identity routes | `User`, `Organization`, `ConfigEntry`, `SecurityLog`; identity/governance schemas | Staff/owner pages have Super Admin route guards; UI visibility does not grant backend permissions. |
| Reporting | `/admin/reports`, `/admin/market-data`, `/admin/transactions`, `/admin/escrows` | `/api/reports`, `/api/finance`, `/api/reconciliation`, `/api/v1/analytics/sales`, `/api/operations-dashboard`, executive analytics | `Report`, `IntelligenceReport`, finance/reconciliation models | Report moderation and business analytics are distinct; no second reporting database was added. |

The inventory references existing models/schemas/migrations only. This phase does not create or alter any of them.

## RBAC and security findings

1. **Owner matrix is presentation-only and owner-gated.** The new tab is rendered only when the authenticated frontend user has `isOwner === true`. Each destination remains protected by the existing canonical route guard and backend endpoint authorization. This does not replace API checks.
2. **Finance authorization is not uniform.** Ledger writes have the explicit `MANAGE_FINANCE` permission; ledger reads are protected by `adminOnly`. Finance routes permit `admin`/`superadmin`, while reconciliation permits `admin`/`superadmin`/`finance`/`accounts`. Review least privilege and read/write separation before release.
3. **Super Admin visibility does not remove audit or separation-of-duties requirements.** The capability matrix does not change the owner/superadmin model, role catalog or permission grants.
4. **No new business logic was added.** The matrix has no API requests, operational counts, financial calculations, write controls or new data store.
5. **Department names are not capability proof.** “Sales”, “Accounting”, “Marketing” and “Reporting” are organizational groupings for existing pages and services, not a claim that full ERP/CRM/campaign/financial-close subsystems are complete.
6. **Canonical route accuracy.** Every route linked from the matrix was checked against `ADMIN_ROUTE_COMPONENTS`. The legacy `AdminDisputes` component is not a separate route; dispute operations remain associated with the existing escrow-centric workflow.

## Missing capabilities and future contracts

No new backend capability or migration was implemented because the requirement says to stop for a design/security decision if a new domain is necessary.

1. **Unified order lifecycle (design decision required):** define whether marketplace purchases and auction fulfilment share an order aggregate or remain separate. Specify canonical identifiers, state transitions, payment/escrow linkage, idempotency, actor authorization, audit and reconciliation before schema/API work.
2. **Financial close and department-level financial permissions (security decision required):** define separation of duties between transaction read, ledger entry, reversal, reconciliation execution, issue resolution, escrow release/refund and payout settlement. Decide exact roles/permissions and audit requirements before changing grants or endpoints.
3. **Incident management (product/security contract required):** define incident identity, severity, ownership, acknowledgement/escalation, audit trail, retention and safe notification behavior. Do not present existing health rows as a complete incident-management system.
4. **Unified support/dispute analytics (data contract required):** define safe cross-reference between ticket, conversation, escrow dispute and resolution records without duplicating case data or bypassing party-access restrictions.
5. **Campaign attribution and ROI (marketing/data contract required):** define canonical campaign/event identifiers, attribution window, consent/privacy rules, source events and finance-reconciled cost/revenue. Do not calculate ROI from unrelated metrics.
6. **Cross-department reporting (metric governance required):** define metric ownership, calculation semantics, currency/time-zone handling, freshness, source-of-truth, permissions and financial reconciliation. No UI aggregation or sample totals should substitute for this contract.
7. **Runtime certification:** install dependencies under Node `>=22.22.2`, run full typecheck/build, Vitest, backend API tests and Playwright/browser journeys in an isolated environment.

## Validation results

### Passed

- `npm run validate:phase06:departments` — **14/14 PASS**.
- TypeScript `transpileModule` syntax checks for `AdminDepartmentCapabilities.tsx`, `AdminView.tsx` and `adminCommandCentre.test.tsx` — **3/3 syntax checks PASS**.
- `node scripts/validate-navigation-convergence.mjs` — **43/43 PASS**.
- `node scripts/validate-ui-surface-convergence.mjs` — **9/9 PASS**.
- `node scripts/validate-stage5f2-dashboard-data-workflow.mjs` — **11/11 PASS**.
- `node scripts/validate-owner-identity-convergence.mjs` — **7/7 PASS**.
- `node scripts/validate-master-identity-authz-corrections.mjs` — **14/14 PASS**.
- `node scripts/validate-canonical-architecture.mjs` — **PASS**.
- `node scripts/validate-communications-initiative.mjs` — **PASS**.
- `node scripts/validate-transaction-integrity.mjs` — **14/14 PASS**.
- `node scripts/validate-inspection-marketplace.mjs` — **37/37 PASS**.
- `node scripts/validate-dispute-integrity.mjs` — **11/11 PASS**.

### Blocked / not certified

- Targeted Vitest suite `src/__tests__/features/adminCommandCentre.test.tsx` — **BLOCKED**, `vitest: not found` because dependencies are absent.
- `npm run lint` / TypeScript typecheck — **BLOCKED/FAILED in incomplete environment**; React, React types and other dependencies are missing. The global compiler reports repository-wide missing-module/type errors, so this is not a clean project typecheck.
- `npm run build` — **BLOCKED**, `vite: not found`.
- API integration/database tests and Playwright/browser tests — **NOT RUN** because the project dependencies/runtime are not installed.
- Runtime Node version is `v22.16.0`; `package.json` requires `>=22.22.2`.

No live production API calls were made. Source validators do not certify live RBAC, financial correctness or production operation.

## Release decision

**Phase 06 is a source-level capability-convergence checkpoint, not production-certified.** The owner-facing matrix is integrated into the existing Command Centre, links to canonical routes, and identifies gaps without fabricating capabilities or records. Runtime, browser and full type/build certification remain outstanding.
