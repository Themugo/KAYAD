# KAYAD Stage 20 — Buyer Portal Staging Certification Preparation

**Date:** 2026-10-12  
**Foundation archive:** `KAYAD-STAGE19-BUYER-PORTAL-CONVERGENCE-20261012.zip`  
**Foundation archive SHA-256:** `7427d41c848e8bf6968d0e41451e6fc1d98abe6d0ba2bbf0c63244e01f07dd77`  
**Scope:** prepare live two-account staging tests for saved vehicles, ownership, financing, inspection orders/bookings/reports, escrow, chats, private attachments, notifications, Supabase RLS and account-switch races.

## Outcome

A read-only staging certification runner and a step-by-step runbook have been added. No production code paths were changed in this stage; Stage 19 application fixes and all earlier foundations remain unchanged. The harness deliberately requires explicit staging URL, two separate user tokens, each account's seeded record IDs, and optional Supabase RLS table probes.

## Why this is not a live pass yet

This workspace does not contain the staging API URL, Account A/Account B access tokens, distinct seeded record IDs, or the staging Supabase URL/anon key/schema probe list. The runtime has Node `v22.16.0`, below the project requirement `>=22.22.2`, and there is no `node_modules` directory. No live requests or browser sessions were attempted. The tests remain blocked rather than being marked as passed.

## Added artifacts

- `scripts/certify-buyer-portal-staging-isolation-20261012.mjs` — native-fetch, GET-only two-account API matrix; tests own fixture visibility, list isolation, direct cross-account denial, private chat attachments, and optional Supabase REST RLS probes using user JWTs plus anon key.
- `KAYAD_STAGE20_STAGING_RUNBOOK_20261012.md` — environment setup, seeded fixture requirements, run instructions, RLS probe format, browser in-flight account-switch procedure, and interpretation guardrails.
- `KAYAD_STAGE20_BUYER_PORTAL_STAGING_VALIDATION_MATRIX_20261012.tsv` — per-domain live test status and expected results.
- `KAYAD_STAGE20_BUYER_PORTAL_STAGING_EXECUTION_LOG_20261012.txt` — execution boundary and environment limitations.
- `KAYAD_STAGE20_SHA256_MANIFEST_20261012.txt` — hashes for this stage's changed/new artifacts.

## Source and static validation performed

- Buyer portal source boundary checks: **29/29 PASS**.
- Public financing boundary regression: **23/23 PASS**.
- Public auto-services boundary regression: **17/17 PASS**.
- Messaging delivery safety validator: **PASS**.
- Supabase migration preflight: **178 migration files, 178 unique versions; PASS**.
- New staging runner syntax: **PASS** (`node --check`).

These are local source/static checks. They are not evidence that the deployed API or Supabase RLS behaves correctly for real accounts.

## Live verification still required

1. Run the script against a dedicated staging deployment using two real, distinct test users and seeded markers. See the runbook for the complete environment variable list.
2. Run direct Supabase REST RLS probes against each relevant table using user JWTs (never a service-role key), then supplement with SQL-editor policy review if needed.
3. Perform the browser test with delayed requests: A → sign out → B before A requests finish; release A responses and prove no A data flashes or overwrites B. Repeat B → A and logout while panels load.
4. Capture API/network logs and browser evidence, resolve any failures, and rerun the matrix.

## Safety and scope

The runner only issues GET requests. It does not mutate data, call payment routes, upload files, send messages, run migrations, or deploy. No commit, push, deployment, or production access occurred. Attachment authorization is tested only for the configured chat-upload IDs; Supabase storage bucket policy and signed-URL expiry still require separate verification if the deployment uses storage URLs outside this chat attachment endpoint.
