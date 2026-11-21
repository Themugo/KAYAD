# Test, build and validator results (2026-11-21) — actual counts
| Check | Result | Label |
|---|---|---|
| Frontend Vitest (full) | 212 files, **1805 passed, 1 skipped, 0 failed** | VERIFIED |
| Backend Jest (14 batches, run alone) | **4149 passed, 21 skipped, 0 failed** | VERIFIED |
| Backend `node:test` | 18/18 | VERIFIED |
| Backend Vitest | 61/61 (11 files) | VERIFIED |
| `npm run typecheck` | clean | VERIFIED |
| `npm run build` | succeeds (chunk-size warning only) | VERIFIED |
| Validators `scripts/validate-*.mjs` | all pass except 3 infrastructure-only: `communications-provider-certification` (needs live providers), `live-runtime`, `local-supabase` (need running stack/credentials) | 3 BLOCKED |
| New brand gate `validate-kayard-brand-customer-facing-20261121` | PASS | VERIFIED |
| DB journeys on a fresh disposable DB, **207/207 migrations applied** | 15/15 journeys PASS (incl. `07_personal_listing_management` 42/42, offers/payment, reconciliation, aggregate, legacy-seller/dealer, registration) | VERIFIED |
| Browser screenshots 1440/1280/1024/768/390/375/360 (My Vehicles, photo manager, Sold tab) | no horizontal overflow, no generic permission warning; `docs/…/screens/` | VERIFIED |
| Real image upload to Cloudinary | unreachable from sandbox | NOT TESTED |
| GitHub Actions / hosted DB behaviour | not run from here | NOT TESTED |
| Push to GitHub | proxy 403 (repo not authorised for this session) | BLOCKED |

## Test changes (none weakened)
Updated pins to the approved new behaviour: brand copy in LoginPage (3 files), AdminOwnerManagement, dealerOnboardingTruth; validator pins for DEFAULT_LOGO_URL migration, upload progress argument, KAYARD KE login button; OpenAPI entry for the new reorder route; the eligibility unit test that had pinned a faulty jsonb filter. `run.sh` no longer embeds a personal email (generic overridable `WEBHOIST_EMAIL`); the owner-email journey reads the same value, keeping the "reserved owner address cannot be registered" check intact.

## Release-readiness
Not claimed. Open items: apply pending hosted migrations (incl. `20261121140000`, `20261121150000`) — REQUIRES OWNER DECISION; real upload test; Make an Offer not implemented; reversed logo asset; domain/M-Pesa reference/prefix decisions.
