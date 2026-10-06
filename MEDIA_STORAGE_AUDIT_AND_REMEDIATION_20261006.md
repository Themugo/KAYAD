# KAYAD Whole-System Media Storage Audit & Remediation — 2026-10-06

## Executive result

The latest KAYAD Inspection E2E foundation was audited specifically for the assumption that Cloudinary had already been retired.

That assumption was **false in the supplied foundation**. Cloudinary was still present in the active runtime path in multiple places, including vehicle uploads, generic uploads, inspection evidence, inspection PDF generation, dispute evidence, admin branding, image processing/CDN configuration, environment validation, deployment manifests, package dependencies and frontend image helpers.

This sweep converged those active paths onto **Supabase Storage** without creating a second storage architecture.

## Canonical storage decision

### Public bucket
`kayad-images`

Used for marketplace vehicle imagery and public branding/media.

### Private bucket
`kayad-private`

Used for inspection evidence, generated inspection reports, receipts and private documents.

### Backend authority
The backend uses the Supabase service-role client for storage operations.

### Private delivery
Private objects are never made public. The backend generates short-lived signed URLs after application-level authorization.

### Metadata
Upload records retain provider, bucket, storage path and SHA-256 checksum where applicable.

## Active paths remediated

- Vehicle listing image upload
- Add vehicle images
- Vehicle image deletion
- Generic `/api/upload`
- Generic multiple upload
- Private upload retrieval
- Generic upload deletion
- Inspection evidence
- Multiple inspection evidence
- Dispute evidence
- Inspection report PDF storage
- Inspection report signed retrieval
- Admin branding/logo upload
- CDN provider declaration
- CSP image source
- Image-processing storage strategy
- Production environment validation
- Render configuration
- Kubernetes configuration
- Helm values/templates
- Docker documentation
- Frontend image helpers
- Legacy Cloudinary package dependency
- Media recovery provider default
- Cloudinary-specific validators

## Database convergence

Added:

`supabase/migrations/20261006180000_supabase_storage_canonical_media.sql`

Creates/converges the two canonical storage buckets and their access boundary and adds report storage metadata columns.

Added:

`supabase/migrations/20261006183000_media_provider_default_supabase.sql`

Changes the media recovery default provider to `supabase` and converts existing `cloudinary` provider rows to `supabase` when that migration executes.

Historical migrations were not rewritten; migration history is immutable. The new migration is the forward correction.

## Report PDF correction

The generated inspection PDF is now stored as a private Supabase Storage object.

The database retains its storage bucket/path, while report retrieval generates a fresh short-lived signed URL. This prevents a permanently expiring signed URL from becoming the durable report identity.

## Security correction

The previous Cloudinary public/private URL model has been removed from the active source.

Private inspection/document media now follows:

`authenticated application request → authorization → Supabase private object → short-lived signed URL`

## Validation performed

PASS — canonical media-storage validator

PASS — no Cloudinary dependency in backend package manifest/lock

PASS — no active Cloudinary source/config references in backend, frontend, Helm, Kubernetes, Render, Docker or Nginx runtime configuration

PASS — private storage signed URL contract

PASS — vehicle media storage contract

PASS — inspection evidence storage contract

PASS — inspection PDF storage contract

PASS — inspection QA contract

PASS — inspection execution/evidence/QA/settlement contract

PASS — canonical architecture

PASS — deployment readiness

PASS — frontend runtime contracts

PASS — backend runtime contracts 14/14

PASS — inspection marketplace 21/21

PASS — database contract alignment 8/8

PASS — transaction integrity 14/14

PASS — communications static contract

PASS — payment gateway lifecycle 13/13

PASS — payment/escrow domain 9/9

PASS — migration hygiene 155 migrations, no duplicate migration bodies/table creators

PASS — registration/onboarding 47/47

PASS — private upload cache/security contract

PASS — runtime convergence 7/7

PASS — production optional integration contract 4/4

## Not claimed

This environment is Node `22.16.0`, while the KAYAD production contract requires Node `>=22.22.2`.

`npm ci` was therefore correctly blocked by the engine requirement. Full production build/typecheck/browser certification was not falsely claimed.

The live Supabase project was also not accessed because no live Supabase credentials were supplied to this execution environment. Therefore the following remain runtime certification steps:

1. Confirm both buckets exist in the actual project.
2. Apply the storage migration.
3. Verify storage policies/RLS in the actual project.
4. Upload a real public vehicle image.
5. Upload real private inspection evidence.
6. Retrieve the private evidence through an authorized signed URL.
7. Generate a real inspection PDF and retrieve it after URL expiry/refresh.
8. Verify unauthorized users cannot obtain private objects.
9. Verify deletion removes the actual storage object.

## Next engineering step

Do **not** start another feature build yet.

First run the real Supabase Storage certification on Node `22.22.2+`. Once that passes, continue the inspection vertical E2E journey:

`real inspector → checklist → evidence → QA → PDF → email/WhatsApp → buyer review → settlement → provider payout`

with Supabase Storage now treated as the canonical media layer.
