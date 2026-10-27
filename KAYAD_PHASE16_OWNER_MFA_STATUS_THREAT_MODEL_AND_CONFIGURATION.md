# KAYAD Phase 16 — Owner two-factor authentication: status, configuration and threat model

## 1. Honest starting point (Phase 15 / audit)
There was **no working second factor** anywhere in the product. The only MFA code was a dormant, never-imported stub (`backend/identity/services/identityService.js`) whose verifier contained `const isValid = true; // Placeholder` — i.e. it would have accepted any code. No `mfa` table, no TOTP library, no Supabase Auth. That stub is **not wired in and was not enabled**; it is left untouched and must never be imported (recorded as a known hazard).

## 2. What is implemented now (local, real PostgreSQL, real application)
| Item | Implementation |
|---|---|
| Factor | **TOTP, RFC 6238** (SHA-1, 6 digits, 30 s), `backend/utils/totp.js`, `node:crypto` only; verified against the RFC 6238 and RFC 4226 vectors |
| Scope | **Platform owners only** (the highest-risk accounts). Other roles are unchanged and are not challenged |
| Secret at rest | **AES-256-GCM** with `OWNER_MFA_ENCRYPTION_KEY` (32-byte base64); random IV per secret; format `v1:iv:tag:ciphertext`. **No plaintext column exists** (checked in the pg suite). Missing/short key ⇒ **fails closed** (`OWNER_MFA_NOT_CONFIGURED`, 503) — nothing is enrolled with a weak key |
| Enrolment | owner-only, **password step-up**, secret + `otpauth://` URI returned **once**; factor stays `pending` until a valid code activates it |
| Sign-in | stateless: same `/login` request carries `mfaCode`. Owner with an active factor and no code ⇒ `401 MFA_REQUIRED` and **no session/cookie issued**; wrong code ⇒ refused; a valid code never rescues a wrong password |
| Replay | accepted time-step is advanced with a guarded single-statement update; reusing a code, or any earlier step, is refused |
| Brute force | 5 wrong codes ⇒ factor locked 15 minutes (the password account of that owner is not otherwise locked; other users unaffected) |
| Recovery codes | 10 single-use codes (`XXXXX-XXXXX`), stored only as HMAC-SHA256 hashes, shown once, usable at sign-in and for step-up; regeneration needs password + a code |
| Owner-management actions | invite / resend / revoke / remove / recover require **password + typed e-mail + second factor** when the acting owner is enrolled (`OWNER_MFA_REQUIRED`) |
| Lost device | (1) recovery code; (2) the **other owner** runs *Recover*, which revokes the membership, kills sessions, **resets the factor and recovery codes**, and issues a 24 h single-use recovery invitation; (3) emergency CLI (two independent controls) also resets factors. Accepting a recovery invitation resets the factor again |
| Audit | `mfa.*` events in the append-only owner ledger (`enroll_started`, `enrolled`, `code_failed`, `recovery_code_used`, `reset`, plus recovery-code regeneration); **no secret, code or recovery code is ever logged** (asserted by the E2E against the ledger) |
| UI | sign-in page shows an “Authenticator code” field only after the server asks; Owners screen has a “Your two-factor sign-in” panel (password → setup key shown once → code → recovery codes shown once) and a code field in every owner-changing dialog once enrolled |

## 3. Policy switch (`OWNER_MFA_POLICY`)
| Value | Meaning |
|---|---|
| `off` | no enforcement anywhere (enrolment still possible) |
| `enrolled_only` (**default**) | an owner who has enrolled is challenged at sign-in and for owner changes; an owner who has not enrolled is not blocked |
| `required` | additionally, owner-management changes are refused until the acting owner has enrolled. **Sign-in itself is never blocked by the policy**, so the policy cannot lock every owner out; disabling the factor is refused under `required` |

## 4. What is NOT done, and why (no overclaiming)
* **Not applied to hosted.** The tables (`owner_mfa_factors`, `owner_mfa_recovery_codes`) exist only in a migration **candidate**; hosted therefore behaves exactly as before (the service reports “not installed”; sign-in is unchanged).
* **Not tested with a real authenticator app / phone.** Correctness is proven against the RFC vectors and by generating codes with the same algorithm in tests. A staging check with a real app is on the checklist.
* **No QR image** (no QR library is installed and none was added); the screen shows the setup key and the `otpauth` URI. Manual key entry works in every authenticator app.
* **No SMS/e-mail OTP.** Deliberately: no provider is certified, and an OTP that “succeeds” without delivery would be fabricated assurance. Nothing in this phase sends or simulates one.
* **Only owners.** Extending MFA to admin/superadmin/dealers is a policy decision and is not made here.
* **No trusted-device/“remember me”** and no WebAuthn/passkeys.
* **Server key management:** `OWNER_MFA_ENCRYPTION_KEY` must be set and backed up; losing it makes every stored secret unreadable (recovery path: the other owner’s Recover, or the emergency CLI, then re-enrol).

## 5. Threat model (summary)
| Threat | Control | Residual risk |
|---|---|---|
| Stolen owner password | second factor at sign-in and for owner changes | phishing of a live code within 30 s; mitigated by single use of each time-step |
| Stolen open session / XSS | step-up (password + typed e-mail + code) on every owner change | session can still read owner screens |
| DB read access (SQL injection, backup leak) | secrets AES-GCM encrypted; recovery codes HMAC-hashed with a server pepper | attacker who also has the server key |
| Brute force of 6-digit codes | 5 attempts → 15 min lock, replay guard | lock can be used to annoy an owner (denial of that owner’s sign-in for 15 min); other owner can recover |
| Lost / stolen phone | recovery codes; other-owner recovery resets factor; emergency CLI | all owners lose devices **and** no recovery codes ⇒ operator CLI needed (documented) |
| Insider with low rank | owner routes require `requireOwner`; E2E proves 8 lower roles are refused; `protectAccount` blocks ban/deactivate/delete/role-change of owners from every staff rank | — |
| Misconfiguration (no key) | fails closed with an explicit error; nothing weak is stored | owners cannot enrol until the key is set |
| Policy lock-out | `required` never blocks sign-in | an owner who never enrolled cannot manage owners (but another enrolled owner can) |
