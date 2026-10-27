# KAYAD Phase 16A — Primary owner confirmation, second-owner provisioning and test-dealer preservation

Foundation: verified Phase 16 archive (`KAYAD-PHASE16-SYSTEM-OWNER-IDENTITY-ACCOUNT-SEPARATION-MFA-GOVERNANCE-20261026.zip`, SHA-256 `4b3b7a0bbcca8c926cc0920cf3646e8af2658d9d4577f44fc4da2a95b05cae58`, sidecar check **OK**). Phase 15/16 archives untouched. Brand: KAYAD KE.

## Final decision

| Question | Answer |
|---|---|
| **Local readiness** | **READY for your review.** The whole arrangement (primary → second owner → test dealer) is rehearsed on a disposable database and a local application stack: 58/58 arrangement checks (×2), all carried regressions green (Jest 3032, Vitest 960, 7 E2E suites), both migration candidates and the proposed role/profile update rehearsed with rollbacks. |
| **Hosted changes actually completed** | **NONE.** Only `SELECT`s were run on the hosted project. No SQL mutation, migration, role change, invitation, configuration change, commit, push or deploy. |
| Primary owner `jimmythemugo@gmail.com` | **Not yet recognised as an owner on hosted by membership**; hosted still runs in legacy (designated-address) mode. Its row is unchanged (`dealer`, verified, 38 sessions). |
| Second owner `kayadautomotives@gmail.com` | **NOT active.** The account does not exist anywhere; no invitation has been issued. |
| Owner MFA | **NOT live.** The MFA tables do not exist on hosted; no secret key is configured by me. |
| Test dealer `kamauwamakena@gmail.com` | **NOT active, NOT approved, e-mail NOT verified**; no dealership/verification record. Preserved byte-for-byte. Its onboarding step is **blocked on hosted** by a schema gap (see below). |
| Role change `dealer → superadmin` for the primary | **Optional hygiene, not required** for owner authority and **not sufficient** by itself. Exact guarded SQL + rollback are in the approval report (H5). |

## What you need to know (the points that differ from earlier expectations)
1. **Owner authority is membership/designation, not the role label.** The primary needs the bootstrap (H2–H3), not necessarily the role change.
2. **"Change the second owner's permissions" does not exist as a feature** — all owners are peers. The primary can remove, recover and re-invite (audited, password + authenticator code). New in 16A: a peer owner cannot remove or ban the primary.
3. **`WEBHOIST_EMAIL` order decides the primary** — list `jimmythemugo@gmail.com` first, and keep the second address out of the list until it is active (bootstrap would otherwise invite it before the primary is proven).
4. **Hosted gaps found [read-only]:** the test dealer's onboarding cannot complete on hosted until `dealers` gets `bio/onboarding_complete/onboarding_completed_at/payment_details` and the verification CHECK allows `suspended`; new public sign-ups fail there (`kayad_register_identity_atomic` absent); no case-insensitive unique e-mail index. None affect the owner-governance candidate's hard dependencies, which are present.
5. The earlier one-row Phase 16 proposal was incomplete (it omitted `profiles.role`); replaced.

## Read in this order
1. `KAYAD_PHASE16A_APPROVAL_REPORT.md` — **the approval gate** (operations H0–H9, exact SQL, rollback, verification, risks, order).
2. `KAYAD_PHASE16A_OWNER_RESOLUTION_AUDIT.md`
3. `KAYAD_PHASE16A_TEST_DEALER_PRESERVATION_AND_ACTIVATION.md`
4. `KAYAD_PHASE16A_MIGRATION_AND_ROLLBACK_INSTRUCTIONS.md`
5. `KAYAD_PHASE16A_STAGING_CHECKLIST.md`
6. `KAYAD_PHASE16A_TEST_COMMANDS_RESULTS_AND_EVIDENCE.md`, `KAYAD_PHASE16A_CHANGE_LEDGER.md`
7. Manifest: `KAYAD_PHASE16A_SOURCE_MANIFEST.sha256`; integrity log: `KAYAD_PHASE16A_PACKAGE_INTEGRITY_LOG.txt` (outside the archive, alongside it).

## Reproduce locally
`runbooks/phase16-20261026/build_full_schema.sh` (disposable DB) → apply the two candidates → start PostgREST + backend → `node runbooks/phase16a-20261026/e2e_phase16a_arrangement.cjs`; `runbooks/phase16a-20261026/primary_owner_update_dryrun.sh <base>_disposable`; `runbooks/phase16a-20261026/live_rollback_rehearsal.sh <populated_db> …`.

**Waiting for your explicit approval of specific operations (e.g. "Approve H1, H2, H3 only") before any hosted mutation.**
