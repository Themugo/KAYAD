# Staging certification checklist (to be executed by a human in STAGING — nothing here was run)

Use a staging Supabase project and a staging Cloudinary folder/account — never production data. Record URL, status code, and redacted evidence for each row. Companion procedure for the Messages redirect: `02-STAGING-VERIFICATION-AND-ENV-CONVERGENCE-20261011.md`.

Accounts: `qa-alice` (buyer), `qa-bob` (seller), `qa-eve` (unrelated), `qa-admin`, `qa-support` (technical_support). One Alice↔Bob chat.

## 0. Preconditions
| # | Check | Expected | Result |
|---|---|---|---|
| 0.1 | `psql -f supabase/preflight/PREFLIGHT_MISSING_SCHEMA_OBJECTS.sql` on staging | Decide per object (esp. `transactions`, `config_*`, `disputes`); do not create objects from this repo without the hosted DDL | |
| 0.2 | Apply migrations through `20261011100000` to **staging** only; then `select kayad_chat_outbox_stats();` | `{"pending":0,...}` | |
| 0.3 | Backend env has `CLOUDINARY_*` for the staging account; `CHAT_OUTBOX_WORKER` not `off` | worker log line absent of "schema not migrated" | |

## A. Cloudinary access control (BLOCKED locally)
| # | Step | Expected |
|---|---|---|
| A1 | Alice `POST /api/upload` (`folder=chat`, a real PNG) | `200 {uploadId}`; **no** `url/thumb/card` in the body |
| A2 | In the Cloudinary console, find the asset | Delivery type = **Authenticated** (not "Upload") |
| A3 | Alice sends a message with `attachments:[{uploadId}]` | 201; response/list contain `url:"/api/chat/<id>/attachments/<uploadId>"`, no `res.cloudinary.com` |
| A4 | Bob (browser, signed in) opens that path | 200 image or 302 → image; redirect `expires_at` ≈ 2 min ahead |
| A5 | Copy the 302 target URL, wait > 2 min, open in a private window | Fails (expired) |
| A6 | Open the app path in a private window (no cookie) | 401 |
| A7 | Eve (signed in) opens the same path | 404 |
| A8 | Remove Bob from the chat (`DELETE /api/chat/:id` as Bob), Bob opens the path again | 404 |
| A9 | Guess the Cloudinary public id URL without signature (`.../image/upload/...` and `.../image/authenticated/...`) | 404/401 from Cloudinary |
| A10 | Upload a vehicle image (`folder=vehicles`) and open it logged out | Still public (unchanged) |
| A11 | Upload a text file renamed `.png` | 400, no asset created |
| A12 | Run `node backend/scripts/migrate-chat-attachments-private.mjs` (dry-run) against staging | Manifest lists only legacy public `kayad/chat` assets; no `--apply` until reviewed |

## B. Authenticated Socket.IO
| # | Step | Expected |
|---|---|---|
| B1 | Browser DevTools → WS → handshake to the socket host: is the `token` cookie sent? | **This decides D-RT-3.** If not, the socket is anonymous: apply the socket-ticket option in `02` §5 |
| B2 | Anonymous Socket.IO client connects, listens to all events | Receives **no** `onlineUsers` or user ids |
| B3 | Alice and Bob authenticated; Bob sends | Alice gets `newMessage` (only if a client subscribes; the current UI does not call `joinMessages`) |
| B4 | Eve authenticated emits `joinChat` for the Alice↔Bob id, Bob sends | Eve receives nothing |
| B5 | Expire Alice's access token (short `ACCESS_COOKIE_MS`), keep the socket open | After expiry server emits `sessionExpired`; client reconnects; no private events while expired |
| B6 | Run 2+ backend instances (if that is how staging runs) and test B3 across instances | **Expected to fail without a Redis adapter** — decide before scaling |

## C. Two-account messaging and delivery
| # | Step | Expected |
|---|---|---|
| C1 | Alice → Bob message; Bob's notification list | Exactly one "New message" notification |
| C2 | Same request twice (same Idempotency-Key) | Second is 200 replay, no duplicate notification |
| C3 | Temporarily make `notifications` inserts fail (staging DB only), send, restore | Notification appears within ~15–60 s after restore; `kayad_chat_outbox_stats()` shows it passing through `pending` → `done` |
| C4 | Kill/restart the API right after a send | No lost notification; no duplicate |
| C5 | `select * from chat_message_outbox where status='dead'` after a day | Empty (otherwise investigate; rows hold ids only) |
| C6 | Read receipts and unread counts per user (existing M3 behaviour) | Unchanged |

## D. Messages login redirect (P0 fix, unchanged)
Run steps 1–11 of `02` §4 on the staging build (authenticated nav to `/?nav=chat`, refresh, expiry → single refresh, revoked session → `/login?next=%2F%3Fnav%3Dchat` and return, API outage → recovery screen without redirect, non-participant 403/404).

## E. Config statistics
| # | Step | Expected |
|---|---|---|
| E1 | Anonymous `GET /api/config/stats` | 401 |
| E2 | qa-alice / qa-bob / qa-support `GET /api/config/stats`, `/entries`, `/features` | 403 |
| E3 | qa-admin same | 200 once the config tables exist (500 until D-SCHEMA-2 is resolved) |
| E4 | App vehicle-make dropdown (Inspection marketplace) | Still loads for a signed-in user |

## Sign-off
Each row PASS / FAIL / BLOCKED with evidence link, reviewer, date. Do not promote to production while A5–A8, B2, B4, C3 or E2 is not PASS.
