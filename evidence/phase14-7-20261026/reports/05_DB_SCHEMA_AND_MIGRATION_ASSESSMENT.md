# 05 DB / schema / migration assessment (Order 8)
Source-level only. No PostgreSQL server is available here (psql only); migrations depend on Supabase auth schemas, so no real-DB certification was possible. No migration was run, added to supabase/migrations, or applied anywhere.
- bio, payment_details, onboarding_complete, onboarding_completed_at: present via R12; suspended verification status: present via R14. The code writes only existing columns.
- dealer_teams: unique (dealer, invite_email), unique (dealer, member) for non-removed, unique invite_token_hash; roles/status checks match the code. RLS gap: member self-update policy (see PROPOSED SQL, forward + rollback, prerequisite: confirm only the service role writes the table).
- cars: soft-delete and denormalised auction counters are what the guard's single UPDATE relies on; no schema change required.
- Service-role boundary: all dealer/team writes go through Express with the service role; RLS is defense in depth.
- Certification still needed: run migrations + the guard/team tests against a disposable Supabase/Postgres and against staging.
