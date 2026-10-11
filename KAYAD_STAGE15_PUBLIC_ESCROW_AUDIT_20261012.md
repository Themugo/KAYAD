# KAYAD Stage 15 — Public Escrow Services Audit & Convergence

**Date:** 2026-10-12  
**Foundation:** `KAYAD-STAGE14-PUBLIC-SUPPORT-CONVERGENCE-20261012.zip`  
**Foundation SHA-256:** `440f74d8807a30df0cd4f790d4cd0ce0be5ceda182c22dd38dc04b8bbcfc8b36`  
**Outcome:** Source-validated public-surface convergence; not runtime- or production-certified.

## Objective

Keep the public Escrow Services page informational only. Personal transaction records belong in the authenticated buyer/dealer portals; escrow operations belong in a staff-authorized workspace. Preserve existing KAYAD workflows and API contracts; do not create a second escrow implementation.

## Findings and changes

| ID | Finding | Change | Status |
|---|---|---|---|
| ESC-PUB-01 | The public `EscrowView` mixed the public explanation with “My escrow deals” and a staff “Operations” tab. A signed-in user landing on a public page could see private-surface navigation. | Public `EscrowView` now renders only the programme status, public transaction explanation, and public “how a deal starts” guidance. It calls only `getEscrowProgram()` and never requests deal/operations data. | Fixed in source |
| ESC-PUB-02 | The old `src/pages/EscrowPage.jsx` was an unused duplicate containing the unsupported claim that every KAYAD purchase was protected by M-Pesa escrow. It also fetched a signed-in user's escrow records in that duplicate page. | Legacy page now redirects to the canonical `/?nav=escrow` public page. | Fixed in source |
| ESC-PUB-03 | Public copy advertised an automatic-release window from the published `releaseDays` setting. Backend code separately reads `ESCROW_AUTO_RELEASE_DAYS` (default 7), while escrow configuration defaults `releaseDays` to 3. The public setting therefore must not be represented as the effective automatic-release schedule without resolving that mismatch. | Removed the public automatic-release timing promise. Public enabled-state details show the configured funding method and published minimum/maximum instead. The underlying financial behavior was not changed. | Public claim removed; backend policy remains open |
| ESC-PUB-04 | Buyer/dealer transaction details and staff operations were embedded in the public escrow surface instead of their appropriate portals. | `ParticipantEscrowDesk` is now mounted in the buyer “My Garage” portal and a dedicated dealer dashboard Escrow section. `EscrowOperationsDesk` now has a separate `escrow-operations` surface gated by `isStaffRole`; backend authorization remains authoritative. | Relocated; full portal audit still pending |
| ESC-PUB-05 | The primary Escrow navigation dropdown linked to private deals and an internal “How escrow starts” tab from the public navigation. | Escrow is a direct public link to the informational page. Legacy `escrow:deals`, `escrow:create`, `escrow:operations`, and `escrow:journey` values normalize to the public page; they do not expose a private workspace. | Fixed in source |
| ESC-PUB-06 | Shared footers called the service “Escrow Vault,” conflicting with the public page's careful explanation that the service is not represented as a bank or licensed trust account. | Changed the shared public footer label to “Escrow Services.” | Fixed in source |
| ESC-PUB-07 | The public page's transaction step could imply an old Escrow badge alone meant a new purchase remained eligible during a programme pause. | Eligibility guidance now says to check both current programme status and listing eligibility, and explicitly warns that a paused programme does not protect new purchases. | Fixed in source |
| ESC-PUB-08 | The public “Open your dashboard” path did not route to a role-appropriate private workspace. | Buyer/default user → buyer portal; dealer → dealer dashboard; admin/superadmin/escrow officer/accounts → staff escrow operations. Deep-linked `escrowId` remains only a pointer; private data is fetched only after entering the authenticated portal. | Fixed in source |

## Public/private data boundary

- Public page requests: `GET /api/escrow/program` only.
- The public program response is limited to programme enabled state, funding methods, release days, minimum/maximum amount, and currency. This page no longer displays release days as an automatic-release promise.
- Participant escrow records/actions are rendered in `ParticipantEscrowDesk` inside authenticated buyer/dealer surfaces. The backend's participant-scoped `/api/escrow/my` remains the data authority.
- Staff queues, case records, reconciliation, anomaly and money-moving actions are rendered only on the separate `escrow-operations` surface after the frontend staff-role check; backend permission gates still decide access and allowed actions.
- The legacy escrow page no longer loads `escrowAPI.mine` or shows private records.
- No escrow migrations, provider configuration, account numbers, balances, payment records or production data were modified.

## Validation executed

- `validate:public-escrow-boundary`: **14/14 PASS**.
- CMS schema validator: **PASS**.
- Escrow admin control-plane validator: **15/15 PASS**.
- Escrow business-integrity validator: **20/20 PASS**.
- Escrow custody-domain validator: **14/14 PASS**.
- Escrow Operations Center validator: **16/16 PASS**.
- Payment/Escrow domain validator: **9/9 PASS**.
- Changed TS/TSX/JSX syntax transpilation: **13/13 PASS** (includes navigation URL test after the final update).
- Repository JavaScript/MJS syntax check: **1,227/1,227 PASS**.
- `package.json` JSON parse: **PASS**.
- ZIP integrity: checked after packaging.

These validators are source/static checks. They do not establish live backend behavior or production deployment.

## Not run / limitations

- Full Vitest/Jest suite, full TypeScript semantic typecheck, Vite production build, browser/Playwright flows and accessibility checks were not run because `node_modules` is absent in this workspace.
- Available Node is `v22.16.0`, below the repository's required `>=22.22.2`.
- No authenticated live API checks, production role tests, database changes, financial actions, provider calls or real customer transactions were performed.
- The broader buyer, dealer and staff portal audit is not complete. This stage only relocates escrow functions into the appropriate private surfaces and adds the relevant route guards; each portal still needs its own systematic audit.
- The backend automatic-release configuration mismatch remains a financial-policy/runtime issue. No change to auto-release execution was made in this public-page stage.

## Change safety

No commit, push, deployment, migration execution, ledger rebuild, payment, refund, payout, provider transaction or customer message was performed.
