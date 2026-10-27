# 07 Validators (Order 12)
139 of 143 `validate:*` scripts pass (14.6: 138/143).
| Validator | Result | Disposition |
|---|---|---|
| brand-palette-convergence | **now PASS** | Real defect: AdminPrivateSellerApplications used legacy amber/orange status colours. Moved to the brand warning token (pending) and a slate tone (suspended); status text labels are unchanged, so meaning is not colour-only. |
| stage24-theme-convergence | FAIL 13/14 | Needs KAYAD_STAGE24_THEME_SWEEP_AUDIT_20261012.md. It is listed in an old release manifest but absent from the repo along with its sibling docs; its content cannot be reconstructed from evidence, so no placeholder was created. |
| stage5f7-private-auction-contract | FAIL | Needs the contract-freeze, threat-model and authorization-matrix docs (all three absent). It describes the protected private-auction contract; not invented. |
| communications:providers | FAIL | Needs provider credentials. Environment-dependent. |
| live-runtime | FAIL | Needs SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Environment-dependent. |
Recovery option for the two missing-doc validators: restore the original documents from the archive that produced the old manifest, or have the owner re-issue the contract freeze.
