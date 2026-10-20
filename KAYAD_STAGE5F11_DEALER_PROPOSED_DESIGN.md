# KAYAD Stage 5F.11 — Proposed dealer workspace design

## Design principles
- Preserve the existing KAYAD navy/teal visual language and the current dealer dashboard route.
- Make the dashboard an operational command centre, not a wall of equal-weight tiles.
- Put exceptions and next actions first; place trend/analytics after operational queues.
- Keep seller, dealer, provider, buyer and admin roles distinct while sharing visual tokens.
- Use real API values; unknown is `—`, true zero is `0`, denied is “No access”, and failed is an explicit error.
- Use progressive disclosure for finance, staff permissions and business controls.

## Proposed primary navigation
1. Overview
2. Inventory
3. Auctions
4. Leads & Customers
5. Inspections & Fulfilment
6. Finance & Escrow
7. Team & Access
8. Business Controls
9. Analytics
10. Help / Support

This is a grouping of existing capabilities, not permission to delete routes. Existing subsections can remain as tabs or child routes under the groupings after route compatibility is checked.

## Overview page hierarchy
1. **Account readiness strip:** verification state, package/entitlement status, missing documents and clear CTA. No green “verified” badge without a current server status.
2. **Action queue:** listing corrections, auctions blocked by readiness, new inquiries requiring response, inspection appointments, finance requests and payout/escrow exceptions. Each item deep-links to its existing canonical page.
3. **Core KPI row:** live listings, live/upcoming auctions, unanswered inquiries, confirmed sales/settled proceeds. Use selected reporting window and a visible “as of” time.
4. **Work panels:** inventory needing attention, live auctions, lead pipeline and inspection schedule.
5. **Business performance:** trends and vehicle performance with clear metric definitions and time range.
6. **Quick actions:** Add listing, create auction, invite staff, edit business profile. Hide/disable actions based on server-derived permissions and account status.

## Listing management
- Search by registration/VIN fragment, make/model and listing title without exposing full sensitive identifiers unnecessarily.
- Filters: Draft, In review, Needs correction, Published, Reserved, Sold, Archived; verify these against canonical statuses before implementation.
- Bulk operations only for safe actions and with a preview/confirmation. Never bulk-publish unverified vehicles.
- Row-level readiness summary: documents, images, price, inspection and publish status.
- Clear reason codes for blocked publication; preserve drafts and revisions.

## Auction management
- Separate Draft, Readiness blocked, Scheduled, Live, Ended and Cancelled states based on canonical lifecycle values.
- Readiness checklist includes vehicle identity/ownership, photos, required inspection, policy/approval and any required custody state.
- Every start/schedule action must use the authoritative backend gate. UI state is informational only.
- Auction close should link to winner/payment/escrow/inspection/fulfilment state without inventing a completed sale.

## Dealer onboarding and approval
- Four-step progress with saved draft and explicit resume behavior.
- Business identity and beneficial/authorized representative; business contacts and locations; verification documents; payout details in a separately protected section; final review/consent.
- Show why each document is needed, accepted formats, file limits and privacy notice before upload.
- Status timeline: Draft → Submitted → Under review → More information required / Approved / Rejected / Suspended. Confirm actual canonical status enum before wiring.
- Admin review workspace: identity and business evidence, duplicate/risk flags, reviewer assignment, evidence history, notes, reason-required rejection, request-more-information action, decision audit and separate listing readiness.
- Dealer approval must not silently publish every listing unless that is explicitly confirmed as the business rule and the operation is safe, transactional and auditable.

## Staff onboarding and access
- Invite by email, select an allowed role template, show the effective permission summary, and confirm invitation expiry.
- Distinguish Invited, Active, Expired, Suspended and Removed states only if backed by canonical server values.
- Warn on sensitive permissions and restrict changes to the dealer owner/authorized administrator.
- Audit invites, role changes, permission changes, suspension and removal; enforce all permissions on the backend on every request.

## Business controls
- One place for business profile, locations, verification status, documents, package/plan entitlement, payout configuration, notification preferences and account audit log.
- Sensitive payout/identity fields masked by default, re-authentication for high-risk edits where supported, and explicit save confirmation.
- Package availability and limits must come from the entitlement service, not UI constants.

## Responsive and accessibility
- Desktop: compact left navigation and multi-column workspace.
- Tablet: collapsible navigation and two-column panels.
- Mobile: horizontally scrollable primary navigation or menu, single-column cards, sticky primary action where appropriate, no clipped tables, 44px minimum touch targets, visible keyboard focus, meaningful labels and accessible status announcements.

## Acceptance criteria
- No invented dealer metrics or synthetic business activity.
- Every primary action reaches an existing canonical route/service.
- Loading, empty, stale, denied and failed states are distinguishable.
- Seller/dealer identity and tenant scope are server-derived.
- Approval, listing publication, auction activation and finance settlement remain separate audited decisions.
- Desktop/mobile journeys, role matrix, onboarding, approval, staff invite and inventory mutation are covered by tests.
