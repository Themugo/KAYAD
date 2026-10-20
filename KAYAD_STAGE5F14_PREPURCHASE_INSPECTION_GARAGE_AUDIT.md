# KAYAD Stage 5F.14 — Pre-Purchase Inspection & Garage Onboarding Audit

**Foundation:** Stage 5F.13 archive SHA-256 `28c18af282c517ed7dbe4ebbd10fbebdbe824b34df960860f4bb0240c51c6387`  
**Status:** PARTIAL — source audit and dashboard error-state polish; no live/runtime certification.

## Existing architecture found

- Public provider discovery/profile/booking: `src/features/InspectionMarketplace`.
- Provider application: `src/features/InspectionsView/ProviderApplicationModal.tsx`.
- Provider Business Center: `src/features/InspectionMarketplace/pages/ProviderBusinessCenter.tsx`.
- Admin provider governance: `src/features/AdminProviderGovernance.tsx` and `src/pages/admin/AdminInspections.jsx`.
- Canonical Phase 22 services/routes: `backend/inspection/services/` and `backend/inspection/routes/phase22Routes.js`.
- Legacy compatibility routes: `backend/inspection/routes/inspectionRoutes.js` and `backend/routes/inspectionRoutes.js`.
- Provider ownership middleware: `backend/inspection/middleware/requireProviderOwnership.js`.
- Workforce, booking, reports, provider governance and settlement service modules already exist.

The README describes providers as independent businesses using KAYAD's booking, standards, reporting and settlement systems. Declared service capabilities are separate from administrator-verified capabilities; retain this distinction.

## Canonical business journey

1. Buyer selects a vehicle and requests a pre-purchase inspection.
2. Marketplace discovers eligible providers by location, verified service capability, service mode, availability and vehicle specialization.
3. Buyer selects a package and slot; workshop/mobile constraints are validated server-side.
4. Booking is created with server-derived package price and any canonical mobile fee.
5. Payment is initiated against the stored booking amount; only verified payment settlement changes payment status.
6. Provider accepts/handles the booking; provider ownership is checked on every mutation.
7. Qualified assigned engineer completes the inspection and submits an evidence-backed report.
8. Customer receives authorized report access; privacy rules govern reports, contact details and vehicle identifiers.
9. Provider settlement, commission, disputes and refunds use canonical financial records.
10. Reviews and quality indicators use real completed-booking/review data.
11. A garage/dealer seeking to hold a vehicle for an auction must separately obtain physical-custody capability. Inspection approval must not grant custody rights.

## Strengths to retain

- Public provider search defaults to verified profiles and server-side provider checks.
- Booking total derives from canonical package price plus server mobile fee; client discounts are excluded.
- Booking requires an active verified provider and respects workshop/mobile capabilities.
- Provider ownership middleware exists for provider operations.
- Unique indexes protect active-slot booking and payment double-processing races.
- Report access and customer/provider boundaries have tests.
- Declared capabilities are distinct from verified capabilities.
- Application UI explains that submission does not grant access and declared services are not yet verified.

## Findings and opportunities

1. Dashboard load errors previously only reached the console, leaving the business center blank. Added visible error and retry.
2. Earnings API failure previously rendered KES 0 through fallback expressions. Replaced unknown/failure values with an em dash and explicit error state.
3. The “New Booking” button was inert. It now routes to the existing bookings tab rather than implying a booking was created.
4. Add Package, Manage Staff and Messages rows are inert in this component. The interface now discloses they are not wired from this surface; do not interpret them as working controls.
5. Reports and settings tabs were placeholders. They now explain that those tabs are not connected and point to existing workflows where available.
6. Provider application submits registration then declares each selected capability in separate requests. Partial failures are surfaced. Next backend improvement should make capability declarations resumable/idempotent and expose application status/evidence requirements.
7. Providers without a customer-facing workshop are allowed through an alternate evidence route. Governance must verify appropriate business evidence and service modes before publishing.
8. Inspection authority and physical vehicle custody are distinct. Custody needs separate capability approval, approved premises, agreement, intake/condition record, location, incident and release controls.
9. Canonical and legacy API paths coexist. Keep compatibility, but ensure aliases share authorization and business logic.
10. `providerId` supplied by the client must remain a selector, never identity proof. Revalidate ownership server-side for each request.
11. Earnings/settlement values require ledger provenance and a period definition; API failure must not appear as a zero balance.
12. Provider quality, report-sharing, customer contact and vehicle identifier privacy need continuing regression coverage.

## Recommended dashboard structure

- Overview: application/verification state, action queue, today's/upcoming bookings, reports awaiting review, monthly inspections, rating only when reviews exist, earnings with provenance.
- Bookings: new, accepted, assigned, in progress, report due, completed, cancelled/no-show with permitted transitions.
- Reports: draft, submitted, quality review, published, customer access, evidence/audit history.
- Team: engineers, qualifications, assignments, availability and suspended access.
- Services/packages: declared vs verified capability, price, vehicle/service modes and approval status.
- Locations: verified workshop premises, branches and mobile service radius.
- Finance: gross, commission, net, paid, pending and disputes with period and ledger-backed detail.
- Quality: report rework, complaints/disputes, response time, reviews and credential expiry.
- Settings: business/contact profile, notification preferences and masked payout details.
- Separate custody capability section for garages/dealers applying to hold vehicles; never conflate it with inspection certification.

## Changes in Stage 5F.14

- Visible dashboard load error and retry.
- Visible earnings error; unknown values no longer become zero.
- Refresh action reloads dashboard and earnings.
- Header CTA routes to existing bookings tab.
- Placeholder reports/settings tabs explicitly state their limitations.
- Quick-action area discloses that these actions are not wired from this component.
- Responsive horizontal padding improved.

## Verification

- `node scripts/validate-stage5f14-provider-business-center.mjs` — PASS 9/9.
- `node scripts/validate-inspection-marketplace.mjs` — PASS 37/37.
- Full typecheck/build/Vitest/Playwright and database/RLS tests were not run. Runtime Node is v22.16.0, below the repository's declared >=22.22.2 engine, and dependencies are not installed in this workspace.
- No hosted migration, deployment, real payment, commit or push was performed.

## Next stage

Implement provider application status/resume, evidence/document review and capability approval against canonical backend services; wire real booking/report/team/settlement tabs; add provider-team permission revocation tests; and implement separate garage physical-custody onboarding only where custody is intended.
