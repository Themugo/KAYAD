# KAYAD Stage 5E.1 — Brevo-first owner verification, login recovery and secret-scan remediation

**Date:** 2026-10-20 · **Foundation:** Stage 5D archive (sha256 `b44dc4f2…45c5`, verified) → `main` @ `0a3d10bb` (Stage 5E.2) · **Node 22.22.2**
**FINAL STATUS: PARTIAL DIAGNOSIS — HOSTED EVIDENCE REQUIRED.** Source-level conclusions are confirmed; the state of the hosted environment, Brevo and the CI re-run are not. **Production readiness has NOT been certified.**

## Explicit statements (prompt §M)
| Question | Answer |
|---|---|
| Login block's source cause confirmed? | **Yes (source + disposable run).** `authController.login` returns 403 `OWNER_IDENTITY_UNVERIFIED` after the password is verified when the address is a designated owner and `users.email_verified !== true`. Whether the hosted account is in that state is inferred from earlier read-only evidence, not re-queried |
| Does resend use the canonical Brevo adapter? | **Yes.** `resendVerification → gateway.deliver → email.service.sendRawEmail → emailProvider.sendBrevoEmail → https://api.brevo.com/v3/smtp/email`. No other mail transport exists in backend code |
| Is replacement-token persistence gated on provider acceptance? | **Yes, in every configuration** (unconditional `assertEmailDeliverySucceeded` before `save()`), proven by 27 integration + 13 contract tests through the real gateway/adapter with stubbed HTTP; breaking it fails 18 / 11 tests. Mocked HTTP only — **no live Brevo evidence** |
| Gitleaks finding real or synthetic? | **Synthetic** — a fake Brevo-prefixed placeholder in two test files that matched the repo's `generic-api-key` rule by variable name + length. 0 real-shaped keys in 1,181 commits. Replaced with a prefix-free opaque string; **no allow-list added**; canary proves detection intact; git-mode old fixture = 2 leaks, corrected diff = 0 |
| Actual test and scan results | tsc 0 · build 0 · frontend Vitest 668 (1 skipped) · backend Jest **2011** · backend Vitest 36 · node 1/1 · validators 126 pass / 8 live-only non-zero (identical to baseline) · Gitleaks 16 → 14 (older findings only) · actionlint unchanged. Extracted-ZIP rerun in the package summary |
| Hosted operations performed | **NONE** |
| Neither real owner account modified | **Confirmed** — only disposable identities, and none this stage |
| Existing dealer and database records preserved | **Confirmed** — nothing hosted touched; nothing deleted/reset |
| Production readiness certified? | **No** |

## What was done
1. **Provenance (A):** Stage 5D hash verified; GitHub `main` inspected by read-only clone — `0a3d10bb` is the Stage 5E.2 package (tree identical apart from line-ending normalisation and ignored logs). Windows tree not observable.
2. **Gitleaks (F):** classified, remediated narrowly, verified with the same engine family and repo config (`GITLEAKS_FINDING_5E1.md`). The *same* fixture existed in the Stage 5A test and was fixed too. Older repository findings were triaged by heuristic (no genuine credential identified; 8 lines for human review).
3. **Brevo (C, E):** every identity email traced to the single adapter (`BREVO_EMAIL_FLOW_MAP_5E1.md`); resend semantics proven end to end (`RESEND_TOKEN_COMMIT_EVIDENCE_5E1.md`, scenarios 1–10 all covered); a read-only **Brevo readiness tool** added (not run live).
4. **Login block (D, H):** root cause re-traced with Brevo as the recovery channel (`LOGIN_VERIFICATION_ROOT_CAUSE_5E1.md`); runbook classification carried from 5E.2 — nothing hosted executed.
5. **Workflow warnings (G):** assessed with each action's real runtime; Node-24 candidate patch prepared and lint-checked, **not applied** (`WORKFLOW_MAINTENANCE_ASSESSMENT_5E1.md`). Found that every push to `main` deploys the production frontend independently of the secret scan.
6. **Hosted gate (I):** environment still UNKNOWN ⇒ no query; blocker matrix updated (`HOSTED_BLOCKER_MATRIX_5E1.md`).

**Application behaviour changed in this stage: none.** Changes are two test-fixture edits, four new test files, one read-only script and documents (`CHANGE_LEDGER_AND_PROVENANCE_5E1.md`).

## Key findings still open (`SECURITY_FINDINGS_5E1.md`)
- **F-5E1-03** two definitions of "email configured" (key-only adapter vs key + from-address gateway) — can silently skip event mail or send from the default sender.
- **F-5E1-04 / -05** password-reset and *owner-invitation resend* rotate their token **before** Brevo accepts (same hazard class as the fixed verification resend; the invitation one must be redesigned before the governance migration is approved).
- **F-5E1-06** `FRONTEND_URL` unset ⇒ production links from any environment. **F-5E1-11** push to `main` = production frontend deploy. **F-5E1-12** Node-20-only actions ahead of the announced fall-2026 removal.
- Owner decisions carried: **D-5E2-1** (in legacy mode the verification click *is* owner activation), D1/privilege items, second-owner address spelling, public-repo exposure of owner addresses.

## Blockers to any hosted step (`HOSTED_BLOCKER_MATRIX_5E1.md`)
Environment identity and deployed commits (B1) · Brevo key/sender/domain readiness (B2) · `FRONTEND_URL` (B3) · designated-list spelling on the host (B4) · D-5E2-1 (B5) · invitation-resend redesign (B6) · green CI on a branch (B7) · Windows tree (B8) · plus the unchanged 63/38 migration reconciliation.

## Next smallest safe action
Push this package to a **branch**, open a PR, confirm Gitleaks/CodeQL/CI are green (nothing deploys to production until merge); then supply the read-only evidence in `NEXT_STEPS_5E1.md` P1 (environment, deployed commits, `brevo-readiness.mjs --live-readonly` JSON, `--verify-designated` booleans).
