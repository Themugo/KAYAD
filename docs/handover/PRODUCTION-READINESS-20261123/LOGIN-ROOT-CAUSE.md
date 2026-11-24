# Login and identity lifecycle — root-cause record (2026-11-23, revised 2)

## Verdict
**Exact failing stage: NOT ESTABLISHED (Unverified/Blocked on one browser capture).** Everything checkable server-side is healthy for existing accounts; registration is separately and confirmedly broken. The registration migration does **not** fix login.

## Lifecycle trace (source, Confirmed — `backend/controllers/authController.js`, `src/api/httpClient.ts`, `vercel.json`)
register → `kayad_register_identity_atomic` (RPC) → email-verification token → `GET /verify-email/:token` → login: email lookup, `user_auth` (lockout, hash), bcrypt, gates (banned/deactivated/deleted, unverified owner, maintenance, **email gate when `REQUIRE_EMAIL_VERIFICATION=true` or `BREVO_API_KEY` is set**, owner MFA), `refresh_tokens` insert, cookie → `protect()` re-reads `users`/`user_auth`/`refresh_tokens` per request → `refresh` (rotates via `kayad_rotate_refresh_token`) → logout (revokes tokens, bumps `token_version`). Supabase Auth is not used. Unified personal account: `role=user` (buyer and seller); dealer/admin are separate roles.

## Evidence
| Observation | Class |
|---|---|
| Hosted registration RPC is a placeholder: HTTP 400 from PostgREST (2 live occurrences 2026-11-22 13:11 UTC); reproduced locally (SQLSTATE 2F005) | Confirmed + Reproduced |
| Only 3 users exist; none created after 2026-11-09; 0 locked, 0 with failed attempts, 0 unverified, 0 banned/deactivated/deleted | Confirmed (aggregates) |
| Full logins succeeded on 2026-11-22 ~07h/11h UTC and 2026-11-23 ~04h UTC (email lookup + password read + `refresh_tokens` insert 201) | Confirmed |
| 2026-11-23 06:20–07:30 UTC (09:20–10:30 +03, your 09:47 report): **no email-keyed lookup and no `refresh_tokens` insert**; existing sessions kept validating (200) and one rotation succeeded | Confirmed (absence) |
| Journeys `legacy-j1_personal_register_login`, `legacy-j1_registration_idempotency`, `20_registration_email_lifecycle` on a clean DB with the real backend | see `TEST-RESULTS.md` |
## What this rules out
Lockout, unverified-email gate, ban/deactivation, maintenance mode for the existing accounts; database permission/RLS problems on the login read path (all reads 200).
## Open hypotheses (all Unverified; one capture separates them)
H1 the email entered is not one of the 3 accounts (it never existed because registration is broken) and the request is rejected before the DB; H2 the request fails between Vercel and `api.kayad.space` (rewrite/CORS/cookie domain/Render cold start); H3 a login rate limiter rejected it before any DB read; H4 a stale cookie or client-side error prevented submission.
## Missing diagnostic (exact owner action — never send passwords, tokens or cookies)
Chrome → F12 → Network (Preserve log) → submit the login once → click `login` → send: Request URL, Status Code, the **Response** message text, the time, the frontend URL you were on, and the console error text. Separately, privately: which email you use. Render log lines for that minute (request line + status only).
## Fixes
No source defect was found in the login path, so **no login code was changed**. Changing working authentication without a reproduced defect would risk the existing sessions.
