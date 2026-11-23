# Database restore and reconciliation
Status: **Blocked pending owner approval**: no owner-approved full dump has been supplied; hosted has no backups/PITR (Free plan). The steps (dump → isolated local restore → counts/migration history → checksum + sanitized evidence → re-compare) are in BACKUP-AND-RESTORE.md.
Done without a dump: read-only catalog comparison and schema-only replica; lineage of 22 functions; dependency graph (MIGRATION-DEPENDENCY-GRAPH.md); group-by-group rehearsal plan (PRODUCTION-RECONCILIATION-PLAN.md). Nothing was written to production.
See also FUNCTION-DRIFT-INVENTORY.md.
