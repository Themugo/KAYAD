# KAYAD Phase 16A — Change ledger (relative to the verified Phase 16 package, SHA-256 `4b3b7a0b…cae58`)

No migration was added or edited. No Phase 15/16 archive was modified. No commit, push or deploy. No hosted mutation.

## Modified (3 source files + 1 example)
| File | Change |
|---|---|
| `backend/services/ownerGovernance.service.js` | `OWNER_PRIMARY_PROTECTED` (403); `removeOwner` refuses a peer removing the primary (audited as `owner.remove`/`denied`), `OWNER_PRIMARY_PROTECTION=off` disables; `listGovernance` members carry `primary` |
| `backend/routes/ownerRoutes.js` | `GET /api/owner` returns `self.{id,primary}` and `primaryProtection` |
| `src/pages/admin/AdminOwnerManagement.jsx` | "· Primary owner" label; Remove hidden for the primary row when the viewer is a peer, with explanation |
| `backend/.env.example` | documents primary-first `WEBHOIST_EMAIL` and `OWNER_PRIMARY_PROTECTION` |

## Added
| File | Purpose |
|---|---|
| `backend/tests/regression/phase16aPrimaryOwnerProtection.test.js` | 6 Jest tests of the guard |
| `src/__tests__/pages/AdminOwnerManagement.primary.test.jsx` | 3 Vitest tests of the UI |
| `runbooks/phase16a-20261026/e2e_phase16a_arrangement.cjs` | 58-check arrangement E2E (primary → second owner → test dealer) |
| `runbooks/phase16a-20261026/primary_owner_update_dryrun.sh` | exact P1 operation/rollback, hosted + repo trigger sets (24 checks) |
| `runbooks/phase16a-20261026/live_rollback_rehearsal.sh` | rollback of MFA + governance on a populated clone (10 checks) |
| `runbooks/phase16a-20261026/{e2e_lib.cjs,rest_prefix_proxy.cjs,build_full_schema.sh,supabase_shim.sql,e2e_owner_identity_governance.cjs,e2e_identity_integrity.cjs}` | copies of the Phase 16 harness used by the new scripts |
| `KAYAD_PHASE16A_*.md`, `evidence/phase16a-20261026/**`, `KAYAD_PHASE16A_SOURCE_MANIFEST.sha256` | reports and evidence |

## Superseded Phase 16 proposal
The Phase 16 dry run (`identity/dealer_separation_dryrun.sh`) updated `users` only. It remains in the tree unchanged for history; **the Phase 16A script and SQL replace it** (adds `profiles.role`, the `is_banned`/`deactivated_at` guards, the hosted trigger set, full-row rollback comparison).
