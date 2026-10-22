# Relocation Dependency Checklist

Before any future move, require all of the following:

- [ ] User approves the exact path map and scope.
- [ ] Confirm source and destination ownership and provenance.
- [ ] Search imports, re-exports, dynamic imports, aliases, and framework conventions.
- [ ] Search scripts, package manifests, lock/workspace settings, and working-directory assumptions.
- [ ] Search tests, fixtures, snapshots, globs, validators, and documentation links.
- [ ] Search CI/CD, Vercel/Render/container/host configs and deployment roots.
- [ ] Search runtime filesystem access, static asset strings, template loading, and upload paths.
- [ ] Verify migration discovery, ordering, and RLS policy paths if relevant.
- [ ] Preserve byte-identical duplicates and historical artifacts unless separately approved.
- [ ] Create a reversible change set and record old/new SHA-256 values.
- [ ] Run the narrowest relevant tests, then full local typecheck/build/test suite when dependencies and environment permit.
- [ ] Verify deployed configuration separately; do not deploy during structural changes without approval.
- [ ] Compare before/after file inventory and hashes.
- [ ] Produce a rollback ZIP and exact rollback commands.

No checklist item is marked complete merely from static inspection.
