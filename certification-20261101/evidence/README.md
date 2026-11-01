# Evidence index
- `logs/` — command output. `*-BASELINE-*` files are the supplied checkpoint BEFORE any repair (failing). Unprefixed final files are the shipped tree.
- `screenshots-8-viewports/` — final real-browser (Chromium, production build) screenshots: sign-in, register, forgot-password, reset-password, verify-email at 320/360/390/412/430/768/1024/1440.
- `auth-audit-final.json` — per-screenshot metrics (overflow, control names, input sizes, console errors).
- `route-smoke.json` — all 86 discovered routes at 390 and 1440 px.
- `gate-admin-users.png` — what an unauthenticated visitor sees on a gated admin route (fail-closed, API unreachable in sandbox).
- `native-validation-output.txt`, `input-font-size-output.txt`, `local-csrf-probe-output.txt`, `local-degraded-login-register-output.txt` — probe outputs.
- `journeys-superseded-probe/` — FIRST interaction probe. 6 of its 22 checks reported FAIL because the probe looked for `aria-invalid`/`role=alert`, but the login form uses native HTML5 validation. Corrected in `native-validation-output.txt` (PASS). Kept for transparency; the FAILs are NOT app defects.
- `scripts/` — the Playwright/Node probe scripts used (run from outside the project against `vite preview`).
Console errors seen in screenshots (`ERR_TUNNEL_CONNECTION_FAILED`, 502) come from the sandbox's outbound proxy blocking external hosts; they are not app defects.
No secret values appear in any file here; the secret-scan CSV lists path, line and detector type only.
