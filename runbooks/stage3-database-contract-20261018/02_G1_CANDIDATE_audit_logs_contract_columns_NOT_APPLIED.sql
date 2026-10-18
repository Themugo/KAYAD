-- ************************************************************************************
-- SUPERSEDED (Stage 3A, 2026-10-18): G1 is now resolved at SOURCE level by the canonical
-- serializer backend/utils/auditLogRow.js + audit_logs aliases in backend/utils/fieldMap.js,
-- which write ONLY the 10 existing columns. The application no longer sends the columns
-- below, so this migration is NOT required. Kept for history / if the owner later wants
-- first-class columns instead of details-jsonb (then the serializer must be updated too).
-- ************************************************************************************
-- KAYAD Stage 3 — G1 CANDIDATE (NOT APPLIED; NOT a file in supabase/migrations).
-- Purpose: align public.audit_logs with the columns the application already writes and reads
--   (writers: governanceController, adminRoutes x22, announcementController, bulkAdminController,
--    middleware/auditLog, middleware/rbac access_denied, services/auditService.logAuditEvent;
--    readers: auditController filters/populate on actor/target, governanceController.getAuditLogs).
-- Preconditions: 01 preflight G1-b shows these columns absent on the identified target; owner approval;
--   applied on an isolated staging branch first; backend unchanged (additive, nullable → existing rows/readers unaffected).
-- Type choices: actor/admin_id/user_id = uuid (every writer passes req.user.id); target = text (some targets are labels, e.g. "Referral <id>").
-- Promote into supabase/migrations with a new 14-digit version only after approval.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor        uuid,
  ADD COLUMN IF NOT EXISTS actor_email  text,
  ADD COLUMN IF NOT EXISTS target       text,
  ADD COLUMN IF NOT EXISTS target_model text,
  ADD COLUMN IF NOT EXISTS target_name  text,
  ADD COLUMN IF NOT EXISTS old_value    jsonb,
  ADD COLUMN IF NOT EXISTS new_value    jsonb,
  ADD COLUMN IF NOT EXISTS changes      jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS user_agent   text,
  ADD COLUMN IF NOT EXISTS request_id   text,
  ADD COLUMN IF NOT EXISTS session_id   text,
  ADD COLUMN IF NOT EXISTS severity     text,
  ADD COLUMN IF NOT EXISTS admin        text,
  ADD COLUMN IF NOT EXISTS admin_id     uuid,
  ADD COLUMN IF NOT EXISTS user_id      uuid,
  ADD COLUMN IF NOT EXISTS metadata     jsonb;
CREATE INDEX IF NOT EXISTS audit_logs_actor_created_idx  ON public.audit_logs (actor, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_target_created_idx ON public.audit_logs (target_model, target, created_at DESC);
-- RLS stays enabled; no policy is added (server uses service_role; anon/authenticated remain deny-by-default
-- when no permissive policy exists — confirm with preflight G1-d before relying on that).
COMMIT;
-- Rollback (only if no rows have used the new columns; otherwise data loss): ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS ... ;
