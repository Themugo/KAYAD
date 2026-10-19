# KAYAD Stage 5A — Launch gate closure & first-seller operational certification (2026-10-19)

## FINAL DECISION: **READY WITH EXPLICIT BLOCKERS**
The local implementation is sound and was exercised in a real browser against a real (disposable) PostgreSQL. Three launch-critical gates remain **unverified or unmet on the hosted side** and are outside what I may change without you: hosted schema, owner provisioning, live email. Stage 6 was not started.

## Foundation (Section 1)
* Stage 5 ZIP: sha256 `8dbc7683…7499e`, 33,695,243 bytes, 5,475 entries, `unzip -t` clean, matches its `.sha256`. Extracted into an isolated directory; its manifest verifies with **0 mismatches**; Stage 5 report, change ledger, runbooks (evidence matrix, owner guide, launch checklist, migration-risk register) present.
* Runtime Node v22.22.2 / npm 10.9.4 (the workspace default `node` is 22.22.0; the 22.22.2 toolchain was used for every test and stack).
* **Windows tree `C:\Users\hp\Desktop\kayad-fresh`: NOT COMPARED** — the device bridge was not connected in this session. Nothing was overwritten there. The five previously missing files and the odd path artifacts could not be re-investigated without it. (Known: the stray committed file `tatus --short`.)

## What was found and fixed
**Gate A (identity):** *A1 HIGH* — with verification off, a public registrant using the owner email could register and sign in as owner. Fixed: owner emails are reserved at registration (403, no side effects, no oracle); an unverified owner is refused at login, refresh, `protect`, `optionalAuth` and sockets with a recoverable error; verified owner behaviour unchanged. 33 regression tests (10 failed before the fix).
**Gate B (email):** resend no longer reveals account existence and has a cooldown; wire contract, token hashing, one-time use, redaction tested. **Live delivery BLOCKED.**
**Gate C (hosted DB):** read-only preflight: 12 OK / 4 MISSING (registration RPC, session columns, users security columns, email index). Migration candidate, preflight, rollback plan, approval gate prepared — **not applied**.
**Gate D (owner settings):** the settings page was **unreachable** in the live console; now mounted and proven (save, reload, real restart, 409 without overwrite, corrupt/missing ⇒ restrictive). A partially corrupt record is now wholly restrictive.
**Gate E (moderation):** reject ⇒ `hidden` everywhere (single, bulk, duplicate removal); UI says Hide; sold protected in all seller and admin paths; self-publication blocked through both bulk endpoints; duplicate removal ordering fixed; dedicated tests.
**Gate F (browser):** 11 defects visible only in the real app were fixed (F1–F11 in the browser report), notably: every single-listing decision returned 500, every multi-id bulk call returned 400, admin console loaded empty, no approve/reject controls existed, `users.approved` queries failed against the real schema.
**Gate G:** tsc, build, FE Vitest 650, BE Jest 1814 (119 suites), BE Vitest 36, node:test 1 all green; validators 126 pass / the same 8 hosted/live non-zero (not passes). Rerun on the extracted ZIP: see `…CERTIFICATION.txt`.

## Implemented · Verified · Mocked · Needs approval · Needs migration
* **Implemented:** items above (ledger lists every file).
* **Verified (real runtime/browser/PG):** seller and dealer journeys, both dealer modes, approve/reject/duplicate/concurrent decisions, audit and notifications, owner settings UI, restart persistence, corrupt/missing settings, moderation and self-publication blocks, responsive 320–430.
* **Mocked/captured only:** email delivery (local capture, not Brevo); unreadable settings store; Jest suites.
* **Not tested:** live Brevo; seller listing with image upload (no Cloudinary here); Windows tree; hosted behaviour after migration; browsers other than Chromium.
* **Needs your approval:** D1 dealer mode, D2 moderation, D3 `rejected` migration (keep gated), D4 hosted migration, D5 Brevo credentials/sender/mailbox, D6 owner bootstrap, D7 Windows sync, D8–D9 follow-ups (decision register).
* **Needs a migration:** Gate C identity chain on the hosted project (branch rehearsal first). `rejected` status migration is separate and optional.

## Before the first private seller and dealer
Follow `LAUNCH_DAY_CHECKLIST_5A.md` section A: migrate hosted (D4), provision and verify the owner (D6), pass the live email test (D5), sync the Windows tree (D7), confirm settings (D1/D2), then onboard under supervision.

## Observations recorded, not changed
`archived` status in a bulk path is invalid in the DB; static "needs approval" UI copy; owner seed leaves `status=pending`; retry logger records recipient address; other dealer-dashboard queries use non-existent raw columns (risk register R7); `REQUIRE_EMAIL_VERIFICATION` should be set explicitly.

---
## FINAL ADDENDUM — packaging, extracted-copy verification and open items (supersedes any earlier interim wording)

### Archive (items 1–2 of the final request)
The final ZIP's own size, SHA-256, entry count and verification result cannot be written inside the ZIP (circular). They are in the companion `KAYAD-STAGE5A-…-20261019.CERTIFICATION.txt` and `.zip.sha256`. An earlier build is preserved unmodified as `…-20261019-INTERIM-CHECKPOINT-1.zip` (sha256 `ddcda1d8…e0bfa`, 42,825,505 bytes, 5,570 entries = 5,569 manifest rows + the manifest; `unzip -t` clean; 0 forbidden entries; 0 manifest mismatches on extraction; 0 path-set diff; 0 Stage 5 files missing; 181 migrations). The final ZIP differs from checkpoint 1 only in report/evidence documents and the test runner script.
Manifest convention: `sha256sum` format, paths relative to the project root, LC_ALL=C sorted, covering every packaged file except the manifest itself (listed as a separate entry). Excluded by rule: `.git`, `node_modules`, `dist`, logs, caches, `*.sqlite*`, non-template `.env*` (none present).

### Extracted-copy results (checkpoint 1, independently extracted, Node v22.22.2 / npm 10.9.4)
| Suite | Exit | Result |
|---|---|---|
| tsc | 0 | clean |
| build | 0 | built |
| FE Vitest | 0 | 82 files · 650 passed · 1 skipped (known baseline skip) |
| BE Jest | 0 | 119 suites · 1814 passed |
| BE Vitest | 0 | 6 files · 36 passed |
| BE node:test | **143 on first run** | the `response-lifecycle` test hung (569 s, then terminated). Known intermittent keep-alive `server.close` hang, not a Stage 5A regression. Rerun: **exit 0**, 1 passed; 25 further consecutive runs passed. Not a clean first-run pass; disclosed here. |
| Validators | 126 × exit 0; 8 non-zero | the same 8 hosted/live validators as the Stage 5 baseline — **not passes** (blocked live checks) |
The final-ZIP extracted run (with a 300 s guard and one recorded rerun built into the script) is recorded in the final certificate and in its log directory.

### Item answers
* **Owner settings UI / modes / server-side authz / moderation policy (5):** reachable (admin console → onboarding module); `self_onboarding` and `approval_required` (and `closed`) configurable and exercised; non-owner admin → 403 `DECISION_AUTHORITY_REQUIRED` under `owner_only`; admin/dealer PUT of the policy → 403; moderation follows `hold_for_review` / `auto_publish` independently. Evidence tiers M+R+P (disposable PG), not hosted.
* **Dedicated dealer-platform bulk and duplicate-listing tests (6):** present — `stage5aSellerSelfPublication` (14), `stage5aBulkModerationAndDuplicates` (9), `stage5aHppBulkBodies` (3). Not missing.
* **Hosted DB (7):** 12 OK / 4 MISSING, read-only. The four are **migration gates**, none applied: (1) `kayad_register_identity_atomic` RPC, (2) session columns, (3) users security columns, (4) email unique index. Candidate, preflight, rollback plan in `runbooks/stage5a-launch-gate-20261019/GATE_C_*`.
* **Real email (8):** **BLOCKED — not genuinely tested.** No Brevo key, sender or test mailbox. Only the adapter's wire contract and a local capture listener were exercised (mocked). No pass is claimed.
* **Owner-email self-claim fix (9):** verified — 33 tests in `stage5aOwnerIdentityBootstrap` (10 failed before the fix); in the browser run, registering with the owner email returned 403 `OWNER_IDENTITY_RESERVED` and created nothing. Hosted owner is still **not provisioned/verified** (2 users, 0 verified).
* **Five missing files / path artifacts / backup (10):** **Windows tree inaccessible** (no device bridge in this session). Nothing was reconciled or recreated. The only known artifact is the committed stray file `tatus --short` at the repo root — delete it on Windows after reviewing `git status`.
* **`backend/data/uploads.sqlite` (3):** generated local state. Two differing copies existed (work tree: 1 row, a 70-byte test PNG legacy-import from my own probe, sha256 `ba393151…fe6c6`; extracted-copy test run: 0 rows, sha256 `795dd8ea…b9b571`). Both were preserved unmodified in `KAYAD-STAGE5A-LOCAL-STATE-BACKUP-20261019/` with a README (hash, size, rows, disposition) and excluded from the portable ZIP. Neither is user data and neither replaces the authoritative Windows database. `backend/data/uploads.json` is included as `[]` (baseline).
* **Constraints (12):** no commit, push, deploy, hosted data change, account reset or shared migration was performed.

### Final status: **READY WITH EXPLICIT BLOCKERS** (not the first option: live email, hosted DB, hosted owner identity are unverified; seller image-upload listing and Windows tree not tested).
