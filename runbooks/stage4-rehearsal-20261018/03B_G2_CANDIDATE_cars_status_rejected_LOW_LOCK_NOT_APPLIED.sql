-- KAYAD Stage 4 — G2 CANDIDATE, LOW-LOCK VARIANT (NOT APPLIED). NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION.
-- Supersedes the single-transaction Stage 3 candidate (../stage3-database-contract-20261018/03_G2_CANDIDATE_…) for production-sized data.
-- Still requires owner decision D3 = "rejected is a canonical listing status".
--
-- Purpose:       let public.cars.status hold 'rejected' (written by admin moderation, duplicate removal and the report queue,
--                read by bidController/auctionController) without a long exclusive lock on public.cars.
-- Why a variant: the Stage 3 candidate runs DROP CONSTRAINT and VALIDATE CONSTRAINT in ONE transaction. DROP takes ACCESS EXCLUSIVE
--                on cars and keeps it until COMMIT, so the full-table validation scan runs while every read and write on cars waits
--                (rehearsal evidence: evidence/stage4-20261018/g2_lock_demo.txt). This variant validates BEFORE the swap, under
--                SHARE UPDATE EXCLUSIVE, which allows normal reads and writes to continue.
-- Preconditions: preflight G2-a shows the live definition; G2-b shows no status outside the new list; a verified backup exists;
--                target identified as the approved staging/rehearsal database (never an unidentified host).
-- Idempotency:   step 1 fails harmlessly if cars_status_check_v2 already exists (drop it first); step 3 uses IF EXISTS on the old name.
-- Transaction:   three independent steps, each short. While both constraints exist the effective rule is the intersection
--                (the old constraint still rejects 'rejected'), so behaviour does not change until step 3 commits.
-- Abort:         step 2 error 23514 = a row holds a status outside the new list. Run the Rollback (step 1 undo), investigate that
--                data, and do not proceed to step 3.
-- Rollback:      before step 3:  ALTER TABLE public.cars DROP CONSTRAINT cars_status_check_v2;
--                after step 3 (only valid while NO row has status = 'rejected'):
--                  ALTER TABLE public.cars DROP CONSTRAINT cars_status_check;
--                  ALTER TABLE public.cars ADD CONSTRAINT cars_status_check CHECK (status IN ('available','sold','pending','reserved','hidden','draft'));

-- STEP 1 — add the new rule without scanning existing rows (brief lock only).
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.cars ADD CONSTRAINT cars_status_check_v2
  CHECK (status IN ('available','sold','pending','reserved','hidden','draft','rejected')) NOT VALID;
COMMIT;

-- STEP 2 — validate existing rows. SHARE UPDATE EXCLUSIVE: reads and writes continue. Fails with 23514 on any bad row.
ALTER TABLE public.cars VALIDATE CONSTRAINT cars_status_check_v2;

-- STEP 3 — swap names in one short transaction (keeps the original constraint name used by the preflight/postverify scripts).
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.cars DROP CONSTRAINT IF EXISTS cars_status_check;
ALTER TABLE public.cars RENAME CONSTRAINT cars_status_check_v2 TO cars_status_check;
COMMIT;
