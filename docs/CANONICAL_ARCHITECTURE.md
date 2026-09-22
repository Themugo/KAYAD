# KAYAD Canonical Production Architecture

## Rule
One production implementation per business domain. Compatibility URLs may remain, but they delegate to canonical domain services and canonical Supabase tables/RPCs.

## Inspection
- Provider marketplace: `backend/inspection/`
- Booking lifecycle: `inspection_bookings`
- Execution record: `vehicle_inspections`
- Reports: `inspection_reports`
- Settlement: `inspection_settlements` and canonical financial RPCs
- Disputes: Phase 22 inspection/service-job RPCs
- Realtime/chat: canonical inspection bridge and Socket.IO
- Legacy `/api/inspections/*` URLs are compatibility aliases to the canonical inspection implementation.
- The dormant `digital_inspections`/`inspection_stages`/`inspection_evidence`/`inspection_defects`/`inspection_audit_logs` subsystem is removed from the shipping application.

## Payments and finance
Payment, escrow, settlement and ledger mutations remain behind the canonical atomic RPC/service boundaries. Compatibility adapters must never create a second financial implementation.

## API
`backend/openapi.yaml` is the maintained API contract. Historical aliases may remain documented while implementation converges on canonical services.

## Database
Supabase migrations are single-extension `.sql` files. Schema changes are forward-only migrations; production schema is not patched directly.
