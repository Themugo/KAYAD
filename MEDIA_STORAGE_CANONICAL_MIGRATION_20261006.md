# KAYAD Media Storage Canonicalization — 2026-10-06

## Decision
Supabase Storage is the only active KAYAD media provider. Cloudinary is retired and removed from application dependencies, runtime configuration, media upload code, inspection evidence, generated inspection PDFs, vehicle image upload, dispute evidence, admin branding upload, CDN configuration and production environment requirements.

## Buckets
- `kayad-images`: public marketplace/branding media.
- `kayad-private`: private inspection evidence, reports, receipts and documents.

## Security
- Backend uploads use the Supabase service role.
- Private objects are never public.
- Application authorization precedes signed URL generation.
- Signed URLs are short-lived.
- Upload metadata records provider, bucket, storage path and SHA-256 checksum.

## Required migration
`supabase/migrations/20261006180000_supabase_storage_canonical_media.sql`

## Remaining live certification
The actual Supabase project must be checked for bucket existence, RLS/policy application and successful upload/download using Node 22.22.2+. This cannot be honestly certified from the current environment without the live project credentials.
