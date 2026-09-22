# KAYAD Supabase Migration-History Reconciliation

Generated: 2026-09-22
Project: KAYAD EA (`ubvgixwhfybbyjuvxboj`)

## Evidence
- Canonical repository migrations in the foundational ZIP: 102
- Live Supabase migration-history entries after the three forward reconciliation migrations: 131
- Exact semantic matches: 97
- Exact semantic matches requiring timestamp remap: 21
- Remote-only migration-history entries: 34
- Local-only migration files: 5

## Applied to this archive
The 21 uniquely matched migrations with differing remote timestamps have been renamed to the **remote-applied timestamp + normalized semantic name**. SQL content is unchanged.

This is a repository-history normalization step only. It does not modify Supabase.

## Local-only migrations
- `20260908070000_inspection_workforce_digital_lifecycle_hardening.sql` — obsolete historical digital-inspection architecture; do not reapply.
- `20260908080000_governance_lifecycle_hardening.sql` — historical governance hardening; active guarantees are restored by the forward reconciliation migration.
- `20260908113000_communications_support_lifecycle_hardening.sql` — historical/superseded communications-support implementation; do not reapply blindly.
- `20260920203000_canonical_system_status_control_plane.sql` — superseded by the forward reconciliation migration.
- `20260920220000_phase22_reconciliation.sql` — idempotent Phase 22 schema already present live; retain as source material until remote-only Phase 22 effects are consolidated.

## Remote-only history
34 remote entries remain without a semantic counterpart in the repository. These are predominantly the 2026-09-19/20 hardening chain.

They must NOT be marked reverted merely because their files are absent. Their schema effects must first be proven to be represented elsewhere in the canonical source or captured in a new forward migration.

## Production safety
DO NOT run:
- `supabase db reset --linked`
- `supabase db push --include-all`
- bulk `supabase migration repair --status reverted`

until the 34 remote-only effects have been reconciled.

Supabase documents that migration history is tracked separately from schema state and that `migration repair` changes tracking only; it does not apply or revert SQL. The correct repair point is after schema-effect equivalence is established.

