-- Converge historical media recovery records to the canonical provider.
alter table if exists public.media_upload_jobs
  alter column storage_provider set default 'supabase';

update public.media_upload_jobs
set storage_provider = 'supabase'
where storage_provider = 'cloudinary';
