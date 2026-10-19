# Login block — root-cause analysis (Stage 5E, verification-recovery scope)

Observed by the owner (reported, not reproduced against hosted):
> "The platform-owner account is not verified. Use 'Resend verification email' for the owner address and open the link, or follow the approved owner-recovery runbook (runbooks/identity-staging/01_OWNER_RECOVERY_GATE.md); then sign in again."

Classification key: **S** confirmed from source · **L** confirmed by local/disposable test · **H** confirmed by approved read-only hosted evidence · **I** inferred, not verified · **U** unknown.

## 1. Where the message comes from (S, L)
| Item | Evidence |
|---|---|
| Text + machine code | `backend/config/owners.js` → `OWNER_IDENTITY_UNVERIFIED_RESPONSE` (HTTP body `{success:false, code:"OWNER_IDENTITY_UNVERIFIED", retryable:false, message}`) |
| Predicate | `isUnverifiedOwner(user)` (`owners.js`): `email` normalised (NFKC, trim, lower-case) is non-empty **and** `user.emailVerified !== true` (strict) **and** (the address is in `WEBHOIST_EMAIL`/`WEBHOIST_EMAILS` **or**, in database mode, holds an active membership) |
| Raised at login | `authController.login` — immediately **after** the password has been verified (bcrypt compare), after the lockout/ban/deactivation checks, before the generic email-verification gate. Returns **403** + the object above |
| Raised elsewhere | `refreshToken` (same 403), `middleware/auth.protect` (same 403), `optionalAuth` / socket identity (treated as *not an owner*, no error) |
| Not raised by | `/auth/me` for an unauthenticated caller; a wrong password (→ 401 `Invalid credentials`) |

**Consequence (L, K1.2–K1.5):** the owner message can only be produced by a request that supplied the **correct password** for an account whose address is a **designated owner address on the deployed backend** and whose `email_verified` is not `true`. A wrong password yields the generic 401; a non-designated unverified dealer yields the *ordinary* verification error with a different code (K1.5). So the report itself is evidence that (a) the password was right and (b) the address typed is in the deployed `WEBHOIST_EMAIL` list (I) — an incorrect password is **not** the cause.

## 2. What drives the condition
| Question | Answer | Tier |
|---|---|---|
| Configured owner email, stored role, flag, governance record, or verification field? | A **combination**: designation (env list, or active membership in database mode) × `users.email_verified`. `users.role` and any "platform-owner flag" are **not** consulted | S |
| Consistent across login, `/auth/me`, HTTP middleware, socket? | Yes — one shared predicate in `config/owners.js` used by `login`, `refreshToken`, `protect`, `optionalAuth`, `socketAuth.service`; tests A3/A6 (`stage5aOwnerIdentityBootstrap.test.js`) and `role_api_k` K1/K7 | S, L |
| Configuration load timing | `OWNER_EMAILS` is computed **once at module import** from `process.env`; a changed env needs a restart. Missing/empty list ⇒ nobody is designated (nothing granted, nothing reserved); a malformed/misspelled entry is accepted silently (it simply designates a different address) | S, L (K9) |
| Conflicting configuration | Duplicates/case/whitespace are folded (`Set` + NFKC); a *typo'd* address is indistinguishable from a deliberate one. `--plan` masks (`ka***@gmail.com`) so two spellings look identical → new `--verify-designated` (F-5E2-03) | S, L |
| Correct security block or inconsistent state? | **A correct security block** (Stage 5A Gate A): a designated address is never honoured as owner until its mailbox is proven. The account state (unverified) is genuine, not an inconsistency | S, L, H(prior stage: jimmy = dealer/pending/unverified) |

## 3. Does the message tell the owner something true?
- "Use *Resend verification email*": the backend endpoint exists and works (K2), **but the login screen did not render that button for this error** — `LoginPage.jsx` showed it only for the generic "verify your email" error. The sentence pointed at a control that was absent on that screen (S; reproduced red by `LoginPage.ownerUnverified.test.jsx`, 3 of 6 new frontend tests fail without the fix). **Fixed in this stage** (F-5E2-01): the client now classifies by the machine code and shows the owner message *and* the resend action. Workaround that existed before: `/verify-email` page (has an email box + resend) or `/login?verify=required`.
- "…open the link": only useful if a mail can actually be delivered. If Brevo is not configured on the deployed backend the endpoint still answers 202 and no mail leaves (S: `requiresEmailVerification()` false ⇒ provider failure was previously swallowed *and the token replaced*; **fixed**, F-5E2-02). Whether hosted has Brevo configured is **U** (provider-readiness gate).
- "…or follow the approved owner-recovery runbook": the runbook is staging-oriented and mutation steps need authorisation (see `RECOVERY_RUNBOOK_CLASSIFICATION_5E.md`).

## 4. Deployed revision (U, with one inference)
The message and code exist only in Stage 5A+ source, so the deployed backend contains **at least Stage 5A** (I — the string was observed by the owner). Which exact commit is deployed is **U**. Windows check (read-only): `git log --oneline -S"platform-owner account is not verified" -- backend/config/owners.js`, then compare with the host's deploy log commit.

## 5. Evidence that would distinguish the competing explanations
| Hypothesis | Observable that confirms / rules out | Read-only way to get it |
|---|---|---|
| **A. Unverified designated owner (most likely)** | `users.email_verified=false` for the typed address; address ∈ deployed designated list; password correct (otherwise 401) | `select email_verified, role, status from users where lower(email)=lower(<addr>)`; `node backend/scripts/owner-bootstrap.mjs --verify-designated "<addr>"` run **in the host's shell** (prints booleans only) |
| B. Owner-email **mismatch / typo** in the deployed config | `--verify-designated` returns `configuredExactly:false` for the intended address while the account still blocks ⇒ the *typed* account is designated under another spelling | same command |
| C. Missing schema | Would show as 500s on login/verify, **not** this 403 (the gate runs after a successful user + auth read) | host logs, `GET /health` |
| D. Broken verification token | Link click returns 400 "Invalid or expired" (K2.5/K2.7/K2.11 show each variant) while block persists | try the link; host logs |
| E. Stale deployment | Message text/code differs from this source, or `/api/owner` returns 404 | response of an unauthenticated `GET /api/owner-access/invitation?token=x` (404 ⇒ pre-5B build; 4xx JSON ⇒ 5B+) |
| F. Provider not configured | resend answers 202 but no mail arrives; `communication_deliveries` row `failed` with `BREVO_*` error | admin delivery log / provider dashboard (U) |

## 6. Which fix path applies to the hosted account? (Decision D-5E2-1, owner's)
Hosted today has **no governance tables** (H, prior stage) ⇒ registry mode is **legacy**: *designated + verified = owner*. Therefore clicking the verification link **is the owner-activation event**, with no invitation, no audit row and no last-owner protection. See `TWO_OWNER_ACTIVATION_MATRIX_5E.md` §3 for the ordering hazard when the governance migration is applied later.
