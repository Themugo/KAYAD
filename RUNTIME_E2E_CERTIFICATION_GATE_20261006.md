# KAYAD Runtime E2E Certification Gate — 2026-10-06

## Scope

This foundation is the continuation of the KAYAD inspection vertical after media-provider convergence. The intended real journey is:

Node 22.22.2+ → clean install → Supabase migration → real buckets → real upload → real private evidence → signed retrieval → deletion → real inspection execution → QA → PDF → Brevo → WhatsApp → buyer review → settlement → payout.

## Completed in this environment

- Supabase Storage canonical media architecture validated.
- Cloudinary removed from active runtime/configuration.
- Private evidence stores canonical bucket/path, never an expiring URL.
- Evidence upload validates content after multer buffering.
- Evidence storage/DB convergence cleans up the object when DB persistence fails.
- Evidence deletion is now a canonical authenticated inspector operation and removes the storage object plus DB metadata.
- Failed/warning checklist findings cannot lose their required evidence during execution.
- Inspection PDF is generated only after QA approval.
- PDF stores bucket/path rather than an expiring signed URL.
- Buyer report delivery refreshes the signed PDF URL at send/read time.
- Canonical inspection, payment, transaction, migration, runtime and deployment static gates pass.
- Production env contract is present.

## Static validation result

15/15 selected system validators passed, including:

- media storage
- media delivery lifecycle
- inspection QA contract
- canonical architecture
- database contract alignment
- domain lifecycle integrity
- payment gateway lifecycle
- payment/escrow domain
- transaction integrity
- high-risk boundaries
- migration hygiene
- runtime convergence
- backend runtime contracts
- frontend runtime contracts
- deployment readiness

## Not falsely certified here

A real external-service certification was not possible in this environment because no live credentials were supplied for Supabase, M-Pesa/Daraja, Brevo or Twilio, and the runtime is Node 22.16.0 while the project contract is Node >=22.22.2.

Therefore this document deliberately does not claim that a real payment, real Supabase object, real email, real WhatsApp message, real buyer review, or real payout has occurred.

## Required controlled certification order

1. Run Node 22.22.2+.
2. Run `npm ci` from the repository root.
3. Apply all Supabase migrations to staging.
4. Confirm `kayad-images` exists and is public-read only.
5. Confirm `kayad-private` exists and has no public-read policy.
6. Perform a real authenticated private evidence upload.
7. Retrieve it using a short-lived signed URL.
8. Delete it and verify the object is gone and the DB metadata is gone.
9. Create a real buyer/provider/package/vehicle booking.
10. Complete the M-Pesa payment and verify callback/ledger idempotency.
11. Assign a real inspector and execute the canonical checklist.
12. Upload real evidence and verify signed retrieval.
13. Complete the inspection.
14. Submit and independently approve the report in QA.
15. Generate the real PDF into `kayad-private`.
16. Send the approved report through Brevo.
17. Send the approved report notification through Twilio WhatsApp.
18. Retrieve the report as the buyer and submit the review.
19. Generate settlement through the atomic settlement RPC.
20. Execute provider payout through the atomic payout RPC.
21. Reconcile payment, ledger, settlement and payout records.
22. Preserve the resulting audit identifiers and timestamps in the certification report.

## Stop conditions

Stop the certification immediately if any of the following occurs:

- storage object exists without a canonical DB reference after a failed transaction;
- private evidence is readable without authorization;
- an expiring URL is persisted as the canonical media identity;
- a failed/warning checklist item has no evidence;
- PDF can be generated before QA approval;
- report delivery marks a booking reviewed without an actual buyer review;
- settlement or payout bypasses the atomic financial RPCs;
- duplicate M-Pesa callbacks create duplicate ledger effects;
- provider payout can occur for an inspection without the required buyer review;
- any service silently falls back to mock/local/process-only state in production.
