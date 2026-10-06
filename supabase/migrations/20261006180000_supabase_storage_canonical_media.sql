-- KAYAD canonical media storage migration
-- Cloudinary is retired. Supabase Storage is the only active media provider.

insert into storage.buckets (id, name, public)
values
  ('kayad-images', 'kayad-images', true),
  ('kayad-private', 'kayad-private', false)
on conflict (id) do update
set public = excluded.public;

-- Public vehicle/branding media is intentionally readable by the marketplace.
-- Upload/delete remain service-role/backend operations.

drop policy if exists "KAYAD public media read" on storage.objects;
create policy "KAYAD public media read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'kayad-images');

-- Private inspection evidence, documents, receipts and reports are not public.
-- Backend uses the service role and issues short-lived signed URLs after
-- application-level authorization. No direct client write policy is required.

drop policy if exists "KAYAD private media no public read" on storage.objects;
create policy "KAYAD private media no public read"
on storage.objects for select
to anon, authenticated
using (false);


alter table if exists public.inspection_reports
  add column if not exists pdf_storage_bucket text,
  add column if not exists pdf_storage_path text;
