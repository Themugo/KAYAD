# KAYAD Personal Account — Listing Lifecycle, Photo Management & Performance Audit

Date: 16 November 2026

## Scope
Continued page-by-page audit from the latest Personal Account Page-by-Page Audit ZIP. This pass focused on My Vehicles, photo management, listing lifecycle and personal listing performance. No database schema, API route, authentication role, or business ownership changes were made.

## Implemented

### 1. Personal listing photo manager
- Added a photo manager to each existing personal listing card in `PersonalSellingModule.tsx`.
- Uses existing `addCarImages`, `deleteCarImage`, and `setCoverImage` service functions and existing authenticated backend routes.
- Enforces the existing client-side JPEG/PNG/WebP, 5 MB per file and 20-photo per-listing limits.
- Allows adding photos, removing a photo with confirmation, and choosing the cover image.
- Prevents removing the final remaining image from the listing UI.
- Shows busy, success and error states and refreshes the canonical DashboardHub listing data after a successful operation.
- Backend ownership/permission checks remain authoritative; no new bypass was introduced.

### 2. Personal performance page
- Added a dedicated compact Performance section in `DashboardHub.tsx`.
- Displays totals derived only from the authenticated personal listing collection: listing count, recorded views, active listings and sold listings.
- Does not reuse dealer analytics or aggregate other users' records.
- Enquiry and conversion metrics are explicitly marked unavailable because the inspected personal-account API does not expose an authoritative personal seller-enquiry aggregate. Messages remain linked as the supported action.
- Renamed the navigation label from Listing quality to Performance. Listing quality scoring remains within My Vehicles.

## Audit findings retained as blockers

### Listing lifecycle
The inspected personal car routes expose create, update, soft-delete, image upload, image deletion and cover selection. The dealer-only mark-sold route is protected by dealer verification. No verified personal-owner endpoint for pause, resume, withdraw, or mark-as-sold was found in the inspected route set. These actions were deliberately not wired to dealer endpoints or simulated with a generic update. A dedicated owner-authorized lifecycle API and explicit allowed-transition policy are required before exposing these controls.

### Seller enquiries and conversion
The generic `/api/leads` API exists, but the inspected source does not establish that it returns a personal user's seller enquiries with correct participant ownership and privacy filtering. The current `/api/leads/mine/offers` endpoint is negotiation-oriented and is not a complete seller-enquiry aggregate. No enquiry counts or conversion percentages were fabricated.

### Performance analytics
Recorded `views` are available on each owned listing and can be safely summed from the canonical personal listing response. Click-to-contact, enquiry conversion, response time and traffic trend data are not currently proven available for the personal account. Those remain unavailable pending a scoped owner analytics endpoint.

## Validation
- New photo/performance source contract validator: 12/12 passed.
- Unified personal dashboard consolidation validator: 22/22 passed.
- Personal account page audit validator: 21/21 passed.
- Unified mobile menu validator: passed.
- Unified personal account mobile dock validator: 8/9; one legacy assertion still expects the retired `seller-platform` destination rather than the unified dashboard create-listing destination.
- Older unified dashboard design validator: 17/20; three assertions still expect the former standalone seller page shell and must be updated to the approved embedded-module architecture.
- Full Vite build, TypeScript project check, runtime tests and browser testing were not run because dependencies are not installed and available Node is 22.16.0 while the project requires >=22.22.2.

## Release position
Photo management and real-data performance summary are implemented. Full listing lifecycle controls and seller enquiry analytics remain blocked by missing verified personal-owner API contracts. Do not claim full lifecycle or production certification until those backend contracts and runtime tests are completed.

No commit, push, deployment or database migration was performed.
