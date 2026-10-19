# KAYAD Stage 5E — Owner verification recovery, multi-owner governance & hosted-environment reconciliation

**Date:** 2026-10-19 (Africa/Nairobi) · **Foundation:** Stage 5D full-project ZIP, sha256 `b44dc4f2d0ada531e9c7e04382f2185b6ce5693b28af793b14d9dd0a6dc845c5` (verified before extraction)

## 1. Final status: **PARTIAL DIAGNOSIS — HOSTED EVIDENCE REQUIRED** (source-level root cause confirmed; no hosted change)
The **source-level** cause is confirmed (tier S + L). Attribution to the live account rests on prior-stage hosted data and on your observed message, not on a fresh hosted read. The login message is produced by one specific source condition and is a *correct* security block; it can only appear after a **correct password** for an address that is in the deployed owner list and whose `email_verified` is not `true`. Two source defects that made the recovery path unreliable were found and fixed in the work copy (undeployed). The hosted state itself was **not** re-queried (environment classification UNKNOWN), so everything about the hosted database is carried forward from the earlier read-only pass and labelled as such. This stage does **not** certify production readiness.

## 2. Root cause (source-level)
`backend/config/owners.js` → `isUnverifiedOwner(user)` (designated address × `email_verified !== true`) → raised by `authController.login` (after bcrypt succeeds), `refreshToken`, `middleware/auth.protect` as **403 `OWNER_IDENTITY_UNVERIFIED`**. Tier S + L (reproduced on the disposable stack, K1.2–K1.5: wrong password → generic 401; correct password + unverified designated → this 403; a non-designated unverified dealer → a *different* code). Whether the typed account is `ji***@…` is inferred (I), consistent with the earlier hosted read (dealer / pending / **unverified**). Full analysis: `runbooks/stage5e-verification-recovery-20261019/LOGIN_VERIFICATION_ROOT_CAUSE_5E.md`.

## 3. Findings that matter to you
1. **The message pointed at a button that was not on the page.** `LoginPage` showed *Resend verification email* only for the generic "verify your email" error. **Fixed** (code-keyed classification + panel), proven red→green and in a real browser.
2. **Resend could silently destroy a working link.** With the provider unconfigured or the verification flag off, a failed send still replaced the stored token. **Fixed** (4 tests failed before, pass after).
3. **On the hosted system today, verification = owner activation.** Governance tables are absent ⇒ *legacy mode*: a designated address that is verified **is** the owner — no invitation, audit row or last-owner protection. The login message steers you straight into this. Decision **D-5E2-1** is yours (do nothing until the governance migration is approved / accept legacy activation now / rehearse first).
4. **Ordering hazard:** applying the governance migration later removes that legacy authority until a bootstrap invitation is accepted (no seeding). Plan migration + `--apply` as one window.
5. **The second owner cannot be activated on hosted today** (reserved address cannot register; no invitation machinery until the migration).
6. **Spelling discrepancy:** repo docs spell the second address with one "a" in `kayad?automotives`, your instruction with two. Deployed `WEBHOIST_EMAIL` is a host secret (unknown). New offline `--verify-designated` lets the host operator check exact spelling as booleans (the old `--plan` masks both spellings identically). A typo means the intended address is **unreserved** and the wrong one reserved — never a privilege grant (tested).
7. **Recovery runbook:** its "test the password reset first" step is a hosted mutation and would **not** clear this block (reset does not verify email).
8. **Public repo exposure:** stage documents already publish the owner mailbox addresses (F-5E2-13); this stage's documents use masked forms.

## 4. Resend / verification flow — implemented correctly in source?
**Yes after the F-5E2-02 fix** (enumeration-safe uniform 202, per-account cooldown, 64-hex token stored as SHA-256, 24 h expiry, single use, replacement committed only after provider acceptance, rate-limited, no tokens in logs). Residual low items: fire-and-forget send, non-atomic verify, prod-domain fallback for the link origin, no audit row. Live Brevo delivery is **unproven** (stub only). `VERIFICATION_RESEND_FLOW_TRACE_5E.md`.

## 5. Two-owner activation design — state
Existing 5B governance is sufficient and was **not** replaced. Disposable-stack proof (93/93 + 35/35 + 63/63): Path A (verify, then accept signed in — password/sessions/role/status/dealer rows unchanged) and Path B (unverified takeover — password replaced, sessions revoked, role/status unchanged); second owner created only by invitation; bootstrap closes only when both are established; negatives for expired/revoked/replayed/duplicate/concurrent/mismatched/audit-failure/last-owner/config-fault. `TWO_OWNER_ACTIVATION_MATRIX_5E.md`.

## 6. Work completed / changes
4 source files changed (`authApi.ts`, `LoginPage.jsx`, `authController.js`, `owner-bootstrap.mjs`) + 4 new test files; evidence, harness and the documents listed in `README_STAGE5E_VR_RELEASE.md`. Ledger: `CHANGE_LEDGER_5E.md`. Prior-pass 5E artifacts carried forward unchanged.

## 7. Tests (observed) — `TEST_MATRIX_5E.md`
tsc 0 · build 0 · frontend Vitest **668 passed / 1 skipped** · backend Jest **1961 passed (135 suites)** · backend Vitest 36 · node:test 0 · validators 126/134 (the **same 8 environment-dependent** live/prod/backup validators as before) · PG 63/63 · privilege candidate rehearsal ok · `role_api_k` **93/93** · `role_api_j` 35/35 · a/b/c/d/h/i 70/67/55/49/60/64 · `ui_owner_unverified` (Chromium) 6/6 · broad `ui_journeys`: **run 1 = 14 pass + 1 intermittent harness timeout (UD.4), run 2 = 35/35** (cause of run 1 unestablished). Independent extraction of the final ZIP: see package summary.

## 8. Hosted operations: **NONE.** No hosted query was run this stage. No account touched; neither owner identity or the dealer record modified; nothing deleted or reset.

## 9. Outstanding blockers
Environment classification/confirmation (G1–G2) · deployed revision (G11) · 38 hosted-only migration SQL not exported/reviewed (G4) · no reviewed migration plan or restore test (G5, G10) · owner decisions D-5E2-1/-2/-3 and D1 (G7) · Brevo/sender/`FRONTEND_URL` readiness (G12) · Windows reconciliation (G13). `AUTHORIZATION_GATES_5E.md`.

## 10. Next smallest safe action
Tell me whether `ubvgixwhfybbyjuvxboj` is production, choose D-5E2-1, and run the read-only commands in `WINDOWS_READONLY_COMMANDS_5E.md` (especially the host-shell `--verify-designated` and the deploy-SHA comparison). Do **not** click a verification link on the live system until you have chosen D-5E2-1.

## 11. Package
See `README_STAGE5E_VR_RELEASE.md` and the delivery note for the ZIP path and SHA-256.

**This stage does not certify production readiness.**
