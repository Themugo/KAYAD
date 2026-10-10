# KAYAD Engineering Documentation

This is the maintained entry point for the KAYAD technical team. It indexes the current system boundaries and operating procedures without treating historical completion reports as proof of current production health.

## Start here

1. [Technical team handover](runbooks/TECHNICAL_TEAM_HANDOVER.md) — setup, ownership boundaries, release sequence and open blockers.
2. [System and module boundaries](architecture/SYSTEM_AND_MODULE_BOUNDARIES.md) — frontend, backend, data and business-flow map.
3. [Dependency and duplication audit](architecture/DEPENDENCY_AND_DUPLICATION_AUDIT_20261010.md) — exact duplicates, consolidation decisions and unresolved items.
4. [Audit manifest](architecture/TECHNICAL_AUDIT_MANIFEST_20261010.json) — machine-readable inventory and audit findings.
5. [Production deployment guide](production/DEPLOYMENT_GUIDE.md) and [release gate](production/FINAL_RELEASE_GATE_20261008.md).
6. [Security documentation](security/) — identity, access control, RLS and security evidence.
7. [Auction 360 documentation](auction-360/) — bidding, payments, escrow and fulfilment.
8. [Operational runbooks](runbooks/) — incident response and operations.

## Documentation areas

- `architecture/` — canonical system boundaries, architecture decisions and audit artifacts.
- `auction-360/` — auction business, financial integrity, bidder journeys and settlement.
- `domains/` — marketplace and supporting business domains.
- `production/` — deployment, runtime verification, release gates and known limitations.
- `security/` — identity, authorization, privileged access and database security.
- `runbooks/` — operational response and team handover.
- `history/` — historical phase reports retained for traceability.
- `fusion/` — integration and convergence records.
- `adr/` — architecture decision records.

## Historical catalog

The full topic-by-topic index from the prior archive organization is retained in [DOCUMENT_CATALOG_20261010.md](DOCUMENT_CATALOG_20261010.md). Treat historical reports as evidence of what was recorded at that time; verify current code, environment and provider state before relying on them.

## Runtime contract

- Node.js `>=22.22.2` as declared in `.nvmrc`, `.node-version` and package manifests.
- Root package manager workflow: npm (`npm ci` in CI); `bun.lock` is retained pending an explicit package-manager policy decision.
- Frontend: Vite, port `3000` by default.
- Backend: Node/Express, port `5000` by default.
- Database: Supabase/Postgres migrations in `supabase/migrations/`.
- Production deployment: `.github/workflows/deploy.yml`; deployment status must be verified against the actual target and commit.

## Safety rules for maintenance

- Do not rewrite migration history or edit already-applied migrations; add forward migrations and validate them in staging.
- Do not change payment, ledger, escrow, auction settlement, authorization or RLS paths as part of cosmetic cleanup.
- Do not delete a file solely because it is duplicated by hash. Check imports, route wiring, exports, scripts, deployment references and historical evidence.
- Do not commit secrets. Use the environment examples only as variable-name documentation.
- Keep the source archive and release evidence immutable; make changes on a working copy and produce a manifest for each handover ZIP.
- A static audit is not a substitute for dependency installation, automated tests, staging validation or live production certification.
