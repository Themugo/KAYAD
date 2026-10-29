# Panic Room scope control — verification against your Priority 3 requirements

**Honest scope:** the scope-control implementation (central policy, atomic control plane, owner and technical recovery lanes, Panic Room UI) was built and reviewed in the two previous rounds. Phase 16D did **not** change any of it. This round re-verified it on the Phase 16D tree by re-running the same real-backend suites (results in `KAYAD_PHASE16D_TEST_EVIDENCE.md`). It is LOCAL verification only.

| Requirement | Where it is enforced (server-side) | Evidence suite |
|---|---|---|
| Owner chooses which groups/operations are affected (global, ordinary users, buyers & sellers, dealers) | `backend/config/maintenancePolicy.js` + `maintenanceControlRoutes.js`; Panic Room UI only calls the control plane and shows the server's state | `e2e_maintenance_scopes`, `e2e_maintenance_scope_matrix` (9 identities × 4 scopes × every request type), `browser_maintenance_scopes` |
| Global emergency mode available but never locks out the primary owner | owner lane (recover is restore-only; password + MFA step-up) | `browser_owner_mfa_recovery`, `e2e_maintenance_owner_lockout`, `e2e_maintenance_owner_mfa_membership` |
| Authorised additional owners; explicitly authorised engineers only (not every staff account) | owner lane by owner membership; technical lane only with the owner-made `platform_recovery` grant; ordinary staff are not exempt | `e2e_maintenance_security_controls` T1–T8, scope matrix |
| Technical personnel cannot reach admin/finance/auction/escrow via the lane; recover-only, cannot activate | `maintenanceEnforcement` + route classes | `e2e_maintenance_security_controls` |
| Enforced across middleware and APIs, not UI | `checkSystemStatus` (pre-auth), `protect()`, login, refresh, session routes | scope matrix (direct API, old tokens, refresh) |
| MFA, CSRF, rate limits, audit, sessions, owner/dealer separation | step-up on every recover; CSRF on control plane; rate limits; CRITICAL audit; owner/dealer suites | security controls, rate limits, `e2e_owner_identity_governance`, `e2e_phase16b/16c_*` |
| Global, selective, owner recovery, technical recovery, ordinary staff, dealers, concurrent changes, failed recovery, database outages | all of the above | `e2e_maintenance_scopes` C1–C3 (concurrency), `e2e_maintenance_security_controls` F0–F7 (PostgREST stopped) |

**Not verified / residual (unchanged from the last report):** technical-recovery staff have no MFA (do not grant `platform_recovery` until that exists); open WebSocket connections are not re-evaluated; per-instance ~10 s cache; hosted behaviour (needs Operation B).
