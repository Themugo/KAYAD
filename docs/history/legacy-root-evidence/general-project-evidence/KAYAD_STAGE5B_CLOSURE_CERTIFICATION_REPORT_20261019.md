# KAYAD — Stage 5B closure: independent owner-governance certification

**Final status: READY WITH EXPLICIT BLOCKERS**

Local implementation, migration rehearsal and packaging are independently verified. Hosted schema, live e-mail, mailbox verification of the two designated addresses, migration approval and the Windows-tree reconciliation remain open (UNRESOLVED_BLOCKERS_5B.md). No production readiness is claimed.

## 1. Foundation
* 5A ZIP re-hashed: `8aacd7db95b94085c1836f5e98e2bc33ccfc41fb1504d55f9163adc86d0c13fc` (matches the brief). 5B input ZIP re-hashed: `1b2bf64fbdde18f22476664d978842a7e78403d45d8136dced5d975c42fce03a` (unchanged; user commit `88d6813f`).
* Deliverable is a **complete project**. Working tree has no `.git`; Node 22.22.2 / npm 10.9.4. The Windows tree was not reachable and was not inspected. Earlier ZIPs were not modified. No file was deleted or renamed to make a test pass.
* This ZIP's own sha256, size, entry count, extraction results and every verification command are in the **external** files `….zip.sha256`, `….file-manifest.sha256.txt` and `….RELEASE_VERIFICATION_CERTIFICATE.txt` (a file cannot contain its own archive hash).

## 2. Audit result
All 15 invariants hold after correction (STAGE5B_CLOSURE_AUDIT_REPORT.md). The audit found **eight code defects**, one **Critical** (after the store was seen, a "not installed" error silently restored the env owner list), four High/Medium registry/route bypasses and recovery gaps, plus documentation/migration fixes (DEFECT_LEDGER_5B_CLOSURE.md). Each was reproduced by a failing test first: 11 of 13 new tests failed on the original 5B code, 13/13 pass now. Policy effects are recorded as D9–D17 and in the authorization matrix.

## 3. Migration rehearsal (disposable PostgreSQL 16 only)
97/97 owner checks; 15/15 upgrade/prerequisite/rollback checks (201 existing tables byte-identical after upgrade except the 6 intended control rows; clean atomic abort when `users.deactivated_at` is missing; rollback refuses without ledger export, removes every owner object, leaves users/sessions untouched, never resurrects revoked sessions). Live rollback on the real stack: the running process fails closed (503) instead of regaining env-list owners. After a migration the env list grants nothing; a verified designated account with no membership is an ordinary user (no escalation window). **Hosted gaps** (registration RPC, refresh-session columns, users security columns, e-mail index) are mapped to their migrations in HOSTED_SCHEMA_PREREQUISITES_5B.md and are **unverified against the hosted database**.

## 4. Test results (executed this run)
tsc 0; build 0; FE Vitest 662 passed / 1 skipped / 0 failed; BE Jest 124 suites 1884 passed / 0 failed; BE Vitest 36/36; node:test 1/1; PG owner checks 97/97; PG upgrade-rollback 15/15; API journey 136/136; closure journey 39/39; browser journey 25/25; validators 126 pass, **8 BLOCKED** (live/staging/production credentials); ESLint 0 new findings vs 5A baseline (1953 errors / 1517 warnings pre-existing). Details and commands: TEST_EVIDENCE_MATRIX_5B.md.

## 5. Lifecycle (disposable identities only)
All fifteen lifecycle steps in the brief were exercised on the real stack (J1–J11 plus closure C1–C7): bootstrap, redacted notification, correct and incorrect recipient, expiry/resend/replay/revocation, second owner, non-final removal, last-owner refusal, ordinary-admin refusal, self-claim paths, revocation with live HTTP and socket sessions, provider outage, interrupted acceptance, resumable recovery, emergency recovery without a permanent bypass, no secrets in ledger/log/response. **E-mail was a provider stub; no real address or hosted system was used.**

## 6. Residual risks
Step-up lockout is per instance; ex-owners cannot be hard-deleted; legacy/emergency modes are operator-controlled break-glass states; live deliverability, hosted schema and real-account state are unproven.
