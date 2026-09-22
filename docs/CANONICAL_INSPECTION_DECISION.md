# Canonical Inspection Decision

## Production architecture

KAYAD has one canonical inspection domain under `backend/inspection/`.

- `inspection_bookings` is the customer/provider booking lifecycle.
- `vehicle_inspections` is the canonical inspection execution record.
- `inspection_reports` is the canonical report record.
- `inspection_settlements` and the canonical financial RPCs own settlement and payout effects.
- Phase 22 RPCs own provider registration, reviews, report entitlements and dispute consequences.
- The existing inspection/chat bridge uses `vehicle_inspections` and the canonical chat transport.
- `/api/inspection/*` is the canonical API namespace.
- `/api/inspections/*` remains as a compatibility alias to the same router so existing clients do not break.

## Removed architecture

The dormant `digital_inspections`, `inspection_stages`, `inspection_points`, `inspection_evidence`, `inspection_defects`, and `inspection_audit_logs` implementation is not part of the shipping application and has been removed from the source tree.

The API field name `digitalInspectionId` may remain in compatibility responses because it is an established client contract. It is an alias of the canonical `vehicle_inspections.id`, not a reference to a second table or service.

## Migration rule

The old dormant-schema migrations remain historical evidence only. They are not to be reintroduced into the production schema. New database hardening is forward-only and must target the canonical tables/RPCs.
