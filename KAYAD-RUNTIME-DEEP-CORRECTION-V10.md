# KAYAD Runtime Deep Correction V10 — 2026-09-21

## Baseline
V9 clean baseline: KAYAD-FULL-DEEP-CORRECTED-20260921-V9.zip

## Windows runtime findings consolidated
The supplied Windows certification log exposed three independent classes of defects:

1. Root TypeScript contract drift: 30 errors across 16 frontend files.
2. Backend Jest contract drift: 5 failing suites / 6 failing tests.
3. Runtime/release validator drift: local-runtime validator required a running port; Wave 3 route count changed after adding the canonical search facets endpoint.

## Corrections
- Corrected SocketContext callback contracts so `on()` returns an unsubscribe function and `off()` is void, matching actual consumers.
- Removed obsolete `.data` assumptions from ownership dashboard and bid placement consumers.
- Repaired payment API request option typing.
- Replaced stale `httpRequest` imports in lead/review APIs with canonical `request` transport.
- Corrected PaymentHistory to consume the canonical backend payment shape and `carDetails` instead of treating `car` (an ID) as a vehicle object.
- Added explicit inspection marketplace response types so booking, provider, dashboard, earnings, and payment flows are no longer inferred as `unknown`.
- Restored the canonical inspection response-envelope unwrap contract required by the maintained validator while retaining explicit typed consumers.
- Restored missing `getSearchFacets` through the canonical search transport and added a backend `/api/search/facets` endpoint backed by the existing search DB adapter.
- Added the new search-facets route to the maintained OpenAPI contract; Wave 3 now documents 1114/1114 Express paths.
- Restored the missing `onOpenInspectionMarketplace` prop destructuring in InspectionsView.
- Normalized auction read-model conversion instead of unsafe `Auction[] as AuctionRecord[]` casting.
- Fixed backend security test email mock to include `sendRawEmail` required by the communication gateway.
- Fixed backend payment-history test DB mock to expose `count` required by paymentController.
- Fixed transaction lifecycle test path resolution so backend tests work when invoked from `backend/`.
- Updated escrow callback certification expectation to the current custody safety invariant: vehicle escrow is not funded through M-Pesa STK and is failed closed.
- Updated payment failure-mode certification to assert the authoritative payment intent is created and then failed when M-Pesa initiation fails, preventing an untracked external attempt while avoiding a phantom pending record.
- Extended local-runtime startup polling to tolerate normal Windows backend startup latency.

## Verification completed in the build environment
- JS/MJS/CJS syntax/transpile audit: 1448/1448 PASS
- Production backend validator: 12/12 PASS
- Startup convergence: PASS
- Runtime integrity: 7/7 PASS
- Wave 3 convergence: 1114/1114 PASS
- Inspection marketplace validator: 21/21 PASS
- Full static release gate: PASS

## Not falsely certified
The build environment uses Node 22.16.0 while the project requires Node >=22.22.2 and does not have the complete npm dependency cache required to execute the full Windows frontend/backend test suites. Therefore Windows `npm test`, frontend `tsc`, browser E2E, and live-Supabase certification remain external gates and are not represented as passed here.
