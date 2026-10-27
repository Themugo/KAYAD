# KAYAD — Panic Room access control, selective maintenance & owner recovery (2026-10-27)

Built on `KAYAD-INCIDENT-20261027-OWNER-MAINTENANCE-LANE-FIX.zip` (preserved untouched). Local only: no commit, push, deploy, hosted data or env change.

Read in this order:
1. `KAYAD_MAINTENANCE_SCOPES_20261027_REMAINING_RISKS_AND_DECISION.md` — decision **B** and the explicit blockers.
2. `KAYAD_MAINTENANCE_SCOPES_20261027_POLICY_MATRIX.md` — scope × audience × route rules.
3. `KAYAD_MAINTENANCE_SCOPES_20261027_DEPLOYMENT_PLAN_AND_ROLLBACK.md` — Operation A (flag) and Operation B (code), independent approvals.
4. `KAYAD_MAINTENANCE_SCOPES_20261027_TEST_EVIDENCE.md` and `validation-logs-maintenance-scopes-20261027/`.
5. `KAYAD_MAINTENANCE_SCOPES_20261027_CHANGE_LEDGER.md` and `KAYAD_MAINTENANCE_SCOPES_20261027_SOURCE_MANIFEST.sha256`.

Note: `KAYAD_INCIDENT_20261027_HOSTED_RECOVERY_PLAN.md` (earlier package) refers to the superseded owner-only lane for its "Op 2"; this package's deployment plan replaces it. Its "Op 1" SQL is reused unchanged as Operation A.

Verify the package: `sha256sum -c KAYAD-MAINTENANCE-SCOPES-20261027-OWNER-RECOVERY.zip.sha256`, `unzip -t`, then `sha256sum -c KAYAD_MAINTENANCE_SCOPES_20261027_SOURCE_MANIFEST.sha256` inside the extracted tree.
