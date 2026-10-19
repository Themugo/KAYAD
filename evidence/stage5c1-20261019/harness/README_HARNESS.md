# Stage 5C / 5C.1 acceptance harness (not application code)

These Node scripts drive the **disposable local stack** over HTTP (and Socket.IO / Playwright for the UI). They are evidence, not part of the build.

Requirements (all local, nothing hosted): Node 22, PostgreSQL + PostgREST + a PostgREST prefix proxy (`../stack/`), the backend started with a disposable env (`../stack/restart_backend.sh`, reads `/home/claude/s5c/stack/backend.env`, **not shipped**), the Cloudinary stub (`../stack/cloudinary-stub.mjs`) and Brevo/SMS capture (`../stack/brevo-capture.mjs`), `npm install` in this folder (`socket.io-client`), and Playwright + Chromium for `ui_journeys.mjs` (its import path points at `/opt/node-tools`; adjust for your machine).

Run one journey: `KAYAD_ROOT=<project root> node role_api_h.mjs` (exit 0 = every check passed; `lib.mjs → summary()` writes the results JSON).

| Script | Journey |
|---|---|
| role_api_a … e | 5C onboarding / OTP / dealer-seller / inspector / owner governance / failure paths |
| role_api_f | 5C.1 dealer document upload (stub-backed) |
| role_api_g | 5C.1 dealer (G1) and private-seller (G2) listing images (stub-backed) |
| role_api_h | 5C.1 dealer session and revocation |
| role_api_i | 5C.1 private-seller session and revocation |
| ui_journeys | 5C browser journeys (real SPA) |

Paths in `lib.mjs` are absolute to the machine that produced the evidence; they are the only thing to adapt. Never point these scripts at a hosted database: they delete and create users.
