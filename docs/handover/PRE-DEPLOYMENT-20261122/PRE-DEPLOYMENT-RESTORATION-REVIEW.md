# KAYARD KE — PRE-DEPLOYMENT RESTORATION REVIEW

Date 2026-11-22. **Nothing applied, no SQL writes, no commit/push/merge/deploy.** Hosted Supabase was used read-only. Brand is KAYARD KE; `kayad_*` identifiers, `kayad.space` and the hosted display name "KAYAD EA" are literal technical names. Status labels: VERIFIED / FAILED / BLOCKED / NOT TESTED. Detail lives in the four reports and `sql/` scripts of `KAYARD-KE-restoration-review-v1.zip`; this file is the consolidated review.

## 0. Answers to the ten checks
| # | Check | Result |
|---|---|---|
| 1 | Inspect the complete migration | Done; full text in §4 (byte-identical to the copy in `kayard-registration-email-repair-v1.patch` and to `sql/10_APPLY_…`). VERIFIED |
| 2 | Compare with last known working implementation | No byte-exact copy of the earlier hosted function exists in Git history, migrations or any available backup. Compared with every repo definition (§2). "Last working" = minimum-patch / `20261001090000` behaviour, corroborated by 3 users and 8 emails (2026-10-20 to 2026-11-09). No backup was available to me (BLOCKED) |
| 3 | Parameters, return, roles, permissions, definer, search_path, transactions | §3. VERIFIED |
| 4 | Compatible with hosted schema | Yes: all 14 preflight columns exist, role/status CHECKs satisfied, triggers present, hosted `private_seller_capabilities` absent and handled. VERIFIED (read-only catalogue + rehearsal on a hosted-shaped DB, 19/19) |
| 5 | How and when replaced | §1. Mechanism: inferred manual paste; timing: bracketed ~2026-11-10; who/why unknown |
| 6 | Can anything overwrite it | §5. Yes, three vectors |
| 7 | Exact SQL | §4 and §6 |
| 8 | Rollback/recovery | §7 |
| 9 | Narrow scope | §8. VERIFIED |
| 10 | Hosted project reference and environment | Ref `ubvgixwhfybbyjuvxboj`, name "KAYAD EA", org `mbhrihjoanavafrmpekb`, eu-central-1, PG 17.6, created 2026-08-31, no branches. **Production vs staging: NOT confirmed.** Whether Render's `SUPABASE_URL` points here: NOT confirmed (no access to Render env) |

## 1. Root cause evidence and remaining assumptions
**Confirmed:** hosted body is a placeholder (md5 `f414d98a357862f9270796a4965d6900`, 709 chars; role check, comments "Other function logic"/"Remaining registration logic", no insert, no RETURN) → 2F005 → PostgREST 400 (two live 400s 2026-11-22 13:11:10 and 13:11:40 UTC). The text exists in no commit (`git log --all -S`). Hosted migration history ends 20260922, so it was not a migration.
**Strong inference:** pasted manually — CRLF line endings (also on hosted `sync_dealer_profile_from_user`, from the hand-run runbook patch; migration-created functions use LF); it declares `v_seller_approval_required`, which exists only in the 2026-11-10 draft `20261110140000`. `xmin` ordering brackets the last catalogue write between rows stamped 2026-11-10 11:37 and 17:12 UTC, after the last good registration (2026-11-09 07:17 UTC); the draft was committed 2026-11-10 17:08 UTC. `xmin` also moves on GRANTs, so this dates the last write, not strictly the body change.
**Assumptions / unknown:** who and which tool; exact time; failures between 10 and 22 Nov (API logs retained ~24 h only); that this project is the live backend's database; that the pre-break body equalled the minimum patch.

## 2. Before / after function comparison
| Definition | Relation to proposed |
|---|---|
| Hosted today (placeholder) | replaced entirely: now inserts `users` and `user_auth`, returns the row |
| `20261001090000` (original) | proposed adds policy lookup; same behaviour for `user`/`dealer` |
| Hand-run minimum patch 2026-11-02 | body = `20261001090000`; same behaviour for `user`/`dealer` |
| `20261110140000` (latest repo) | **identical except one statement**: the `individual_seller` capability insert is guarded by `to_regclass('public.private_seller_capabilities')` + `EXECUTE` |
Signature (10 params, order, types) and `RETURNS jsonb` identical everywhere and to the backend call. The backend never sends `individual_seller`.

## 3. Security and contract review
* `SECURITY DEFINER`, owner `postgres`, `SET search_path = public` (same as hosted today; all relations schema-qualified). Optional `public, pg_temp` hardening deliberately not applied (static guard asserts current form).
* ACL today `{postgres=X/postgres, service_role=X/postgres}`; migration restates `REVOKE ALL … FROM PUBLIC, anon, authenticated` and `GRANT EXECUTE … TO service_role`. anon/authenticated blocked. VERIFIED (rehearsal, journey 20).
* Roles accepted: `user`, `individual_seller`, `dealer`, else 22023; staff/admin roles impossible. Status: dealer pending; others approved (policy row has no `privateSellerApprovalMode` on hosted, so approved). Unified personal account preserved.
* Email stored `lower(btrim)`; duplicate → 23505 via hosted `users_email_key`. Password stored as hash only; token as SHA-256 only.
* Transaction: both inserts (plus profile/dealer triggers) in one function call → atomic (rehearsal F7). The migration is one `BEGIN…COMMIT` with preflight and a post-check that aborts unless the body contains both inserts and `RETURN to_jsonb(v_user)`.
* Pre-existing hosted drift, **not** changed: no `lower(btrim(email))` unique index; no dealer business-name unique index; `sync_dealer_profile_from_user` has unrestricted default execute (trigger function).

## 4. The migration (complete, as it would execute)
```sql
-- Restore public.kayad_register_identity_atomic (registration RPC).
--
-- WHY: read-only inspection of the hosted project (2026-11-22) found this function replaced by a placeholder body
-- ("Other function logic" / "Remaining registration logic"): it validates the role and then reaches END without
-- inserting a user or returning a value. PostgreSQL raises 2F005 ("control reached end of function without RETURN"),
-- PostgREST answers 400, and EVERY registration fails. The hosted migration history also stops at 20260922, so the
-- October/November registration migrations are not recorded there.
--
-- WHAT: forward-only, idempotent re-definition with the SAME signature and return contract as
-- 20261001090000 / 20261110140000, with one deliberate difference: the legacy `individual_seller` capability row is
-- written only when public.private_seller_capabilities exists (it is absent on the hosted project), so this migration
-- does not require the private-seller capability migration to be replayed first. The backend never sends
-- `individual_seller` (it maps to a personal `user` account), so ordinary registration is unaffected either way.
--
-- NOT APPLIED to any hosted database by the author. Apply only with the owner's separate approval, then run the
-- verification block at the bottom of this file (read-only).

BEGIN;

DO $preflight$
DECLARE
  missing text;
BEGIN
  IF to_regclass('public.users') IS NULL OR to_regclass('public.user_auth') IS NULL OR to_regclass('public.system_settings') IS NULL THEN
    RAISE EXCEPTION 'Preflight failed: users, user_auth and system_settings must exist';
  END IF;
  SELECT string_agg(t || '.' || c, ', ') INTO missing
    FROM (VALUES
      ('users','name'),('users','email'),('users','role'),('users','phone'),('users','status'),('users','email_verified'),
      ('users','business_name'),('users','location'),('users','referred_by'),
      ('user_auth','user_id'),('user_auth','password'),('user_auth','token_version'),
      ('user_auth','email_verify_token'),('user_auth','email_verify_expire')
    ) AS need(t, c)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = need.t AND column_name = need.c);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Preflight failed: missing columns: %', missing;
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.kayad_register_identity_atomic(
  p_name TEXT,
  p_email TEXT,
  p_role TEXT,
  p_phone TEXT,
  p_business_name TEXT,
  p_location TEXT,
  p_referred_by UUID,
  p_password_hash TEXT,
  p_email_verify_token TEXT,
  p_email_verify_expire TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_seller_approval_required boolean := false;
BEGIN
  SELECT COALESCE((value->>'privateSellerApprovalMode') = 'required', false)
    INTO v_seller_approval_required
    FROM public.system_settings
   WHERE key = 'onboarding_policy';

  IF p_role NOT IN ('user','individual_seller','dealer') THEN
    RAISE EXCEPTION 'Invalid self-registration role' USING ERRCODE = '22023';
  END IF;

  -- users + the automatic profile/dealer triggers + user_auth commit or roll back together.
  INSERT INTO public.users (
    name, email, role, phone, status, email_verified,
    business_name, location, referred_by
  )
  VALUES (
    p_name, lower(btrim(p_email)), p_role, NULLIF(btrim(COALESCE(p_phone, '')), ''),
    CASE
      WHEN p_role = 'dealer' THEN 'pending'
      WHEN p_role = 'individual_seller' AND v_seller_approval_required THEN 'pending'
      ELSE 'approved'
    END,
    false,
    CASE WHEN p_role IN ('dealer','individual_seller') THEN NULLIF(btrim(COALESCE(p_business_name, '')), '') ELSE NULL END,
    CASE WHEN p_role IN ('dealer','individual_seller') THEN NULLIF(btrim(COALESCE(p_location, '')), '') ELSE NULL END,
    p_referred_by
  )
  RETURNING * INTO v_user;

  INSERT INTO public.user_auth (
    user_id, password, token_version, email_verify_token, email_verify_expire
  )
  VALUES (
    v_user.id, p_password_hash, 0, p_email_verify_token, p_email_verify_expire
  );

  -- Legacy compatibility only: the capability table is optional (absent on the hosted project).
  IF p_role = 'individual_seller' AND to_regclass('public.private_seller_capabilities') IS NOT NULL THEN
    EXECUTE
      'INSERT INTO public.private_seller_capabilities (user_id, status, source) VALUES ($1, $2, ''application'') ON CONFLICT (user_id) DO NOTHING'
      USING v_user.id, CASE WHEN v_seller_approval_required THEN 'pending' ELSE 'approved' END;
  END IF;

  RETURN to_jsonb(v_user);
END;
$$;

REVOKE ALL ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_register_identity_atomic(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TIMESTAMPTZ)
  TO service_role;

-- Refuse to commit if the definition that ended up in the catalogue is not the real one.
DO $postcheck$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'kayad_register_identity_atomic';
  IF def IS NULL OR def NOT ILIKE '%INSERT INTO public.users%' OR def NOT ILIKE '%INSERT INTO public.user_auth%' OR def NOT ILIKE '%RETURN to_jsonb(v_user)%' THEN
    RAISE EXCEPTION 'Postcheck failed: kayad_register_identity_atomic is not the full registration function';
  END IF;
END;
$postcheck$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Read-only verification after applying (run as a separate statement; writes nothing):
--   select p.prosecdef, length(pg_get_functiondef(p.oid)) > 1500 as full_body,
--          has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_call,
--          not has_function_privilege('anon', p.oid, 'EXECUTE') as anon_blocked
--     from pg_proc p where p.proname = 'kayad_register_identity_atomic';
```

## 5. Overwrite risks
1. Re-running `runbooks/dealer-onboarding-hosted-patch-20261102/APPLY_dealer_onboarding_minimum.sql` ("safe to repeat") reinstates the older, behaviour-equivalent body.
2. Out-of-order older migrations (`20261001090000`, or `db push --include-all`) redefine it likewise.
3. A blanket `supabase db push`: hosted history stops at 20260922, ~90 migrations would replay and `20261110140000` aborts (its preflight needs `private_seller_capabilities`, absent). **Forbidden.**
4. Any future manual paste. Mitigation: run `sql/90_POST_CHANGE_VERIFY_READONLY.sql` after every hosted SQL session; mark the runbook patch superseded.
No other migration or deployment step in the repository touches this function after `20261122200000`.

## 6. Exact SQL execution plan
| Step | File | Writes |
|---|---|---|
| 1 | `sql/00_PRE_CHANGE_SNAPSHOT_READONLY.sql` — expect md5 `f414d98a…`, length 709, ACL as above; STOP if different | no |
| 2 | `sql/10_APPLY_20261122200000_restore_register_identity_atomic.sql` (= §4), single transaction via SQL editor or `psql -f`; no `db push` | one function |
| 3 | `sql/90_POST_CHANGE_VERIFY_READONLY.sql` — all 9 booleans true (today it correctly returns 2 false) | no |
| 4 | Backend deploy through the normal pipeline, patch order v3 → command-centre v2 → registration repair | — |
| 5 | Live acceptance (§9), then `sql/99_…` only with separate approval | test account only |

## 7. Rollback and recovery
* Apply is atomic; any failure leaves the placeholder untouched.
* Preferred recovery: **forward fix** (re-apply a corrected function). Accounts created after the restore are kept.
* `sql/95_ROLLBACK_RESTORE_CAPTURED_DEFINITION.sql` re-creates the captured placeholder (rehearsal restored the exact md5) — this **restores the outage**; separate approval.
* Last resort: restore from the recovery point (discards newer data). A recovery point must exist first: dashboard backup/PITR confirmation or a `pg_dump` with the password supplied through the environment and never printed. Current backup/PITR status: BLOCKED (only `archive_mode=on` is visible).

## 8. Data safety and scope
* The migration references only `users`, `user_auth`, `system_settings` (read), `private_seller_capabilities` (only if it exists) and the function itself. A keyword scan of the file finds no escrow, payment, payout, ledger or commission object, and no DELETE/UPDATE/DROP/ALTER/TRUNCATE statements (scan result: 0 matching lines, comments included). VERIFIED by reading and by rehearsal.
* Existing rows (users/user_auth/dealers/profiles = 3/3/2/3) are untouched; the migration inserts nothing. Foreign-key delete rules were reviewed for the cleanup script only (`user_auth`, `dealers`, `profiles`, `refresh_tokens` cascade; `communication_deliveries` SET NULL; `cars`, `leads` NO ACTION).
* Residual effect: new registrations will create rows and send email once deployed; that is the intended outcome.

## 9. Post-deployment verification
Run `90_…sql` (9/9 true). Then, with an authorised mailbox: (1) register a test user on the live site, (2) confirm the account persists, (3) verification email arrives (keep headers; ledger `sent`, `delivered` only if webhook-confirmed), (4) link verifies, (5) login works, (6) password reset requested, (7) reset email arrives, (8) reset completes and login works. Until all eight pass, registration and email remain unverified in production.
Also pending (owner): Brevo key, verified sender, domain auth with SPF/DKIM/DMARC evidence, and `BREVO_FROM_NAME=KAYAD` vs KAYARD KE. All BLOCKED/NOT TESTED.

## 10. Test evidence (local, not production)
Rehearsal on hosted-shaped DB 19/19 (this task); previously: journey 20 54/54, journey gate 211/211, backend 253 suites / 4,189 tests, frontend registration/auth 326 tests, validators pass. Repeat on the combined tree after integration: `tsc`, frontend suite, backend suite, full journey gate, validators, `ci/rehearse-register-restore.sh`. Four legacy `verify-*` scripts fail identically on the untouched base (pre-existing).

## 11. Explicit approval requirements
I will not proceed until the owner states, in writing:
1. The hosted project ref in §0 is the intended target and whether it is production or staging.
2. A recovery point exists (timestamp/location).
3. Approval to run `sql/10_…` (and nothing else that writes) on that project.
4. Approval for the backend deploy order (owner performs commit/push/deploy).
5. An authorised test mailbox, and a decision on `BREVO_FROM_NAME`.
6. Separate approval for any rollback (`95`) or cleanup (`99`) script.

**Awaiting approval. No further action taken.**
