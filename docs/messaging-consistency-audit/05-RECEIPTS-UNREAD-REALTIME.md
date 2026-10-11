# 05 — Two-account read receipts, unread counts and realtime

Evidence level: real server + real PostgreSQL (emulated REST layer), real `socket.io` server, `socket.io-client` sockets. Accounts: Alice, Bob (participants), Carol (outsider) — three independently authenticated users, each with their own cookie jar/JWT.
Test file: `harness/tests/m3-receipts-realtime.test.mjs` — **9 PASS, 0 FAIL**.

| # | Scenario | Observed | Status |
|---|---|---|---|
| 1 | Alice sends; sockets for Alice, Bob, Carol (outsider), anonymous all emit `joinChat` | Bob **one** `newMessage`, Alice (room member) one, **Carol none, anonymous none**; replaying the same idempotency key emits **no** second event; event carries the persisted id, sender id and text | PASS |
| 2 | Persisted row vs REST `GET messages` vs event | same id, text and sender identity; `seen:false`; unread: Bob 1, Alice 0 | PASS |
| 3 | Outsider Carol | cannot read the chat, cannot mark it seen, sees unread 0 | PASS |
| 4 | Read receipt | Alice calling `/seen` on her **own** message does not mark it; Bob's call sets `seenBy = [Bob]` exactly once (idempotent on repeat); Alice receives `messagesSeen{userId: Bob}`; Bob's unread → 0; REST shows `seen:true, seenBy:[Bob]` | PASS |
| 5 | 10 concurrent sends + 10 concurrent `/seen` | 11 messages, no lost message or receipt; after the final `/seen` every Alice message has `seenBy ∋ Bob`; unread 0 | PASS |
| 6 | Reconnect | a *new* connection that does not re-emit `joinChat` receives **no** `newMessage` (server behaviour, by design: rooms are per-connection); after re-join it does; the missed message is recoverable via REST | PASS (server) — client defect D-RT-1 fixed, see below |
| 7 | Socket authentication | handshake `auth.token` works; a socket with no usable credential is anonymous and never joins a private room | PASS |
| 8 | Failure recovery: server process killed and restarted | persisted state intact; retry with the same key after restart replays (`200`, same id); exactly one copy | PASS |
| 9 | Failure recovery: database object unavailable during a send | `5xx`, **nothing persisted**, retry with the same key succeeds once (`201`), exactly +1 message | PASS |

## Client defect found and fixed (D-RT-1)

`src/context/SocketContext.tsx::joinMessages` emitted `joinChat` once. Socket.IO rooms live only as long as the server-side connection, so after any transport drop/reconnect the SPA stayed connected but silently stopped receiving `newMessage` until the user re-opened the conversation. Fix: the channel also re-emits `joinChat` on every `connect` event and removes that handler with the channel. Unit test `SocketContext.rejoin.test.tsx` fails without the fix. Browser-level reconnect of the real SPA was **NOT RUN**.

## Observations (not changed)

* **Event/REST shape difference.** The `newMessage` event carries `sender` as a user id string; `GET messages` returns `sender` as a populated user object. The SPA tolerates this today; any new consumer must normalise.
* **Socket auth is JWT-signature only.** `server.js` verifies the handshake JWT but does not check `tokenVersion`, session revocation, ban or deactivation (HTTP `protect()` does). A revoked/banned user's existing token can keep a socket that joins its own chat rooms until it expires. P3, **open** (D-RT-2); not patched because it needs a decision on revocation lookup cost per handshake.
* **Cookie/host topology hypothesis — UNCONFIRMED.** The access cookie `token` is host-only and the SPA connects the socket directly to `https://api.kayad.space` with `withCredentials`. If production serves the SPA on a different host than the socket (e.g. via a `/api` rewrite on `www`), the socket would arrive anonymous and never join private rooms (silent, no error). This could not be tested without the production topology; reproduce by connecting from a different hostname (e.g. `localhost` vs `127.0.0.1`) or by logging `socket.user` on first connection in production. Status: **NOT RUN against production**.
* **Unread count** is computed server-side from persisted `seenBy`; it agreed with persisted state in every scenario above.
