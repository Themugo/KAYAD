# Launch-day checklist — first controlled onboarding (19 October 2026)

**Nothing below is marked passed.** Every box is empty until a named person runs it and records evidence. Items marked ⛔ are launch blockers if they fail.

| # | Check | How (no secret values printed) | Evidence to record | Result |
|---|---|---|---|---|
| 1 ⛔ | Backend and frontend deployed from the approved archive (SHA-256 in the certification file) | compare archive checksum; deploy | version/commit, time | ☐ |
| 2 ⛔ | Required env vars **present** | `for v in WEBHOIST_EMAIL BREVO_API_KEY BREVO_FROM_EMAIL FRONTEND_URL REQUIRE_EMAIL_VERIFICATION JWT_SECRET REFRESH_TOKEN_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do [ -n "${!v}" ] && echo "$v set" \|\| echo "$v MISSING"; done` (adjust names to your host's secret store) | list of "set/MISSING" | ☐ |
| 3 ⛔ | `REQUIRE_EMAIL_VERIFICATION=true` set explicitly | host config | — | ☐ |
| 4 ⛔ | **Owner account exists and its email is verified** (otherwise owner-only controls refuse with `OWNER_EMAIL_UNVERIFIED`, and an unregistered owner address could be claimed by someone else) | read-only: `select email_verified, status, role from users where lower(email)=lower('<owner email>');` | one row, `email_verified=t` | ☐ |
| 5 ⛔ | Database has the registration function and tables | read-only: `select proname from pg_proc where proname='kayad_register_identity_atomic';` and `select to_regclass('public.system_settings');` | both found | ☐ |
| 6 ⛔ | Migration state matches the repository chain (181 files) | `supabase migration list` against the target | "Remote" equals the 181 | ☐ |
| 7 | Gated migrations **not** applied unless separately approved | preflight scripts in `runbooks/stage4-rehearsal-20261018` | — | ☐ |
| 8 ⛔ | Brevo sender verified; SPF/DKIM pass | Brevo dashboard | screenshot/notes | ☐ |
| 9 ⛔ | Verification URL origin: a test email's link host equals the public frontend origin | runbook §4 | link host | ☐ |
| 10 ⛔ | Safe test registration + delivery with an **authorized controlled mailbox** | runbook §4 | delivered Y/N, replay test, resend test | ☐ |
| 11 ⛔ | Owner can log in and open Admin → Settings → **Onboarding** | browser | page shows `Revision` and the five selects, "Save" visible | ☐ |
| 12 ⛔ | **Initial modes confirmed and saved deliberately** (page then shows revision ≥ 1, source *saved settings*) | owner | values read back to the owner | ☐ |
| 13 | A non-owner admin sees the page read-only and receives 403 on Save | second admin account | — | ☐ |
| 14 | Public registration page behaves per mode (seller/dealer message when closed) | logged-out browser | — | ☐ |
| 15 | First real onboarding documented: who, when, which mode, outcome | onboarding log | — | ☐ |
| 16 | Approval and rollback contacts named (owner; backup decider if delegated) | — | names/numbers | ☐ |
| 17 | Rollback ready: Settings → Onboarding set to `closed` / `disabled`; `hold_for_review`; `owner_only` | rehearse once | — | ☐ |
| 18 | Alerts exist for `AUDIT_WRITE_FAILED_AFTER_COMMIT` (critical) and `ONBOARDING_POLICY_READ_FAILED` | logging provider | rule ids | ☐ |
| 19 | Access logs contain no verification tokens (`/verify-email/[REDACTED]`) | grep a test request | — | ☐ |

## Known limitations on launch day (read aloud)
1. Live email delivery has **not** been proven by this delivery.
2. No browser (Playwright) journey was run in this delivery.
3. Explicit listing *rejection* depends on decision D3 (database constraint). Until applied, the reject action in the single-listing moderation endpoint fails at the database; bulk reject hides.
4. The owner is identified by email; steps 2 and 4 are essential.
5. The generic login gate is still provider-gated; seller features are not.
6. Hosted database state is unknown (never inspected); steps 5–6 establish it.
