# Stage 17 Change Ledger — Auto Services

Foundation SHA-256: `809820cde6c613c26cbda7dc98670a6742b488e2566afadebdac4369b66c1fe4`

| File | Change | Reason |
|---|---|---|
| `src/features/InspectionsView.tsx` | Added explicit `public`/`account` rendering modes; public page no longer shows private record tabs; private records load by account ID; masks stale records; sanitizes errors; links users to account workspace. | Keep public Auto Services content separate from personal bookings/reports and prevent cross-account stale display. |
| `src/features/OwnershipPlatform/pages/BuyerPlatform.tsx` | Replaced the incomplete summary-only inspection list with the existing full inspection journey in account mode. | Give requests, provider bookings, payment/cancel actions and reports one authenticated destination. |
| `src/App.tsx` | Routes private `mine`/`reports` launches to My Garage; passes callback from public services page; keys dashboard view by account and selected tab. | Preserve deep links while moving private records into the account workspace. |
| `src/components/navigation/navConfig.ts` | Changed `My requests and reports` destination to authenticated `/?nav=buyer-platform`. | Navigation now points to the correct private workspace. |
| `src/__tests__/features/inspections/InspectionsView.test.tsx` | Added tests for hiding private tabs, account-switch masking, safe error text and account CTA; updated account-view tests. | Lock down the new public/private boundary. |
| `src/__tests__/features/automotive/servicesHub.test.tsx` | Updated private inspection-history test to account mode and asserted authenticated dashboard destination. | Keep service-hub tests aligned with canonical navigation. |
| `package.json` | Added `validate:public-auto-services-boundary`. | Repeatable source-level boundary validation. |
| `scripts/validate-public-auto-services-boundary-20261012.mjs` | Added 17 source-contract checks for public/private separation, identity masking, server authorization and public provider projection. | Regression protection for this sweep. |
| `KAYAD_STAGE17_AUTO_SERVICES_AUDIT_20261012.md` | Added audit report. | Record findings, evidence and remaining risks. |
| `KAYAD_STAGE17_AUTO_SERVICES_CHANGE_LEDGER_20261012.md` | Added this ledger. | File-level traceability. |
| `KAYAD_STAGE17_AUTO_SERVICES_VALIDATION_MATRIX_20261012.tsv` | Added machine-readable gate status. | Explicitly separate PASS, BLOCKED and NOT RUN. |
| `KAYAD_STAGE17_AUTO_SERVICES_EXECUTION_LOG_20261012.txt` | Added command/results summary. | Reproducible evidence. |
| `KAYAD_STAGE17_SHA256_MANIFEST_20261012.txt` | Added checksums for changed source and reports. | Artifact integrity. |

No migrations, provider schemas, payment services or public API response shapes were changed.
