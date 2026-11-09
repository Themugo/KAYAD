# KAYAD project handover guide

## Purpose
This package is the supplied KAYAD project with documentation and file-placement cleanup. Application source, database migrations, deployment configuration, package manifests, and operational scripts have been retained in their original locations. This is a structural/documentation cleanup, not a product redesign or a claim of production certification.

## Recommended handover order
1. Read the root `README.md` and `docs/README.md`.
2. Review `handover/STRUCTURE_AUDIT.md` and `handover/FILE_CLEANUP_REGISTER.csv`.
3. Review `handover/PRIVATE_SELLER_LISTING_WORKFLOW.md` for the repaired private-seller 12-step listing flow and its remaining data-contract boundaries.
4. Review architecture and runtime boundaries in the existing source tree (`src/`, `backend/`, `supabase/`, `scripts/`).
5. Review operational procedures in `runbooks/`, starting with the dated/current runbooks relevant to the release being handed over.
6. Review `certification-20261101/` and `audit-artifacts/` as evidence; confirm environment and timestamps before relying on any result.
7. Treat `docs/archive/phase-records/` as historical evidence only. The original SHA-256 manifest files are preserved unchanged as historical manifests; because their listed paths were relocated, they are not a current whole-tree checksum certificate.
8. Run the project's approved CI/release validation in the intended Node environment and connected staging/production services before sign-off.

## Canonical source map
| Concern | Canonical location |
|---|---|
| Frontend application | `src/` |
| Backend application | `backend/` |
| Database schema and migrations | `supabase/` |
| Shared libraries | `lib/` |
| Project scripts and validators | `scripts/` |
| Browser and end-to-end tests | `e2e/`, `tests/` |
| Load/performance tests | `load-tests/` |
| Deployment and infrastructure | `.github/workflows/`, `helm/`, `k8s/`, `nginx/`, root deployment config |
| Operational runbooks | `runbooks/` |
| Audit and certification evidence | `audit-artifacts/`, `certification-20261101/` |
| Historical phase reports | `docs/archive/phase-records/` |

## Important handover cautions
- Do not delete repeated runbook files solely because their hashes match: several are snapshots copied forward between dated phases.
- `.node-version` and `.nvmrc` are identical on purpose and pin the same runtime.
- `public/security.txt` and `public/.well-known/security.txt` are identical; this is a common compatibility placement, not proof of accidental duplication.
- `package.json` has a large number of named validation commands. The command names are interface labels; their target files were checked for existence in this archive.
- No real `.env` files were included at the archive root. Populate secrets through the target environment's secret manager, never by adding credentials to the handover ZIP.


## Latest security / finance / database continuation audit (2026-11-09)

Read `SECURITY_AUTH_FINANCE_DATABASE_AUDIT_20261109.md` before release sign-off.

- `API_VALIDATION_GAP_REGISTER_20261109.csv` lists the 215 API routes still without route-schema coverage (76 write routes and 139 read routes). This is a review backlog, not a statement that every route is exploitable.
- `API_GOVERNANCE_REPORT_20261109.json` is the exact route-governance scan output (1,130 routes; 1,130 documented; 915 with schema validation).
- `scripts/validate-security-finance-release-gate.mjs` is the maintained source-level security/authentication/finance check. Run with `npm run validate:security-finance-release`.
- Regression tests added for strict M-Pesa CIDR allowlist parsing and ownership-history data integrity are under `backend/tests/security/`.
- The latest source-only checks pass, but production certification is still blocked on a supported Node runtime with installed dependencies, live PostgreSQL/Supabase migration replay and RLS tests, authenticated API E2E, Daraja provider UAT, and browser/device E2E.
