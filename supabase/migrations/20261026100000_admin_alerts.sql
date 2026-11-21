-- Phase 13G (Defect A): public.admin_alerts — the table behind GET /api/admin/alerts (admin sidebar unread badge, command-center
-- alerts panel, system-health count) and written by reconciliationService.sendAlerts(). It was referenced by backend/models/_base.js
-- (AdminAlert -> "admin_alerts") but had no DDL anywhere, so every admin page produced HTTP 500 (Phase C1 R-19, Phase 13F R4).
-- Columns are derived ONLY from the existing code contract:
--   writer  backend/services/reconciliationService.js sendAlerts():   { type, severity, data{...}, read:false }
--   readers backend/routes/adminRoutes.js (/alerts, /alerts/:id/read, /alerts/read-all, /system/health),
--           backend/controllers/reconciliationController.js (type='payment_failure', severity filter, read flag, createdAt sort)
-- Additive: no existing table, column, policy or function is altered. Not exposed to anon/authenticated (RLS on, no policies):
-- only the backend service role reads or writes it, behind protect + adminOnly.
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  severity    text NOT NULL DEFAULT 'info',
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_read_created ON public.admin_alerts (read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_type_read ON public.admin_alerts (type, read);

DROP TRIGGER IF EXISTS trg_admin_alerts_updated_at ON public.admin_alerts;
CREATE TRIGGER trg_admin_alerts_updated_at BEFORE UPDATE ON public.admin_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_snake();

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_alerts FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.admin_alerts IS 'Phase 13G: staff-facing alert feed (reconciliation payment_failure alerts and others). Service-role only; RLS on with no policies.';
