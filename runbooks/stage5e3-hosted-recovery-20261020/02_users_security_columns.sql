-- APPLIED 2026-10-20 by the owner. Additive and idempotent.
alter table public.users
  add column if not exists deactivated_at timestamptz,
  add column if not exists granted_permissions text[] not null default '{}'::text[],
  add column if not exists revoked_permissions text[] not null default '{}'::text[],
  add column if not exists last_active timestamptz;
