# Phase 5 System Health — Baseline Audit

## Foundation and environment
- Foundation: `KAYAD-SUPER-ADMIN-PHASE3-FOUNDATION-ZIP05.zip`
- Foundation SHA-256: `601443cf6bb09704748aff70c6f0d840d88aa7578a5d65b378f17c960d8b66b6`
- Foundation ZIP integrity: PASS (`unzip -tq`, no compressed-data errors; 6,673 archive entries)
- Root: `KAYAD-main/`
- Package manager: npm; `package-lock.json` is present.
- Required Node: `>=22.22.2`; `.nvmrc` and `.node-version` both specify `22.22.2`.
- Available Node: `v22.16.0` (incompatible); `node_modules/` absent.
- Git metadata is not present in the delivered ZIP, so commit/status comparison is unavailable.

## Canonical component and route map
- Super Admin command centre: `src/features/AdminView.tsx`, mounted at `/admin`.
- The System Health summary in AdminView links to `/admin/control-room` and deliberately avoids assuming health without a check.
- Canonical destination: `src/pages/admin/OperationsControlRoom.jsx`, mapped in `src/components/admin/AdminRouteSurface.tsx` as `/admin/control-room`, marked `superadminOnly: true`.
- Existing backend health contract: `GET /api/ecp/health`, mounted in `backend/server.js` from `backend/routes/ecpRoutes.js`.
- `ecpRoutes.js` applies `protect` and `allowRoles("admin", "superadmin", "engineer", "manager")`; the page route remains Super Admin restricted. No access guard was relaxed.
- Health implementation: `backend/controllers/ecpController.js` delegates to `backend/services/ecpService.js`.

## Health contract
- `GET /api/ecp/health` returns `{ success, data: { services, summary, checkedAt } }`.
- Each service check reports `name`, `status`, measured `latency` in milliseconds and a generic error string on failure.
- Existing checks perform read-only count queries for `users`, `cars`, `payments`, `vehicle_inspections`, `search_analytics`, and `notifications`.
- These checks prove that the relevant backend data query succeeded at check time. They do **not** prove external payment-provider connectivity, email/SMS delivery, uptime percentage, queue-worker operation, or provider acceptance.
- The backend measures elapsed check duration using monotonic `performance.now()`; the UI labels it “Check duration” rather than provider latency or uptime.
- Check failures map to `degraded`; the UI never treats missing/malformed statuses as healthy.

## Legacy/dormant health surfaces discovered
- `src/pages/admin/OperationsDashboard.jsx` contains a `setTimeout`-driven simulation with hardcoded uptime, service statuses, latency percentiles, active sessions, queue counts and payment/escrow statistics. It is not the component mapped to the canonical `/admin/control-room` route in `AdminRouteSurface.tsx`; it was left unchanged to avoid reviving or broadening a dormant alternate dashboard.
- `src/pages/admin/ControlRoom.jsx` is also not the canonical `/admin/control-room` route target. It calls `/admin/system/health`, whose legacy backend handler derives a top-level “healthy/warning” status from critical alert count and domain counts, not service-level infrastructure checks. It was not substituted for the canonical Control Room.

## Confirmed defects
1. **High — canonical control-room health display was not backed by the health contract.** It consumed `data.systemHealth` from the metrics response and rendered arbitrary percentage bars, which are not supplied by the verified health service contract.
2. **High — status/latency presentation was semantically unsupported.** The old panel presented percentages rather than the measured check duration available from the real service checks.
3. **Medium — service-check exceptions could return raw exception text.** The health service returned `e.message` to authenticated dashboard consumers. The response now returns a generic `Health check failed` message while preserving the degraded status.
4. **Separate existing issue, not silently conflated with Phase 5:** `adminAPI.getOperationsMetrics()` requests `/admin/operations/metrics`, but no matching backend route registration was found. This affects the wider Control Room’s metrics/alerts/activity panels and remains unresolved because the actual response contract is not equivalent to that component’s expected shape. Health checks were decoupled from that request so the health panel can still load. It must be addressed in a separately scoped operations-metrics convergence task.

## Baseline runtime results
- Baseline source inspection: completed.
- Existing focused browser tests: could not execute because `node_modules/` is absent and Node is below the project engine requirement.
- Production build/typecheck: not certifiable in this environment; exact results are recorded in `PHASE5-SYSTEM-HEALTH-VALIDATION-RESULTS.md`.
- Public marketplace changes: none intentionally made; changes are limited to the health API adapter, Control Room health panel, health service error sanitization, focused test and Phase 5 reports.
