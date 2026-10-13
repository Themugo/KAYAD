-- ############################################################################################################################
-- NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION
-- CANDIDATE (Stage 3, 2026-10-13; NOT a migration). Aligns ONE column of the pre-existing production table
-- public.inspector_applications with the application contract. Nothing else about that table is changed.
--
-- Purpose ......... Production's inspector_applications (created outside this repository; read-only catalog 2026-10-13, Stage 2 S8)
--                   has years_of_experience INTEGER. The API contract (backend/validation/inspectorApplication.schema.js:
--                   z.coerce.number().finite().min(0).max(80)), the client validator (src/components/onboarding/validation.ts) and the
--                   repository definition (20261001090000: NUMERIC(5,2) CHECK 0..80) all accept fractional years, e.g. 2.5.
--                   Against production such a submission fails at INSERT: PostgREST decodes the JSON body with json_populate_recordset,
--                   which raises 'invalid input syntax for type integer: "2.5"' → HTTP 500 (reproduced on PG 17.6/16.15). (A SQL literal
--                   would instead be silently ROUNDED by the integer assignment cast — also wrong.)
--                   The onboarding chain cannot fix this: its CREATE TABLE IF NOT EXISTS keeps the production shape (Stage 2 S8).
-- Affected object . public.inspector_applications.years_of_experience: INTEGER → NUMERIC(5,2) (widening; every integer 0..999 fits),
--                   plus CHECK inspector_applications_years_of_experience_range (0..80), the same bound as the repository and the API.
-- Not changed ..... nullability, defaults, text[] columns (PostgREST maps JSON arrays to text[] in both directions, so specialties,
--                   certifications and preferred_regions are already compatible), status (no CHECK in production; the API only writes
--                   pending/approved/rejected), indexes, RLS, grants, triggers, rows.
-- Preconditions ... table exists; column type is integer OR already numeric(5,2) (then no-op); no existing row outside 0..80 (fails
--                   loudly, never clamps data). Live 2026-10-13: 0 rows.
-- Lock ............ ALTER COLUMN TYPE rewrites the table under ACCESS EXCLUSIVE — trivial at 0 rows; schedule if rows grow.
-- Idempotency ..... Re-running is a no-op (type already numeric(5,2); CHECK created only if absent).
-- Transaction ..... Single transaction.
-- Security impact . None.
-- Rollback ........ ALTER TABLE public.inspector_applications DROP CONSTRAINT IF EXISTS inspector_applications_years_of_experience_range;
--                   ALTER TABLE public.inspector_applications ALTER COLUMN years_of_experience TYPE integer USING round(years_of_experience)::integer;
--                   (rounds any fractional values written after the change — data-lossy, hence restore-from-backup is the faithful undo).
-- Order ........... Independent; may run before or after the onboarding chain.
-- Decision ........ OWNER DECISION D-INSP-1: apply this (keep fractional years) OR restrict the API/client to whole years instead.
-- Tested by ....... scripts/rehearse-stage3-lead-privileges-local.sh (I1) on PostgreSQL 17.6 and 16.15 with the production shape.
-- ############################################################################################################################
BEGIN;
DO $insp$
DECLARE v_type text; v_bad bigint;
BEGIN
  IF to_regclass('public.inspector_applications') IS NULL THEN
    RAISE EXCEPTION 'INSPECTOR_V1 precondition: public.inspector_applications is missing';
  END IF;
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_type
    FROM pg_attribute a WHERE a.attrelid = 'public.inspector_applications'::regclass AND a.attname = 'years_of_experience' AND NOT a.attisdropped;
  IF v_type IS NULL THEN
    RAISE EXCEPTION 'INSPECTOR_V1 precondition: column years_of_experience is missing';
  END IF;
  EXECUTE 'SELECT count(*) FROM public.inspector_applications WHERE years_of_experience < 0 OR years_of_experience > 80' INTO v_bad;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'INSPECTOR_V1 precondition: % row(s) have years_of_experience outside 0..80 — resolve with the owner; nothing changed', v_bad;
  END IF;
  IF v_type = 'integer' THEN
    ALTER TABLE public.inspector_applications ALTER COLUMN years_of_experience TYPE numeric(5,2) USING years_of_experience::numeric(5,2);
  ELSIF v_type <> 'numeric(5,2)' THEN
    RAISE EXCEPTION 'INSPECTOR_V1 precondition: unexpected type % for years_of_experience — stop and investigate', v_type;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inspector_applications'::regclass AND contype = 'c'
                   AND pg_get_constraintdef(oid) ILIKE '%years_of_experience%') THEN
    ALTER TABLE public.inspector_applications ADD CONSTRAINT inspector_applications_years_of_experience_range
      CHECK (years_of_experience IS NULL OR (years_of_experience >= 0 AND years_of_experience <= 80));
  END IF;
END
$insp$;
COMMIT;

-- ── Read-only verification ──────────────────────────────────────────────────────────────────────────────────────────────
-- select format_type(atttypid, atttypmod) from pg_attribute where attrelid='public.inspector_applications'::regclass and attname='years_of_experience';  -- numeric(5,2)
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.inspector_applications'::regclass and contype='c';
-- select count(*) from public.inspector_applications;   -- unchanged
