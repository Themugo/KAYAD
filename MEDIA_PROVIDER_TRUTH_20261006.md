# KAYAD Media Provider Truth — 2026-10-06

## Canonical provider

Supabase Storage is the **only active media provider**.

### Public bucket
`kayad-images` — marketplace vehicle images and public branding media.

### Private bucket
`kayad-private` — inspection evidence, inspection PDFs, documents, receipts and other private artifacts.

## URL policy

- Public objects use stable Supabase Storage public URLs.
- Private objects are stored by bucket/path and exposed only through short-lived signed URLs.
- Expiring signed URLs must never be persisted as the canonical database identity of a private object.

## Application rules

- No Cloudinary runtime dependency.
- No Cloudinary environment variables.
- No Cloudinary upload/delete code.
- No Cloudinary CDN dependency.
- Historical migrations/docs may mention Cloudinary for traceability, but they are not active configuration.
- New media paths must use the canonical Supabase storage service.

## Inspection-specific rule

Inspection evidence and PDFs persist `bucket + storage path`; signed URLs are generated at read/delivery time. This prevents reports and communications from containing expired media links.
