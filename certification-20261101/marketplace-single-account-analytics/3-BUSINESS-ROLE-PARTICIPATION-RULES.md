# 3. Business-role participation rules report

## Rules now enforced (all admin-controlled; none automatic)
1. **Registering never grants a business role.** New accounts are buyers. Dealer, inspector, staff roles come only from staff decisions.
2. **Applications attach to the same user.** Dealer: `dealers`/`dealer_verifications` keyed by user id; inspector: `InspectorApplication.user`; private seller: `private_seller_capabilities.user_id`. Business *profiles* (`dealers`, `inspection_providers`) are separate rows from the identity.
3. **Pending grants nothing.** Pending dealer/inspector/private-seller applications confer no permission; the capability view reports `granted:false`.
4. **Approval grants only that role's capabilities** (dealer: `role=dealer` via the atomic DB function; inspector: `ghost_checker` + provider row + a single verified `pre_purchase_inspection` capability).
5. **Rejection never disables ordinary use.** Dealer rejection for a buyer leaves `users.status` and role unchanged; inspector rejection edits only the application; private-seller rejection leaves buyer intact and allows re-application.
6. **Data is preserved** when a capability changes (no delete paths are involved; tests assert user id, name, e-mail, phone and the private-seller row are unchanged after inspector approval).
7. **No self-grant and no unrestricted role switching.** No endpoint accepts a role from the client; the capability endpoint is GET-only (POST/PUT/PATCH/DELETE return 404 - tested). Approving one's own application is refused (403).

## Administrator controls (existing)
- Dealer onboarding mode (closed / approval required / self onboarding) and decision authority (owner-only etc.): Settings -> Onboarding.
- Dealer paperwork (off / optional / required per document, revisioned, audited): Settings -> Onboarding -> Dealer paperwork.
- Private-seller registration (enabled/disabled) and review queue: Private Seller Applications.
- Inspector applications: Inspector Apps (review roles: admin, superadmin, hr, technical_support).
- Analytics collection switch and retention days live in the `analytics_settings` entry of `system_settings` (see report 5; no UI toggle was added).

## Gaps (honest)
- A new configurable "inspector requirements" policy (documents/verification toggles like dealer paperwork) was **not** built; inspector eligibility remains the existing application form + reviewer decision.
- One user cannot hold both `dealer` and `ghost_checker` roles at once (single role column).
