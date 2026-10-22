# KAYAD First-Seller End-to-End Evidence Matrix

**Baseline:** supplied Stage 3 ZIP, reported commit `194cc807c11670675ffc7ce4b071b7e8dbf6f93b`  
**Date:** 14 October 2026  
**Status rule:** static source evidence is not equivalent to a running local, staging or production journey.

| Case ID | Seller / stage | Expected result | Actual result / evidence | Environment | Status | External dependency |
|---|---|---|---|---|---|---|
| FS-001 | Foundation | ZIP integrity, safe isolated extraction | ZIP test passed; 31,468,459 bytes; SHA-256 in checksum file; 4,439 extracted files | Local | PASS | None |
| FS-002 | Runtime | Pinned Node and dependencies available | Node 22.16.0; `.nvmrc` says 22.22.2; dependencies absent | Local | BLOCKED | Runtime/dependency setup |
| FS-003 | Dealer registration | Valid dealer identity, credential and dealer profile created atomically | Source uses `kayad_register_identity_atomic`; static registration gates pass | Static source | PARTIAL | Disposable DB/runtime |
| FS-004 | Private seller registration | Identity and individual-seller role/profile created | Role matrix maps to `individual_seller`; static gates pass | Static source | PARTIAL | Disposable DB/runtime |
| FS-005 | Registration validation | Invalid/malformed input denied | Server validation and role allow-list present; no current HTTP tests run | Static source | PARTIAL | Dependency-backed tests |
| FS-006 | Duplicate registration | Normalized duplicate returns conflict without duplicate identity | Existing check plus atomic RPC/unique-conflict handler present | Static source | PARTIAL | DB concurrency rehearsal |
| FS-007 | Concurrent duplicate registration | One canonical identity only | Not exercised in this pass; atomic RPC source only | Not run | UNVERIFIED | Disposable PostgreSQL/Supabase-compatible test |
| FS-008 | CSRF/rate limiting | State-changing requests protected and registration limited | Canonical CSRF route and registration limiter present; source validators pass | Static source | PARTIAL | Browser/runtime test |
| FS-009 | Verification dispatch | Durable delivery record, provider acceptance distinct from request success | Async delivery call present; no provider credentials or live sends | Static source | BLOCKED | Brevo authorized test |
| FS-010 | Token privacy | Verification/reset raw tokens absent from durable delivery metadata | Sanitizer added; static launch contract 6/6; Jest regression tests added but not run | Local source | PARTIAL | Jest rerun |
| FS-011 | Verification expiry/replay | Valid token consumed once; expired/replayed token rejected | Hash lookup, expiry and clearing fields visible in source; no DB-backed replay test this pass | Static source | PARTIAL | Dependency-backed DB test |
| FS-012 | Resend recovery | Replacement token only committed after provider acceptance; old token remains usable on failure | Existing async resend implementation reviewed; validator corrected to match actual log string | Static source | PARTIAL | Live provider failure test |
| FS-013 | Sign-in | Correct credentials follow verification/approval policy; bad credentials denied | Source contains lockout, ban/deactivation and conditional verification gates | Static source | PARTIAL | Runtime auth tests |
| FS-014 | Dealer onboarding | Required business name/location and verification submission persisted | Source validator confirms requirements and onboarding route | Static source | PARTIAL | DB-backed route test |
| FS-015 | Private seller onboarding | Private seller does not get forced into dealer business fields | Role matrix passes; actual deployed policy unknown | Static source | PARTIAL | Runtime onboarding test |
| FS-016 | Approval | Admin approval/rejection is authoritative and attributable | Admin routes exist; no live admin action or audit check run | Not run | UNVERIFIED | Staging admin account/approval |
| FS-017 | Dealer entitlement | Active subscription/quota required; no silent universal free bypass | `assertDealerCanCreateListing` enforces subscription; source review only | Static source | PARTIAL | Staging subscription state |
| FS-018 | Private-seller entitlement | Configured free-market/package policy is enforced | Code branches on `freeMarket`, `waivePayments`, package and listing counts; live config unknown | Static source | PARTIAL | Owner policy confirmation + staging config |
| FS-019 | Vehicle upload | Real image accepted by configured storage and retrievable | Cloudinary upload/recovery path exists; no credentials/upload performed | Not run | BLOCKED | Cloudinary staging credentials + approval |
| FS-020 | Listing ownership | Seller cannot create/edit another seller's listing | Ownership/role checks present in source; no current cross-seller runtime test | Static source | PARTIAL | Security integration test |
| FS-021 | Listing submission | Listing state and images persist idempotently | No DB-backed listing was created in this pass | Not run | UNVERIFIED | Disposable/staging DB |
| FS-022 | Admin moderation | Admin sees pending listing, approves/rejects with reason | Routes and notifications exist; no browser journey run | Not run | UNVERIFIED | Staging admin session |
| FS-023 | Publication | Approved listing appears publicly with actual stored images | No test listing was published | Not run | UNVERIFIED | Explicit staging listing authorization |
| FS-024 | Pending seller notification | Admin notification uses rollout-configured canonical event | Producer changed to `dealer.submitted`; `seller.approval_pending` preserved as source metadata | Local source | PASS | Dependency-backed regression rerun |
| FS-025 | Email rollout | Event/channel must be enabled and configured; no false delivered claim | Rollout is fail-closed; provider acceptance not observed | Static source | PARTIAL | Admin rollout config + Brevo |
| FS-026 | Webhook delivery status | Authenticated webhook updates delivery state idempotently | Brevo/Twilio/AT webhook handlers exist; secrets/signatures not tested live | Static source | PARTIAL | Provider webhook test |
| FS-027 | Support request | Seller contact reaches authorized admin queue and response is traceable | Existing support/contact surfaces exist; end-to-end trace not executed | Not run | UNVERIFIED | Staging accounts |
| FS-028 | Admin audit | Registration-to-publication actions correlate without tokens/private docs | Full correlated journey not run; token body persistence corrected locally | Local source | PARTIAL | Runtime/admin audit test |
| FS-029 | Schema readiness | All required tables/functions/columns/grants/RLS match target | Static alignment validator 8/8; Stage 3 production drift/provenance unresolved | Local/static + historical production capture | BLOCKED | Approved read-only schema evidence |
| FS-030 | Full regression | Build, unit, integration, E2E and mobile checks pass on changed tree | Not run: no dependencies; Node below pin | Not run | BLOCKED | Node 22.22.2 + lockfile install |
| FS-031 | Live provider acceptance | Brevo accepts verification email | No real email sent | Not run | BLOCKED | Explicit authorization and test recipient |
| FS-032 | Mailbox delivery | Delivery webhook proves inbox delivery | No webhook/mailbox evidence | Not run | BLOCKED | Provider webhook + test mailbox |
| FS-033 | Production | Actual current production journey works | No production request or mutation performed | Production | UNVERIFIED | Explicit read-only access approval |

## Certification interpretation

- **PASS**: direct reproducible evidence for that precise criterion exists.
- **PARTIAL**: source behavior exists or static checks pass, but a material runtime/infrastructure dependency remains.
- **BLOCKED**: required runtime, access, provider, schema evidence or authorization is missing.
- **UNVERIFIED**: no sufficient evidence was collected.

There are no end-to-end seller journeys marked PASS. This is intentional: no running application, real provider, storage provider, database or browser journey was executed in this pass.
