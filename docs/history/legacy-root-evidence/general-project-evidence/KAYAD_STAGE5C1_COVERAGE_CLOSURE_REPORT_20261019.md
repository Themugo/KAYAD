# KAYAD Stage 5C.1 — Coverage Closure, Provenance and Release Reverification (2026-10-19)

## FINAL STATUS: **COVERAGE CLOSURE VERIFIED — LIVE BLOCKERS REMAIN**

All locally testable coverage gaps named in the 5C.1 brief are closed on a real local stack with a disposable PostgreSQL. Nothing here is hosted (H) or live (L) evidence. The live/hosted blockers below are unchanged and are **not** resolved by this work. ZIP integrity and independent-extraction results are recorded in the standalone release verification certificate (an archive cannot contain its own hash).

Evidence tiers: M mocked · **R real local stack** · **P disposable PostgreSQL** · H hosted · L live. Storage = **stub-backed** (local Cloudinary stub; *no byte was sent to real Cloudinary*). E-mail/SMS = capture stubs (no live delivery).

## Foundation (corrected in 5C.1)
The Stage 5C source was the **certified Stage 5B closure archive** `KAYAD-STAGE5B-OWNER-GOVERNANCE-CERTIFIED-FULL-PROJECT-20261019.zip`, full SHA-256 `b8b377d7c90c07cb00073600de1161cc138e4e33afb0b4a562d3312d84c1bdee`, which superseded the first 5B archive (`1b2bf64fbdde18f22476664d978842a7e78403d45d8136dced5d975c42fce03a`). Stage 5C ZIP: `f6da5adcc07e9bb03b52bb00d437ddda898febaff84a49fd8b7e5634d6090fec`; commit on `main`: `d9bfccfb34c5fb37dcfe5a2a1340ee053288dd86`. All three hashes were recomputed from the files, and the commit tree was compared with the 5C ZIP file by file. Details and the exact differences: `runbooks/stage5c1-coverage-20261019/PROVENANCE_RECORD_5C1.md`.

## Result table (per brief §10)
| # | Item | Result | Evidence (tier) |
|---|---|---|---|
| 1 | Foundation provenance and checksum | **PASS** | both 5B archives and the 5C ZIP hashed from the actual files; source determined by member comparison; commit tree inspected (R/artifact inspection) |
| 2 | Dealer document upload | **PASS** (R+P, stub-backed) | `role_api_f` **53/53** |
| 3 | Dealer listing-image upload | **PASS** (R+P, stub-backed) | `role_api_g` G1 (52 of 104 checks) |
| 4 | Private seller listing-image upload | **PASS** (R+P, stub-backed) | `role_api_g` G2 (52 of 104 checks), run independently with its own users/listings |
| 5 | Dealer session and revocation | **PASS** (R+P) | `role_api_h` **60/60** |
| 6 | Private seller session and revocation | **PASS** (R+P) | `role_api_i` **64/64** |
| 7 | Existing regression suites | **PASS** | tsc, build, front vitest, back jest/vitest/node:test, validators (table below) + journeys A–E and UI |
| 8 | ZIP integrity and independent extraction | see release verification certificate | produced at packaging time |

## Journey results (work tree `/home/claude/s5c1/work`, backend + Vite served from it, `NODE_ENV=development`)
Run: `KAYAD_ROOT=<tree> node <journey>.mjs` (harness: `evidence/stage5c1-20261019/harness/`). Logs: `evidence/stage5c1-20261019/logs/`, JSON: `…/results/`.

| Journey | Exit | Duration | Pass / Fail / Skip | Services used |
|---|---|---|---|---|
| `role_api_a` onboarding/OTP (5C) | 0 | 30 s | 70 / 0 / 0 | real Express + PG; e-mail/SMS capture stubs |
| `role_api_b` dealer/seller/verification (5C) | 0 | 7 s | 67 / 0 / 0 | same |
| `role_api_c` inspector (5C) | 0 | 6 s | 55 / 0 / 0 | same |
| `role_api_d` owner governance (5C) | 0 | 10 s | 49 / 0 / 0 | same |
| `role_api_e` OTP/Brevo failure paths (5C) | 0 | 69 s | 30 / 0 / 0 | same |
| **`role_api_f` dealer document upload (5C.1)** | 0 | 10 s | **53 / 0 / 0** | + Cloudinary **stub** |
| **`role_api_g` dealer (G1) and seller (G2) listing images (5C.1)** | 0 | 32 s | **104 / 0 / 0** | + Cloudinary **stub**, media-job ledger RPCs on PG |
| **`role_api_h` dealer session/revocation (5C.1)** | 0 | 12 s | **60 / 0 / 0** | real Express + PG, real Socket.IO |
| **`role_api_i` seller session/revocation (5C.1)** | 0 | 13 s | **64 / 0 / 0** | real Express + PG, real Socket.IO |
| `ui_journeys` (Playwright, real SPA) | 0 | 56 s | 35 / 0 / 0 | + Vite dev server |
| **Total** | | | **587 / 0 / 0** | |

### Dealer document upload (F) — what is covered
* *Onboarding documents* (`PUT /api/dealer/onboarding`; the SPA has **no** file picker for these — documents are numbers/types, not files, see O5C1-02): malformed/missing/wrong-typed/oversize payloads → 400 with no verification row; client-supplied `verified:true`, extra keys and URLs are not persisted; onboarding never approves; resubmission is retry-safe with no duplicate rows; an injected verification-write fault returns an error (no false success) and does not leave the dealer `onboarding_complete` without a verification; recovery on retry. Denied: anonymous, private seller, buyer, ordinary admin; another dealer cannot read the documents; ordinary admin may *review* (existing policy) but not approve (owner-reserved).
* *Document file upload* (`POST /api/upload`, folder `documents`): private/authenticated storage type, metadata (owner, visibility, mime, provider) persisted; owner reads, other dealer/seller/buyer/anonymous denied (403/401), admin read per existing policy; same denial for delete. Rejected: text-as-PNG, JPEG-declared-as-PNG, PDF/executable MIME, SVG, > 5 MB, no file, bad folder, anonymous. None of the rejected requests reached the provider or created a record. Provider failure → error, no record; retry → exactly one record; identical re-upload is a distinct asset; own delete removes the record. Production storage configuration untouched (stack points only at the stub).
* No personal identity document was sent to any bucket: the stub is local and the files are 1×1 test images.

### Dealer (G1) and private-seller (G2) listing images — what is covered (each role, own users and listings)
Create with 2 images through the real multipart API (201, listing `pending`, owned by caller, images initially flagged pending) → background upload completes with provider `public_id` + URL, stub received exactly the 2 file parts as **public** `kayad/cars` media, media-job ledger `completed`, local temp files removed → owner sees the images in their own listing view, another user does not → moderation holds (not in the public marketplace; owner cannot self-publish) → add an image (200, exactly one file to the provider) → attach/delete/edit by another user of the same role, the other seller role, a buyer, an inspector and an anonymous caller are all rejected with nothing changed → ordinary admin may manage per existing MANAGE_CARS policy (recorded, O5C1-04) → invalid type/content/SVG/oversize/no file/11 files/no image/malformed metadata/bad image type all 400 with no listing, no storage call and **no temp file** → per-listing cap of 20 → storage failure on add = error, listing unchanged → create with a failing provider = accepted-but-pending, image never marked uploaded, durable failure record (attempts > 0, error stored), source file retained for recovery, listing stays non-public → retry attaches exactly one image, no duplicate listing.

### Dealer (H) and private-seller (I) sessions — what is covered (each role, own users)
Login (access cookie + rotating refresh cookie) → role APIs reachable → admin/owner APIs denied → profile role → refresh (new access token, rotated cookie) → **replay of a used refresh token refused and the whole family revoked** → garbage / wrong-secret / expired / `alg:none` / payload-edited (role escalation) / stale-`tokenVersion` tokens all 401 → socket: authenticated by access token, anonymous without credentials or with a tampered token, ticket minted from the cookie session and **single-use**, reconnection with a fresh ticket, anonymous cannot mint a ticket → list sessions, revoke one, revoke-all (access token 401, refresh refused, socket and previously minted ticket no longer authenticate), fresh login works → logout (token 401 server-side, refresh refused, socket/ticket dead) → password change kills other sessions → ordinary-admin ban (existing token 403, login/refresh refused, socket anonymous), unban restores → **a live, connected socket is downgraded (`sessionExpired`) when its session is revoked** → superadmin deactivation (403, login refused), reactivation restores.
Dealer-specific: un-onboarded dealer cannot create a listing (403, no row), is denied admin APIs; owner suspension of the dealer verification blocks listing creation (403) and reinstatement restores it; dealer keeps dealer access and stays denied owner governance after all revocations.
Seller-specific: unverified seller cannot obtain a session; seller B cannot see, modify or delete seller A's listing (403/404, row untouched), cannot list A's sessions or revoke A's session (A stays signed in); seller stays denied owner/admin APIs; dealer-platform endpoints are caller-scoped (O5C1-01).
Every revocation assertion checks **server state** (401/403 from the API or an unauthenticated socket), not a front-end redirect.

## Regression (5C.1 work tree)
| Suite | Result | Exit | Duration |
|---|---|---|---|
| `npx tsc --noEmit` | clean | 0 | 26 s |
| `npm run build` | built | 0 | 3 s |
| Front vitest | 83 files, 662 passed, 1 skipped (663) | 0 | 102 s |
| Back jest | 131 suites, **1933 passed**, 0 failed (+4 new tests, 1 new suite `tests/stage5c1/uploadCleanup.test.js`) | 0 | 93 s |
| Back vitest | 6 files, 36 passed | 0 | 11 s |
| Back node:test | 1 / 1 | 0 | < 1 s |
| Validators | 126 exit 0; **8** non-zero, identical to the 5C final run and the 5C extracted run (all need live/staging resources) | — | — |

Note: earlier reports said "9" non-zero validators; the list has 8 — the ninth was the runner's `DONE` marker (D5C1-04).

## Defects found and fixed (tests before fixes)
| ID | Defect | Evidence before → after |
|---|---|---|
| **D5C1-02** | Multer wrote request images to `backend/uploads/` **before** validation/authorization/provider steps and never removed them when the request was then rejected or failed (create car, add images, dealer-platform inventory) — unbounded disk leak and orphaned user files | before-fix run on the unfixed 5C tree: 98 pass / **6 fail** (G1.16/27/31, G2.16/27/31; 3, 1 and 1 orphan files) — `logs/role_api_g.BEFORE_FIX_on_5C_tree.log` → after: **104 / 0**; unit tests 4/4 |
| **D5C1-01** | The 5C ZIP shipped test residue (`backend/uploads/*.png`, populated `backend/data/uploads.json`). Not committed to Git. | packaging guard + scrub in 5C.1; this ZIP verified free of both |
| D5C1-03 | 5C report did not name the foundation archive | corrected (this report, provenance record) |
| D5C1-04 | "9 non-zero validators" was 8 (+ `DONE` marker) | corrected |
Fix: `cleanupUploadsOnError` in `backend/middleware/upload.js`, wired before `upload.array` in `carRoutes.js` (2 routes) and `dealerPlatformRoutes.js` (1 route); it deletes the multer files when the response finishes with status ≥ 400 and keeps them on success (they are still needed by the background provider upload). No other behaviour changed. Owner-governance semantics untouched.

## Observations recorded (not defects; no authorization semantics changed)
O5C1-01 `dealerOnly` admits both seller roles, so a private seller can call `/api/dealer-platform/*` and a dealer can call `/api/v1/cars/my-listings`; every response is scoped to the caller (asserted). Owner decision if it should be narrowed. · O5C1-02 the dealer onboarding SPA has no document-file upload; the document-file path (`/api/upload`) is API-only today. · O5C1-03 admin can read private uploads (existing policy). · O5C1-04 ordinary admin can edit/delete others' listings via MANAGE_CARS (existing staff policy). · O5C1-05 `GET /api/v1/cars/:id` returns 404 for pending listings even to the owner; owners use the role's own listing endpoints. · O5C1-06 the stack runs `NODE_ENV=development` (5xx bodies include stack traces); production-mode error shaping was not exercised. · O5C1-07 automatic re-upload of failed background media depends on a recovery worker that was not located or triggered; failures are durably recorded and the owner can re-add images. · O5C1-08 a connected socket is downgraded at its next private-room join (tested) or at the periodic re-check (default 5 min, `SOCKET_REVALIDATE_MS`; the timer itself was not waited on). · O5C-01…12 from 5C remain open (see ledger).

## Remaining blockers (unchanged by 5C.1)
Live Brevo delivery unverified · live SMS unverified · hosted schema unread · the two designated real owner identities (`kayadautomotives@gmail.com`, `jimmythemugo@gmail.com`) not activated or verified · Windows working-tree reconciliation incomplete (now including 5 unreviewed files committed from that tree) · 5C migration candidate unapplied · deployed revision unknown. See `runbooks/stage5c1-coverage-20261019/UNRESOLVED_BLOCKERS_5C1.md`.

## Boundaries respected
No commit, push, deploy, hosted connection or hosted migration; no real account created or changed; disposable credentials only; no secrets, tokens or OTP values printed or shipped; verification never bypassed; no assertion weakened or test removed; four earlier test updates (5C) are unchanged. Earlier ZIPs untouched.
