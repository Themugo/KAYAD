# KAYAD Stage 5F.11 — Dealer business-flow audit

**Foundation:** Stage 5F.9 ZIP, SHA-256 `4aa39fb76bbf598a266953b47f8c08eb7cd99ff41fb6bac7aa9e82d16bfd737d`.
**Scope:** dealer dashboard, inventory/listings, auction operations, dealer onboarding/verification, business account controls, team/staff access, finance/escrow, inspection, leads/customer communications, marketing, analytics and cross-role dependencies.
**Evidence basis:** static source inspection of the extracted project. Dependencies are not installed in this workspace; this is not a runtime or hosted audit.

## Business-flow map

1. **Dealer acquisition:** account creation/authentication → dealer onboarding form → business/location and identity/tax/registration evidence → payment settlement details → submission → admin verification queue → approve/reject → server-enforced dealer capabilities.
2. **Dealer business identity:** dealer profile and locations → verification state → package/plan entitlements → listing and auction capability gates → account/plan status presentation.
3. **Inventory:** create listing → vehicle details/specifications → images/documents → price → publish/review → edit/promote → archive/sold lifecycle → buyer discovery → inquiry/lead.
4. **Auction:** choose eligible vehicle → configure auction and reserve terms → validate readiness → publish/start/schedule → live bids and auto-bids → close/winner → payment/escrow → inspection/fulfilment/ownership. The private-seller custody gate is a separate incomplete workstream and must not be assumed to secure dealer auctions automatically.
5. **Sales CRM:** inquiry → assignment/contact → negotiation/reservation → conversion or loss → customer history. Dashboard should show source-backed counts, stale lead indicators and next action; no fake lead scores.
6. **Staff:** dealer owner invites staff → role/permission assignment → invitation acceptance → active membership → scoped access → suspension/removal → audit trail. Backend must derive dealer organization and enforce tenant scoping for every call.
7. **Finance and escrow:** loan/finance applications, dealer proceeds, transaction fees, escrow views and settlements. Display values only from canonical financial services; distinguish pending/available/settled/held amounts.
8. **Inspections:** create/request inspection → provider assignment → schedule → report → dispute/reinspection. Provider inspection capability is not equivalent to vehicle custody capability.
9. **Business controls:** business profile, locations, documents, package entitlement, verification status, operating settings, notifications and audit events should be accessible in one coherent settings/control area.
10. **Analytics/marketing:** reporting and campaigns must distinguish persisted campaign configuration from measured delivery/performance. No impressions, clicks, conversion rates or ROI unless the underlying tracking pipeline exists.

## Strengths to retain

- The active dealer dashboard is a substantial integrated workspace with inventory, leads/pipeline, customers, escrow, marketing, auctions, finance, inspections, team, reputation, analytics and settings sections.
- It lazily loads many sections from dealer-scoped API clients rather than hardcoding all views.
- Source comments document prior removal of fabricated leads, marketing metrics and fallback dashboard numbers.
- Dealer onboarding is a four-step business/payments/documents/review flow and explicitly treats the URL `complete=1` flag as presentation only, not approval proof.
- Admin dealer verification has search, status filtering, detail review and approve/reject confirmation flows.
- Team management has invite, role, permission, suspend/reinstate and remove interactions.

## Findings and risks

### D-1 — Dashboard information architecture is broad but not prioritized (UX, high)
Fourteen navigation sections are shown in a single list; business-critical actions (verification blockers, inventory requiring correction, expiring package, pending auction readiness, unanswered inquiries, unsettled transactions) are not grouped into a clear actionable queue. The account/plan card is currently a static “Plan information is not available” display with a dead-looking “Plan unavailable” button.

### D-2 — Responsive navigation and overview layout need polish (UX, high)
The original dashboard uses a fixed-width desktop sidebar and fixed four-column/two-column grids. It was not optimized for phone widths. Updated this source to stack the shell on small screens, allow horizontal navigation scrolling, make KPI and lead-pipeline grids responsive, and remove the inert plan button.

### D-3 — Missing metrics can be mistaken for real zeroes (data truth, high)
The overview KPI values previously defaulted missing totals to `0`, including revenue. A missing field and a true zero are not the same state. Updated the four overview KPIs to show an em dash for absent fields while preserving actual numeric zeroes.

### D-4 — Admin verification load failure was rendered as an empty queue (operations, high)
`AdminDealerVerifications` caught list errors by replacing records with an empty array. That made a backend/permission/schema failure look like “no pending dealers.” Updated it to retain existing items and display an explicit error with retry.

### D-5 — Rejection action lacked a required reason in the client (governance, high)
The API was called with a generic fallback when rejection notes were empty. Updated the UI to require a specific reason before a rejection action and show action errors instead of silently only logging them in development. Backend validation must still enforce this.

### D-6 — Approval copy implies a broad side effect (business/control, high)
The admin confirmation text says approving a dealer “will approve the dealer, publish all their pending listings, and notify them.” This is a high-impact bundled operation. Confirm the backend's actual transactional semantics and whether every pending listing is eligible; prefer distinct, auditable dealer approval and per-listing publication/readiness decisions. This stage does not alter that backend behavior.

### D-7 — Onboarding has high-sensitivity payout and identity data (privacy/security, high)
The form collects bank account, M-Pesa, national ID, KRA PIN and business-registration information. Audit the exact storage encryption, access policy, masking, logging, retention and provider disclosure before launch. Never include raw identity or payout values in analytics, logs, staff listings or browser persistence. Source inspection alone does not prove those controls.

### D-8 — Onboarding completion and approval state must stay server-authoritative (security, high)
The completion screen uses the server-reported `user.status` for approval (good), but verify that the status refreshes after submission and that all dealer-only API routes enforce approval independently of UI. Do not trust a stale auth context for permission to list, publish, bid, manage staff or receive funds.

### D-9 — Team role and permission editor needs tenant/isolation tests (security, high)
The UI sends role and permission updates and updates its local list after a successful response. Server-side organization membership, allowed role ceiling, last-owner protections, permission allowlists, audit events, invitation expiry and cross-dealer denial must be tested against real persistence. Client role defaults are convenience, not authority.

### D-10 — Account/business settings are fragmented (UX, medium)
Profile, package, staff, verification, payout details and operational preferences appear in separate destinations. Consolidate them under a structured Business Controls area while retaining the existing routes and service contracts.

### D-11 — Section refresh and stale-data behavior needs a consistency policy (data, medium)
Several sections lazy-load once and cache local state. Ensure successful mutations invalidate relevant counts and related sections (listing totals, auction status, lead counts, team roster, package state). Provide explicit refresh and last-updated/error indicators for business-critical sections.

### D-12 — Auction readiness and inspection/custody are not yet one evidenced business flow (workflow, high)
Dealer auction inventory, inspection orders, finance and escrow have dashboard entry points, but a complete vehicle-to-auction readiness checklist and buyer fulfilment chain must be validated through real backend routes. Do not infer custody from an inspection result or financial escrow.

### D-13 — Analytics semantics require contract-level validation (data, medium)
Overview and analytics sections consume API responses, but this audit did not execute the backend or validate each metric's definition/timezone/aggregation. Confirm that revenue means settled dealer revenue and that view/lead/sales counts are scoped to the correct dealer and reporting period.

### D-14 — Staff onboarding lifecycle is incomplete unless invitation delivery and acceptance are tested (workflow, high)
The UI offers invite and role assignment, but source inspection does not prove end-to-end delivery, one-time token expiry, acceptance, resend, duplicate invitation handling, account linking, suspension enforcement across existing sessions or audit completeness.

## Source edits made in this stage

- Responsive dealer dashboard shell/navigation and KPI/overview grids.
- Absent overview KPI fields display `—` rather than a fabricated zero.
- Removed inert “Plan unavailable” button in favor of an explanatory account-status card.
- Admin dealer verification load failures are visible with retry instead of masquerading as an empty queue.
- Rejection requires a specific reason in the UI; action failures are displayed to the reviewer.

## Not changed / requires explicit next implementation

No database schema, provider contract, payment behavior, approval backend semantics, dealer entitlements or authorization rules were changed. The audit did not establish live provider behavior, production schema parity or real browser journeys. Do not infer that the listed risks are fixed solely because the UI now displays them more clearly.
