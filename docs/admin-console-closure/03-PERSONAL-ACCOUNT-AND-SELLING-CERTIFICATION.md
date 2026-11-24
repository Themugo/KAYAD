# 03 — Personal account and selling lifecycle

## Model (preserved)
Unified personal account `role=user` buys and sells. No `individual_seller` self-registration, no Private Seller category/approval, no fees/packages. Dealers are a separate business identity requiring approval.

## Purity (read-only investigation — NOT modified)
Purity is a legacy `individual_seller` row. The admin UI previously rendered the legacy `users.status` of such rows as "Pending approval", which read like a seller-approval requirement. Under the current policy (`privateSellerApprovalMode` ≠ "required") `resolveSellerState` returns approved/policy_default, so Purity may list without any approval. Her account, listings and capability data were **not touched**; no suspend, re-approval or recreation was performed.

## Admin Users now distinguishes
account type · account status (active/restricted/banned) · email verification · dealer onboarding approval (dealer rows only) · listing moderation (separate page) · historical application (capability table, optional).

## Approval setting audit
Setting `privateSellerApprovalMode` only influences `resolveSellerState`; when not "required" nothing blocks selling. No data deleted; legacy rows remain readable.

## Evidence
Journey 30 (62/62) covers personal list/search/filter, suspend/restore with session revocation, dealer exclusion; journeys 24/26; Vitest `adminTables.test.jsx`, `AdminPersonalAccounts.test.tsx`.
Level: ISOLATED-DB TESTED. Hosted: table `private_seller_capabilities` absent (13) — page designed to work without it.
