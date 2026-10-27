-- SUPERSEDED BY PHASE 14.8 AUDIT: the real schema already contains an owner-only update policy (migration 20260908043000); this file is NOT needed and must NOT be applied. Kept for history.
-- PROPOSED, NOT APPLIED. Authorised local/disposable database only. Never run against staging or production without review.
-- Defect: policy dealer_teams_owner_update lets a team MEMBER update their own row (role, permissions, status) through
-- any direct PostgREST/anon-key client. The Express API (service role) already forbids self-change; this closes the DB path.
-- Prerequisite: confirm no client reads/writes dealer_teams with a user JWT (the backend uses the service role).
-- FORWARD
begin;
drop policy if exists dealer_teams_owner_update on public.dealer_teams;
create policy dealer_teams_owner_update on public.dealer_teams
  for update using (auth.uid() = dealer) with check (auth.uid() = dealer);
commit;
-- ROLLBACK (restores the 20260907220000 definition)
-- begin;
-- drop policy if exists dealer_teams_owner_update on public.dealer_teams;
-- create policy dealer_teams_owner_update on public.dealer_teams
--   for update using (auth.uid() = dealer or auth.uid() = member) with check (auth.uid() = dealer or auth.uid() = member);
-- commit;
