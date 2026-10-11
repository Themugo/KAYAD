# Stage 20 Change Ledger

| Path | Change | Risk / notes |
|---|---|---|
| `package.json` | Added `certify:buyer-portal:staging` npm script | Adds an explicit command only; dependencies unchanged |
| `scripts/certify-buyer-portal-staging-isolation-20261012.mjs` | Added native-fetch GET-only two-account API and optional Supabase RLS test runner | Requires explicit staging credentials and seeded IDs; never prints tokens |
| `KAYAD_STAGE20_STAGING_RUNBOOK_20261012.md` | Added staging setup and browser race test procedure | Uses test-only accounts; forbids service-role RLS tests and production target |
| `KAYAD_STAGE20_BUYER_PORTAL_STAGING_VALIDATION_MATRIX_20261012.tsv` | Added live verification matrix with blocked status until executed | No false PASS claims |
| `KAYAD_STAGE20_BUYER_PORTAL_STAGING_EXECUTION_LOG_20261012.txt` | Recorded what ran and what remains blocked | Explicitly distinguishes static checks from staging certification |
| `KAYAD_STAGE20_BUYER_PORTAL_STAGING_AUDIT_20261012.md` | Added audit outcome and certification gaps | Source-level and live status separated |
| `KAYAD_STAGE20_SHA256_MANIFEST_20261012.txt` | Added SHA-256 hashes of changed/new artifacts | Integrity aid |

No Stage 19 application source files were modified in Stage 20.
