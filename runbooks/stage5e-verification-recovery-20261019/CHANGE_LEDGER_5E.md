# Change ledger (Stage 5E — verification-recovery scope)

Base: Stage 5D archive (sha256 `b44dc4f2…45c5`). Only these source files differ from it.

| # | File | Change | Reason (finding) | Test evidence |
|---|---|---|---|---|
| 1 | `src/services/authApi.ts` | new `AuthErrorKind` `owner_identity_unverified`; `403` + `responseData.code === 'OWNER_IDENTITY_UNVERIFIED'` classified before the existing 403 rules (code-keyed, never wording) | F-5E2-01 | `src/__tests__/services/authApi.ownerUnverified.test.ts` (4) |
| 2 | `src/pages/LoginPage.jsx` | for that kind: show the existing resend panel **and** keep the owner message visible | F-5E2-01 | `src/__tests__/pages/LoginPage.ownerUnverified.test.jsx` (2); without 1+2 → 3 of these 6 fail; real-browser journey `ui_owner_unverified` 6/6 |
| 3 | `backend/controllers/authController.js` | `resendVerification`: `assertEmailDeliverySucceeded` runs in **every** configuration (was only when `requiresEmailVerification()`) | F-5E2-02 | `backend/tests/regression/stage5eResendCommitOnProviderAcceptance.test.js` (13: 4 failed before the fix, all pass after) + existing `stage5aEmailVerificationGate` (13) |
| 4 | `backend/scripts/owner-bootstrap.mjs` | new offline `--verify-designated "<addr>[,<addr>]"`: booleans per typed address + masked typed form + count of unmatched configured entries; never prints configured values; needs no DB/key; other modes unchanged | F-5E2-03 | `backend/tests/regression/stage5eOwnerDesignatedVerify.test.js` (7) + existing `stage5bOwnerBootstrapCli` (5); `role_api_k` K9.5 |

Not changed: backend owner gate semantics, 5B governance SQL, migrations, dependencies, lockfiles, UI layout, any hosted setting.
Added evidence/harness: `evidence/stage5e2-20261019/**`, `role_api_k.mjs`, `ui_owner_unverified.mjs`, `restart_backend_k.sh`.
Rollback of this ledger = revert the four files (no data or schema effects).
