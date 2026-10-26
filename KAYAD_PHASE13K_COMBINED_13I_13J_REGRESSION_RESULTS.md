# KAYAD Phase 13K — Combined Phase 13I / 13J Regression Results

Run on the final applied 13K tree against the disposable stack (PostgreSQL 16 `kayad_13k_disposable`, PostgREST, REST proxy, Redis, Express on 5055). Commands, exit codes and logs: `validation-logs/phase13k/suites/`.

| Contract | Evidence | Result |
|---|---|---|
| 13I personal-account lifecycle (unified buyer/private-seller capability, buyer function during seller lifecycle, Seller Studio authorization, suspension/revocation visibility, reinstatement/ownership, saved-search safety, dealer isolation, admin seller review) | `phase13i_personal_account_matrix.mjs` | pass=78 fail=0 open_protected=0 |
| 13I public endpoint exposure | `phase13i_public_endpoint_exposure.mjs` | pass=165 fail=0 |
| 13J auction-registration allowlisting (`GET /api/auctions/:id/registration`) | `phase13j_registration_security.mjs` | 145/145 (includes the public-detail item left open in 13J, now passing) |
| 13K public vehicle detail + search + list + related endpoints | `phase13k_public_vehicle_security.mjs` | 276/276 (162/276 against unpatched 13J code) |

The 13I evidence files are unchanged from the 13J package; re-run copies are in `validation-logs/phase13k/phase13i_matrix_rerun_on_13K.*`.
