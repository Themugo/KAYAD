# KAYAD Deep Correction Report — V8

Base: KAYAD-FULL-DEEP-CORRECTED-20260921-V7

## Corrections in V8

### 1. Dealer workforce/team canonicalization
- Added canonical `DELETE /api/dealer-platform/team/:memberId`.
- Added `removeTeamMember` controller with organization scoping, self-removal protection, token cleanup, and audit logging.
- Blocked users from changing their own dealer-team role, permissions, or status.
- Canonicalized Dealer Team UI surfaces to `src/services/dealerPlatformApi.js`.
- Kept `dealerAPI` compatibility methods delegating to the canonical service rather than using a second transport.
- Added hashed invitation-token and organization-ownership assertions to the workforce validator.

### 2. Dealer listing ownership boundary
- Atomic dealer listing creation now uses `req.dealerId || req.user.id` as the organization owner boundary.

### 3. Inspection marketplace payment completion
- Corrected inspection activation validation to the current canonical controller/service/schema locations.
- Booking flow no longer treats STK initiation as payment completion.
- After STK initiation, the browser polls the authoritative payment-status endpoint and only completes the booking after backend status is `success`.
- Failed/cancelled/refunded payment states stop the flow without falsely marking the booking complete.
- Corrected the inspection API payment-status helper to the canonical `/api/payments/status/:checkoutRequestId` route.

### 4. Support admin transport
- Replaced the admin support page's obsolete `/admin/support-tickets` transport with the canonical `/api/support` transport.
- Added typed admin list/status helpers to `supportApi.ts`.
- Removed the unused `supportTicketAdminAPI` duplicate client surface.
- Updated the support domain validator to the maintained controller/routes and current SLA contract.

### 5. API contract convergence
- Added the new dealer-team DELETE route to `backend/openapi.yaml`.
- Wave 3 API governance now documents **1113/1113** mapped Express routes.

## Verification

- JavaScript/MJS/CJS syntax: **798 checked, 0 failures**.
- Production backend: **12/12 PASS**.
- Startup convergence: **PASS**.
- Dealer workforce access: **12/12 PASS**.
- Inspection marketplace activation: **14/14 PASS**.
- Support case management: **10/10 PASS**.
- Frontend runtime contracts: **PASS**.
- Backend runtime contracts: **14/14 PASS**.
- Runtime integrity: **7/7 PASS**.
- Transaction integrity: **14/14 PASS**.
- Payment gateway lifecycle: **13/13 PASS**.
- Subscription domain: **16/16 PASS**.
- Socket contract: **PASS**.
- Wave 3 convergence: **PASS**, OpenAPI **1113/1113**.

## Runtime verification boundary

This V8 archive was built from the clean V7 source tree. A fresh full `npm ci`, TypeScript check, Vitest suite, and Vite production build still require the user's Windows Node **22.22.2** environment because the available container Node is **22.16.0**, below KAYAD's declared minimum. No claim of a fresh container release build is made here.
