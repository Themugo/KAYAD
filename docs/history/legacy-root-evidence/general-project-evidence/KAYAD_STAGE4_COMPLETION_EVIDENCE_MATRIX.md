# KAYAD Stage 4 Completion Evidence Matrix

**Foundation:** `KAYAD-FIRST-SELLER-LAUNCH-CERTIFICATION-20261014.zip`  
**Environment:** isolated local extraction, Node `v22.16.0`, npm `10.9.2`  
**Scope:** source hardening and static verification only; no hosted environment accessed.

| ID | Seller type / area | Acceptance criterion | Actual result | Evidence | Environment | Status |
|---|---|---|---|---|---|---|
| ST4-001 | Foundation | ZIP matches recorded SHA-256 | Match | external checksum output | Local | PASS |
| ST4-002 | Foundation | Archive opens without corrupt entries | `unzip -t` clean | command output | Local | PASS |
| ST4-003 | Registration | Registration/onboarding source contracts | 47/47 assertions | `scripts/validate-registration-onboarding.mjs` | Local static | PASS |
| ST4-004 | Registration | Dealer/private-seller role contract | Assertions pass | `scripts/validate-registration-role-matrix.mjs` | Local static | PASS |
| ST4-005 | Communications | Sensitive event body metadata omitted | Source assertion passes | `scripts/validate-first-seller-launch-contract.mjs` | Local static | PASS |
| ST4-006 | Communications | Arbitrary values under allowed sensitive metadata keys are rejected | Added code and regression assertion | gateway and Jest test | Local source; Jest not run | PARTIAL |
| ST4-007 | Communications | Provider acceptance not mislabeled as confirmed delivery | Log wording corrected; source assertion passes | gateway and first-seller validator | Local static | PASS |
| ST4-008 | Communications | Canonical seller approval event | `dealer.submitted` source contract passes | first-seller validator | Local static | PASS |
| ST4-009 | Email | Real Brevo provider acceptance | No credentials/approval | provider certification validator reports not configured | Not run | BLOCKED |
| ST4-010 | Email | Mailbox delivery evidence | No provider/webhook test | None | Not run | BLOCKED |
| ST4-011 | Auth | Typecheck and compile | Attempted; TypeScript reports missing type definitions from incomplete install | `npm run typecheck` | Local | BLOCKED |
| ST4-012 | Runtime | Backend boot | Validator cannot load missing ESLint | `validate-backend-boot.mjs` | Local | BLOCKED |
| ST4-013 | Runtime | Exact Node 22.22.2 | Current runtime is 22.16.0 | `validate-phase6-release.mjs` | Local | BLOCKED |
| ST4-014 | Build | Vite production build | Attempted; `vite: not found` | `npm run build` | Local | BLOCKED |
| ST4-015 | Backend | Jest communications regression tests | Tests added; not executed | `backend/tests/communications/recordDelivery.test.js` | Not run | BLOCKED |
| ST4-016 | Frontend | Vitest suite | Not executed | Dependencies unavailable | Not run | BLOCKED |
| ST4-017 | E2E | Playwright seller journey | Not executed | Dependencies and runtime unavailable | Not run | BLOCKED |
| ST4-018 | Database | Migration filename/version preflight | 181 migrations, 181 unique versions | `scripts/validate-supabase-migrations.mjs` | Local static | PASS |
| ST4-019 | Database | Migration-hygiene checks | No exact duplicate bodies/table creators | `scripts/validate-migration-hygiene.mjs` | Local static | PASS |
| ST4-020 | Database | Real PostgreSQL migration rehearsal | PostgreSQL tooling unavailable | `psql` absent | Not run | BLOCKED |
| ST4-021 | Database | Current staging schema and migration history | No authorized current schema evidence | Stage 3 runbook retained | Not run | BLOCKED |
| ST4-022 | Dealer | Real dealer registration and email verification | Source contract only | static validators | Not run | PARTIAL |
| ST4-023 | Private seller | Real private-seller registration and verification | Source contract only | static validators | Not run | PARTIAL |
| ST4-024 | Dealer | Correct entitlement applied | Static guards only | subscription-domain validator | Local static | PARTIAL |
| ST4-025 | Private seller | Correct free-market/pilot policy applied | Deployment policy unverified | role and subscription source validators | Local static | PARTIAL |
| ST4-026 | Listing | Real Cloudinary upload/retrieval | No credentials or approved staging scope | None | Not run | BLOCKED |
| ST4-027 | Listing | Listing persists with seller ownership and image references | No DB journey | None | Not run | BLOCKED |
| ST4-028 | Moderation | Admin review and approval/rejection | No browser/runtime journey | None | Not run | BLOCKED |
| ST4-029 | Marketplace | Approved listing visible publicly in staging | No staging journey | None | Not run | BLOCKED |
| ST4-030 | Admin/audit | Correlated registration-to-publication trail | No runtime evidence | Source contracts only | Local static | PARTIAL |
| ST4-031 | Security | High-risk boundary contracts | Static validator passes | `scripts/validate-high-risk-boundaries.mjs` | Local static | PASS |
| ST4-032 | Security | Phase 7 security contract | 15/15 assertions | `scripts/validate-phase7-security-release.mjs` | Local static | PASS |
| ST4-033 | Operations | Phase 8 operations/recovery contract | 15/15 assertions | `scripts/validate-phase8-operations.mjs` | Local static | PASS |
| ST4-034 | Provider | Communications provider certification | Required Brevo/SMS settings absent; no send attempted | `scripts/validate-communications-provider-certification.mjs` | Local environment | BLOCKED |
| ST4-035 | Release | Complete regression pass | Not possible without dependencies/runtime | install logs and validator results | Local | BLOCKED |

## Aggregate results

- Static/source/config validators attempted: 39.
- Passed: 35.
- Blocked by runtime, dependency installation or missing provider configuration: 4.
- Genuine source-validator failures identified: 0.
- Jest/Vitest/build/Playwright tests executed: 0.
- Live provider sends: 0.
- Database migrations executed: 0.
- Production or staging mutations: 0.

Static source passes are not substitutes for runtime or hosted evidence.
