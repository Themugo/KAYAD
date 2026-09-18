# INSPECTION DOMAIN HARDENING — 2026-09-18

This release integrates the canonical inspection lifecycle hardening and focused inspection-domain RLS access migration into the current clean KAYAD source tree.

Database migrations are source-controlled only in this package; they are NOT executed by packaging or Git push. Apply/test them against the KAYAD Supabase project through the normal migration process after reviewing the preflight SQL.

The broader project-wide RLS/performance advisor backlog remains intentionally untouched.
