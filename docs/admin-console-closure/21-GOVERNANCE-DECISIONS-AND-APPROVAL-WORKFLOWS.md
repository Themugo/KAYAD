# 21 — Governance decisions and approval workflows (OD-1 … OD-4)

> **Superseded in part 2026-11-24 (final closure):** see docs 28 (write authorization register), 29 (security/governance closure), 30 (migration parity and restore) and 31 (gates and regression). Where this document disagrees, the newer document wins: System Health is now technical-only (OD-1 hardened), the any-staff write-route residual is closed except UD-1 and OD-5, and the earlier "transition_escrow absent" wording is corrected.

Evidence level: **LOCAL + DISPOSABLE-DB** (journey `33_governance_decisions` 70/70, `32_route_api_authorization` green, backend Jest matrix green, vitest). Not production verified. Migration `20261124130000_dealer_reinstatement_requests.sql` is **not applied to any hosted database**.

## OD-1 System health access

* Endpoints: `GET /api/admin/system/health` (admin router) and `GET /api/ecp/health`, `GET /api/ecp/health/:serviceId` (ECP router). The rest of the ECP router keeps its existing role gate; only the health routes were pulled out and guarded.
* **Exact permission: `view_system_health`** (constant `PERM.VIEW_SYSTEM_HEALTH`; label "View System Health", group Operations). It is declared in `backend/config/roles.js`, mirrored in `backend/middleware/rbac.js` (`PERMISSIONS.VIEW_SYSTEM_HEALTH`) and `src/utils/permissions.ts`.
* Why not an existing permission: the only existing technical permission, `view_logs`, is held **by default** by moderator, hr, escrow_officer, accounts and technical_support. Reusing it would have granted health to all technical-support staff and to non-technical roles, which OD-1 forbids. The new permission is *narrow*: held by **no role**, listed in `ASSIGNABLE_PERMISSIONS` only, so it can only be granted to an individual through the existing per-user `granted_permissions` mechanism (and removed with `revoked_permissions`). Super Admin keeps it through the existing "superadmin gets everything" rule. No role was created and no role was auto-granted.
* Backend: `requirePermission(PERMISSIONS.VIEW_SYSTEM_HEALTH)`; frontend: the tile renders only when `userHasPermission(user, PERM.VIEW_SYSTEM_HEALTH)` (a refusal in the Enterprise Control Center no longer aborts the rest of the page).
* Evidence (journey 33 A1–A5, both endpoints): anonymous 401; personal, dealer owner, dealer staff, moderator, ordinary Admin, technical_support without the grant, technical_support with grant then revoke → **403**; owner Super Admin, second Super Admin, technical_support with the grant, **and a moderator with the grant (permission, not role name, decides)** → 200. `view_logs` does not unlock health. The permission is assignable, labelled, and in no role list except superadmin's all-permissions.
* Owner action: to give a named technical person access, grant `view_system_health` to that user in Staff Permissions.

## OD-2 Dealer reinstatement requires Super Admin approval

Design (no new table; the existing suspension-request infrastructure is extended): table `dealer_suspension_requests` gains `request_type` (`suspension`|`reinstatement`) and `related_request_id` (the approved suspension record being reversed), and the reason-category list is widened (issue_resolved, documents_verified, suspension_in_error, appeal_upheld). The existing one-pending-per-dealer partial unique index, decision check constraints and no-self-decision check apply to both types.

* `POST /api/verification/admin/:id/reinstate-request` (ordinary Admin only): dealer must currently be suspended (else 409 `DEALER_NOT_SUSPENDED`); records dealer, verification, linked suspension request, category, reason (≥10 chars), evidence reference, requester, timestamp. The dealer **stays suspended**.
* Decision: `POST /api/verification/admin/suspension-requests/:id/decision` (Super Admin only). Approve restores access through the existing `applyVerificationTransition` (`suspended → approved`, `users.status`, `dealers.is_suspended`, notifications). Reject requires a reason and leaves the dealer suspended; the Admin may then submit a new request.
* Controls proven by journey 33: duplicate pending request 409; second request by another Admin 409; wrong-state requests 409; short reason 400; Admins only see their own requests, Super Admins see all with the suspension history link; only the requester can cancel; replayed approval 409; reject-after-approve 409; **four simultaneous decisions (two Super Admins, approve/reject) → exactly one 200 and the dealer state matches it, one `decided_by`**; the decision is atomic (claim of the pending row; on apply failure it reverts to pending); audit rows `dealer_reinstatement_requested` / `_request_approved` / `_request_rejected` are written.
* **History preserved**: both the suspension and the reinstatement rows remain; dealer, listings (`cars`), team (`dealer_teams`) and user rows unchanged; employee personal accounts are not touched.
* **Bypasses closed**: Admin direct `…/reinstate` → 403 (now Super Admin only, no owner-only gate); Admin `…/approve` on a suspended verification → 403 `REINSTATEMENT_REQUIRES_APPROVAL`; Admin `toggle-ban` un-ban, `approve-dealer` → 403; moderator, personal account, dealer owner, dealer staff, technical staff and anonymous cannot submit or decide.

## OD-3 Any authorised Super Admin may approve suspension or reinstatement

* The owner-only `mayDecide` restriction was **removed from suspension/reinstatement decisions only** (route comment cites OD-3); the decision service requires role Super Admin (`SUPER_ADMIN_REQUIRED`) and forbids self-decision. Ordinary Admin gains nothing; separation of duties is preserved (Admin requests, Super Admin decides).
* Proven with **two distinct Super Admin identities**: the second (non-owner) Super Admin approved a suspension and a reinstatement; `decided_by` equals that identity. The owner Super Admin still approves (C8). Unauthorised Admin and Moderator are refused (D1).
* Not changed: **dealer onboarding approvals** (`approve-dealer`, `verify-dealer`, `/admin/:id/approve` for pending dealers) still follow the owner-controlled onboarding decision policy (`owner_only` by default). That is a different decision domain; OD-3 names only suspension and reinstatement.

## OD-4 Purity (`muhindupurity@gmail.com`) — read-only investigation

**What `users.status` means.** It is a *legacy overloaded* field. For dealers it mirrors dealer verification (`pending/approved/suspended`). For old `individual_seller` accounts it was a *seller-approval flag* (`pending` = awaiting private-seller approval). It is **not** a login or activation flag; login blocking uses `is_banned` and `deactivated_at`.

**Trace of consumers (backend):**
* `middleware/auth.js protect`: loads status into `req.user` but blocks only on `isBanned`, `deactivatedAt`, invalid session, unverified owner identity — **status never blocks a personal account**.
* `requireApproved`: used only by the dealer workspace router (`dealerRoutes.js`); explicitly lets a legacy `individual_seller` with `pending` through unless the owner policy `privateSellerApprovalMode` is `required` (default is not required).
* `services/privateSellerCapability.service.js resolveSellerState`: with approval not required returns `approved (policy_default)`; only `suspended/revoked` (capability row or legacy status) restrict. `pending` is inert. `accountCapabilities.service.js` treats `individual_seller + pending` as active. Listing creation/publication (`sellerCapability` middleware, `carController`), messaging, saved vehicles, and socket auth use the same resolution or do not read the field.
* Admin Personal Accounts API surfaces it as `legacyRecordStatus` (historical), separate from `accountState` (restricted/active from `is_banned`) and `historicalApplication`.

**Hosted read-only facts (2026-11-24, SELECT only):** role `individual_seller`; `users.status = pending`; `is_banned = false`; `email_verified = true`; not deactivated; 1 listing, state `available`; the `private_seller_capabilities` table does not exist on the hosted database.

**Would changing it block her or her listing?** Changing to `approved` would be harmless; leaving `pending` is also harmless under the current policy. But there is a risk path: if the owner ever sets `privateSellerApprovalMode = required`, a legacy `pending` flag would then count as pending. That is a policy decision, not a defect to patch silently.

**Decision: Purity's `users.status` was NOT changed. Her account, listing, role, e-mail verification and application data were NOT modified, re-approved, or recreated.** Correction (if the owner wants the legacy flag normalised) is **BLOCKED pending explicit owner approval** because the field is ambiguous (historical application vs account state) and the fix would be a production data write.

**UI:** the Personal Accounts page already shows "Account" status, "Historical application", and listing counts as separate columns; the legacy value appears only as "legacy record". Canonical model preserved: one personal identity, free buying and selling, no routine seller approval.
