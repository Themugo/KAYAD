# KAYAD Repository Guide

## Purpose
This guide identifies the canonical homes for maintained documentation and historical evidence. It does not replace application architecture or runtime configuration.

## Canonical documentation areas
- `docs/architecture/` — maintained architecture and system-design documentation.
- `docs/security/` — security, authorization, and access-control documentation.
- `docs/runbooks/` and `docs/production/` — operational procedures and production guidance.
- `docs/auction-360/` and `docs/domains/` — domain-specific documentation.
- `docs/repository-convergence/` — the repository organization phases and their evidence as produced by those phases.
- `docs/history/legacy-root-evidence/` — historical reports and evidence that previously lived at repository root, grouped by subject.

## Historical evidence categories
- `administration/` — admin and staff operations.
- `commerce-and-auctions/` — auction, financial, payment, and ledger evidence.
- `marketplace-operations/` — dealer, seller, buyer, vehicle, listing, and inventory evidence.
- `repository-governance/` — repository structure, checksums, ownership, consumer, and handover evidence.
- `runtime-and-operations/` — runtime, release, staging, support, and operational evidence.
- `security-and-identity/` — authentication, authorization, identity, RLS, and security evidence.
- `general-project-evidence/` — other historical project reports not confidently assigned to a narrower subject.

## Naming and preservation policy
Historical filenames are retained where they encode chronology or provenance. A phase/stage number in an archived historical filename is not itself a reason to delete or rewrite the record. Maintained documents should use stable, subject-oriented names. Historical manifests remain historical snapshots; use the current Phase 16 manifest for the reorganized tree.

## Root-file policy
Keep root-level files only when required by tools, package managers, deployment systems, source control, or common contributor workflows. Historical reports and evidence should not be added to the root. Phase-labelled operational scripts remain at root when consumer safety has not been established; they are listed as unresolved candidates rather than silently renamed.

## Phase 16 records
See `docs/repository-convergence/phase-16/` for the execution report, path mapping, operation ledger, validation results, blocker register, and current-state manifest.
