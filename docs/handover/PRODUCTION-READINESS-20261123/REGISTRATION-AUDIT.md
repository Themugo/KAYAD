# Registration audit
- Hosted `kayad_register_identity_atomic` is a placeholder raising SQLSTATE 2F005, so registration returns PostgREST 400. **Confirmed + reproduced locally.**
- `20261122200000_restore_register_identity_atomic.sql` restores the 10-parameter function with preflight/post-check and writes `private_seller_capabilities` only if that table exists; role protections: new self-registrations are `user`/dealer paths only, never `individual_seller`. Rehearsed on the local replica (journeys 02, 20 pass). **Verified locally; not applied to production (needs owner approval).**
- It does not fix login or invitations; those are separate (see LOGIN-AND-AUTH-AUDIT.md, INVITATION-ACCEPTANCE-AUDIT.md).
- Undefined objects used by code but defined in no migration: `error_budgets`, `marketplace_healths`, `kayad_owner_snapshot`. Classification: **Suspected externally provisioned or obsolete; evidence incomplete.** Owner must say which; no code was changed.
