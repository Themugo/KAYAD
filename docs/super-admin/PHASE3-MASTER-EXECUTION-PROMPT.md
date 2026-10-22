# KAYAD SUPER ADMIN — PHASE 3 MASTER EXECUTION PROMPT
## Dashboard Foundation, Evidence-First Convergence, and Foundational ZIP 04

### Foundation
Use `KAYAD-SUPER-ADMIN-PHASE2-CERTIFICATION-CANDIDATE.zip` as the sole source of truth for this phase. Verify its SHA-256 before extraction and record the result. The supplied candidate SHA-256 is:
`25b93e21d4c5a85261a215163d7b5790ab122fdd1725e5738e67239933214cfc`

### Mission
Execute Phase 3 only: establish a trustworthy, stable, visually coherent foundation for the existing KAYAD Super Admin dashboard. Audit first, implement only confirmed in-scope fixes, validate, then produce the immutable checkpoint `KAYAD-SUPER-ADMIN-PHASE3-FOUNDATION-ZIP04.zip`.

### Non-negotiable constraints
- Do NOT start over, redesign, or replace the application.
- Do NOT redesign public marketplace pages or change their layout, routes, content, or behavior.
- Do NOT introduce a second marketplace, mock inventory, fake records, invented staff, fake metrics, synthetic health indicators, or invented events.
- Do NOT change the established information architecture, navigation destinations, backend contracts, database schema, authentication model, role boundaries, or permission semantics.
- Do NOT delete user/dealer/listing/auction/financial records or reset databases.
- Do NOT expose secrets, change production environment variables, run migrations against production, deploy, push commits, or perform destructive operations.
- Preserve existing components and reusable dashboard primitives wherever practical. Prefer minimal, reversible patches.
- Treat all displayed metrics as untrusted until their source is traced to an existing API/data contract. If data cannot be verified, show an honest unavailable/loading/error state rather than a fabricated number.
- Never mark health as healthy based on a timeout, a placeholder, a simulated delay, a hardcoded object, or a successful frontend build.

### Required sequence
1. **Integrity and inventory**
   - Verify the input ZIP hash and archive integrity.
   - Extract into a clean isolated working directory.
   - Record Git metadata if available, Node version, package manager/lockfiles, and existing scripts.
   - Identify the canonical Super Admin dashboard route, components, API calls, shared styles/tokens, and relevant tests. Do not assume a similarly named operations dashboard is the canonical dashboard; prove it from route configuration.
2. **Baseline audit**
   - Inspect the entire canonical dashboard and imported components.
   - Trace each metric, chart, notification, activity item, dealer card, and quick action to its real source and destination.
   - Flag hardcoded or simulated values, stale labels, misleading timestamps, placeholder success/error states, inaccessible controls, dead links, responsive overflow, and duplicated styling.
   - Capture baseline screenshots at desktop (1440×900), tablet (768×1024), and mobile (390×844), if browser tooling is available. If not available, state that plainly and do not fabricate screenshots.
   - Run baseline typecheck/build and the narrow relevant test set before edits; record exact commands and outcomes.
3. **Phase 3 implementation**
   - Make only confirmed foundation-level corrections: visual hierarchy, consistent alignment, card/table spacing, keyboard focus, semantic labels, accessible contrast, resilient loading/empty/error states, and responsive behavior within the existing dashboard structure.
   - Keep existing navigation and information architecture intact.
   - Do not expand into the dedicated Phase 4 approval queues, Phase 5 system health redesign, Phase 6 right-side administration panel, Phase 7 operational content cards, Phase 8 team/RBAC/calendar refinement, Phase 9 global design-system sweep, or Phase 10 final certification except where a narrow dependency is necessary to keep Phase 3 safe.
   - Do not silently invent values. Where source contracts are absent, document the gap and leave a truthful state.
4. **Validation**
   - Run `npm ci` only when lockfile and environment make it appropriate; otherwise explain the blocker.
   - Run the existing typecheck, production build, relevant unit tests, and focused dashboard checks. Never claim tests passed unless the commands actually ran and returned success.
   - Check for accidental public-page changes, route changes, API contract changes, permissions regressions, secrets, and generated artifacts.
   - Compare screenshots before/after when available.
5. **Delivery**
   - Produce `PHASE3-EXECUTION-REPORT.md` containing source hash, changed files, findings, each command/result, tests not run and why, known defects deferred to later phases, and explicit deployment status.
   - Produce `PHASE3-CHANGE-MANIFEST.sha256` for key deliverables and record the output ZIP SHA-256 separately.
   - Package the complete project source as `KAYAD-SUPER-ADMIN-PHASE3-FOUNDATION-ZIP04.zip`, preserving the original folder structure and lockfiles. Exclude only clearly disposable caches/build outputs if safe; never exclude source, migrations, tests, configuration, or release manifests.
   - Re-open the resulting ZIP, verify archive integrity, confirm critical files exist, and verify its hash.
   - Do not claim production-ready or deployed unless independent runtime checks support that claim.

### Exit criteria
Phase 3 is complete only when the dashboard changes are traceable, the application builds, relevant tests pass (or clearly documented blockers remain), the output archive verifies, and the report accurately distinguishes verified facts from assumptions. If a safe patch cannot be justified, deliver the audit and checkpoint with a clear “audit-only / implementation deferred” status rather than making speculative changes.

### Next phase boundary
Stop after Phase 3 and ZIP 04. Do not execute Phase 4–10 in this run. The next phase is Phase 4 — Approval Workflows.
