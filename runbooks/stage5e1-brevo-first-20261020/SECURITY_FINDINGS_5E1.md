# Stage 5E.1 — Security / reliability findings (this stage)

Severity is for the **current hosted risk**, not the worst case. Status: FIXED = changed + tested + ledgered; OPEN = documented, owner decision or separate change; INFO.

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| F-5E1-01 | CI secret scan fails on a synthetic Brevo-shaped test fixture (`generic-api-key`) in 2 test files | Low (false positive) / CI-blocking | **FIXED** | fixtures replaced with a prefix-free opaque string; no allow-list; canary proves detection intact; 0 real-shaped keys in 1,181 commits |
| F-5E1-02 | No way to check "is Brevo actually usable" without sending mail; Stage 5D matrix row was BLOCKED | Medium (operational blind spot) | **FIXED (tooling)** | `backend/scripts/brevo-readiness.mjs` (offline by default; `--live-readonly` = two GETs, no mail, no secret output); 12 tests; **not run live** |
| F-5E1-03 | Two different definitions of "email is configured": adapter = key only (falls back to `noreply@kayad.space`); gateway `providerConfigured("email")` = key **and** `BREVO_FROM_EMAIL` | Medium | **OPEN** (documented, flagged by the tool) | with a key but no `BREVO_FROM_EMAIL`, verification mail is attempted from the default sender (rejected by Brevo unless validated) while event-driven mail via `emitCommunication` is silently skipped. Fix is to align predicates and fail visibly — not applied (behaviour change on production mail) |
| F-5E1-04 | Password reset persists the new reset token **before** the email is attempted and does not roll back on provider refusal | Low–Medium | **OPEN** | outside the verification-token invariant; `deliver()` returns a failed row rather than throwing, so the `.catch` never reports it. Impact: a failed send replaces a previously delivered reset link; user re-requests. Same fix pattern as resend |
| F-5E1-05 | Owner invitation **resend** rotates the stored token in the RPC before the email is attempted | Medium (pre-deployment) | **OPEN** | caller is told `delivered:false`, so it is visible, but the old link is already replaced. Governance tables are not installed on hosted, so no hosted exposure yet. Needs a two-phase RPC (stage new hash → send → promote on acceptance) before the migration is approved |
| F-5E1-06 | `FRONTEND_URL` unset ⇒ links fall back to `https://www.kayad.space` | Medium (staging/preview) | **OPEN** | a non-production backend without the variable mails production links; readiness tool reports it |
| F-5E1-07 | `withRetry` retries permanent 4xx (401/400/403) up to the retry budget, and its 30 s timeout timer is not cleared after success | Low | **OPEN** | wasted calls, and a stuck-open circuit after repeated 401s; timer shows up as a Jest open handle. Documented by `stage5e1BrevoAdapterRetry` |
| F-5E1-08 | `verifyEmail` consumes (nulls) the token before `User.findById/save`; if that save throws, the token is burned and the account stays unverified | Low | **OPEN** | recoverable by resend; 500 is generic |
| F-5E1-09 | Verify-link route is rate-limited per **IP only** (no email in a GET), 8 / 15 min | Low | **OPEN** | many users behind one NAT could exhaust it |
| F-5E1-10 | Resend case 5 residual: provider accepted, DB save failed ⇒ user holds a dead link | Low | **ACCEPTED / documented** | old link intact, retry allowed (cooldown keys off persisted token). Inherent to "commit only after acceptance" |
| F-5E1-11 | `deploy.yml` deploys production on every push to `main`, independent of the secret scan | Medium (process) | **OPEN (owner)** | use branch + PR + required checks |
| F-5E1-12 | Actions pinned to Node-20-only majors; Node 20 removal on runners announced for fall 2026 | Medium (CI continuity) | **OPEN (candidate patch ready)** | `WORKFLOW_MAINTENANCE_ASSESSMENT_5E1.md` |
| F-5E1-13 | `dependabot-auto-merge.yml:113` uses non-existent `steps.<id>.result` | Low | **OPEN** | pre-existing |
| F-5E1-14 | Historical Gitleaks matches (83 across history) — heuristic triage found no real credential; 8 lines left for human review | Informational | **OPEN (owner review)** | `GITLEAKS_FINDING_5E1.md` §6 |
| carried | F-5E2-01…13 from Stage 5E.2 (login panel, resend commit point, designated-verify tool, D-5E2-1 legacy-activation, public-repo exposure of owner addresses, …) | various | as recorded | `runbooks/stage5e-verification-recovery-20261019/SECURITY_FINDINGS_5E.md` |

No finding in this stage involved a credential having been exposed, a bypass of verification, or a modification of any account or data.
