# KAYAD AUCTION 360 — Stage 9: Escrow Capability Matrix
**Date:** 2026-10-08

Every row below is directly proven by `backend/tests/escrow/escrowCapability.service.test.js`
(24 tests) unless marked otherwise. "RLS" is the same answer for every row
(see `ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md` Step 9A Q7): RLS
is enabled on `users`/`cars` but bypassed by the backend's service-role
Supabase connection for every query in this codebase; the real and only
enforcement is the Express middleware chain, noted per-row as which layer
applies.

| Actor | Target | Operation | Required authority | Previous state | New state | Vehicle association | Seller/dealer association | Account association | Public badge result | Purchase-policy result | RLS | Audit trail | Idempotency | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Superadmin | individual_seller (never-touched) | GRANT | `CONFIGURE_ESCROW` (route) + `MANAGE_ESCROWS` (path gate) | `none` (pre-Stage-9 backfill set `granted`, so this row models a seller whose status an admin reset to `none` first) | `granted` | Not cascaded (grant is prospective-only) | `escrow_capability_granted_by`=admin id, `_updated_at` set | n/a (no per-dealer account exists) | Vehicle badge becomes ESCROW on next create/edit | Purchase decision becomes `true` once a vehicle is created/edited under the new status | Bypassed; Express-enforced | `logActionFromReq("escrow_capability_changed")` | Re-granting is a no-op success, no re-cascade | **PASS** |
| Superadmin | dealer (never-touched) | GRANT | same as above | `none` | `granted` | Not cascaded | Recorded | n/a | Badge becomes ESCROW on next create/edit — **closes the Stage 8 gap: dealer escrow was previously impossible under any circumstance** | Purchase decision becomes `true` for that dealer's future-created/edited vehicles | Bypassed; Express-enforced | Logged | No-op on repeat | **PASS** |
| Superadmin | individual_seller (currently `granted`) | REVOKE | same as above | `granted` | `revoked` | **Cascaded immediately**: every one of the seller's `cars` rows set `escrow_enabled=false` | Recorded | n/a | Badge disappears from every existing vehicle of this seller immediately (not just at next edit) | Purchase decision becomes `false` immediately for every existing vehicle, and for any new/edited one | Bypassed; Express-enforced | Logged, includes `cascadedVehicleRevocation: true` | Re-revoking is a no-op success, no re-cascade (already cascaded once) | **PASS** |
| Superadmin | dealer (currently `granted`) | SUSPEND | same as above | `granted` | `suspended` | Cascaded immediately, identical to REVOKE | Recorded | n/a | Badge disappears immediately | Purchase decision becomes `false` immediately | Bypassed; Express-enforced | Logged | No-op on repeat | **PASS** |
| Superadmin | seller (currently `suspended`) | RESTORE | same as above | `suspended` | `granted` | Not cascaded (restore == grant, prospective-only) | Recorded | n/a | Badge does not retroactively reappear on vehicles whose flag was cascaded off; reappears on next create/edit | Purchase decision becomes `true` again for future-created/edited vehicles | Bypassed; Express-enforced | Logged | No-op on repeat | **PASS** |
| Superadmin | self (`adminUser.id === targetUserId`) | GRANT (attempted) | n/a — rejected before any authority check matters | unchanged | unchanged (rejected, 403, before any DB read) | unchanged | unchanged | n/a | unchanged | unchanged | n/a | No write occurs | n/a | **FAIL (expected) — self-grant prevention** |
| Superadmin | nonexistent user id | GRANT (attempted) | `CONFIGURE_ESCROW` satisfied, but target lookup fails | n/a | unchanged (rejected, 404) | unchanged | unchanged | n/a | unchanged | unchanged | n/a | No write occurs | n/a | **FAIL (expected) — target validation** |
| Superadmin | plain `user`/`admin` role target | GRANT (attempted) | `CONFIGURE_ESCROW` satisfied, but role ineligible | `none` | unchanged (rejected, 400) | unchanged | unchanged | n/a | unchanged | unchanged | n/a | No write occurs | n/a | **FAIL (expected) — role-eligibility validation** |
| Superadmin | any seller | Any op with an invalid `status` string | `CONFIGURE_ESCROW` satisfied, but request malformed | unchanged | unchanged (rejected, 400, schema-level) | unchanged | unchanged | n/a | unchanged | unchanged | n/a | No write occurs | n/a | **FAIL (expected) — schema validation** |
| Ordinary `user` / `dealer` (no `CONFIGURE_ESCROW`) | any seller | GRANT/REVOKE (attempted) | Missing `CONFIGURE_ESCROW` and/or `MANAGE_ESCROWS` | unchanged | unchanged (rejected, 403, at the route's `requirePermission` gate, before the handler runs) | unchanged | unchanged | n/a | unchanged | unchanged | n/a | `access_denied` AuditLog entry (existing `requirePermission` behavior, unchanged by this stage) | n/a | **FAIL (expected) — authorization gate** |
| Buyer (any role) | a specific car/vehicle whose seller capability is `granted` and vehicle flag `true` | READ (view listing / initiate escrow purchase) | Authenticated buyer; no admin permission required (this is a customer-facing read/purchase, not an admin operation) | n/a | n/a | `cars.escrow_enabled = true`, re-checked live at read/purchase time | Seller `escrow_capability_status = granted`, re-checked live | `escrows.custodian_account` set on real escrow creation (unchanged, pre-existing linkage) | **ESCROW badge shown** | **Escrow record created** | n/a (customer read, not an admin surface) | n/a (not an admin action) | Repeated reads are naturally idempotent (pure read) | **PASS — badge and purchase agree** |
| Buyer (any role) | a specific car/vehicle whose seller capability is `revoked`/`suspended` (vehicle flag cascaded to `false`) | READ (view listing / attempt escrow purchase) | same as above | n/a | n/a | `cars.escrow_enabled = false` | Seller `escrow_capability_status != granted` | n/a | **ESCROW badge NOT shown** | **No escrow record created** (falls back to non-escrow payment type, or is rejected per the generic payment-type rules — unchanged, pre-existing behavior for `useEscrow=false`) | n/a | n/a | Repeated reads are naturally idempotent | **PASS — badge and purchase agree (this is the hard requirement the master prompt forbids ever violating)** |

## Exit criteria cross-check

- [x] Authorized admin can grant escrow capability — row 1/2.
- [x] Authorized admin can revoke escrow capability — row 3.
- [x] Authorized admin can suspend/restore capability — rows 4/5.
- [x] Capability is server-authoritative — the client only ever submits
      `status`/`reason`; the admin identity and every written field come
      from server-side session state and server clocks, never from the
      request body.
- [x] Capability is associated with the actual seller/dealer/user —
      `escrow_capability_status` lives on the specific `users.id` row
      targeted, validated to exist and be role-eligible before any write.
- [x] Capability can be associated with the actual vehicle/listing —
      `cars.escrow_enabled`, derived per-car from its owner's capability at
      create/edit time, cascaded immediately on revoke/suspend.
- [x] Vehicle with escrow capability displays ESCROW badge — row 11.
- [x] Vehicle without capability does not display ESCROW badge — row 12.
