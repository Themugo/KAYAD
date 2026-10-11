# Realtime authentication and host configuration (Phase F)

## 1. Which realtime mechanisms exist
| Mechanism | Used by the product? | Evidence |
|---|---|---|
| Custom **Socket.IO** server in `backend/server.js` | **Yes** — `SocketContext.tsx` (auction rooms, `notification` events via `NotificationContext`, inspections, control plane). Chat `joinMessages()` exists but **no component calls it** | source grep (`src/`) |
| **Supabase Realtime** (`postgres_changes` / channels) | **No** — the frontend has no `@supabase/supabase-js` client at all; the backend uses supabase-js only as a service-role REST client | `grep createClient src/` → none |
| `supabase_realtime` publication | Contains `bids, cars, conversations, messages, notifications` (migration `20260710043238`), but nothing subscribes | replay inventory |

Supabase Realtime is therefore unused attack surface: with the public anon key a client could subscribe to `postgres_changes` on those five tables. Realtime evaluates RLS per subscriber; under the replay with Supabase default privileges `anon`/`authenticated` read **zero** rows of these tables (`m10` #6–#8), so nothing is expected to leak, but this was **not executed against Supabase Realtime** (BLOCKED). Recommendation (not applied — platform configuration): remove the five tables from `supabase_realtime` once confirmed unused in staging (`alter publication supabase_realtime drop table …`).

## 2. Socket.IO path — verified controls (real `socket.io-client`, real server)
| Control | Test | Status |
|---|---|---|
| authentication from the session cookie or `auth.token` (HS256 JWT, server secret); forged/expired/wrong-alg tokens anonymous | `m7` #2, #5 | PASS |
| token expiry enforced on live sockets (downgrade, leave private rooms, `sessionExpired`) | `m7` #5 | PASS |
| authorised room joins only (participant query, never a client user id) | `m7` #2–#4 | PASS |
| eviction after leaving; blocked chat refused | `m7` #7, #8 | PASS |
| reconnect = re-authorisation | `m7` #6 | PASS |
| two accounts, private delivery once | `m3`, `m7` #3 | PASS |
| no global identity broadcast | `m7` #1 | PASS |
| persisted message = event payload = unread counts | `m3` | PASS |

## 3. Host / cookie compatibility — reproduced in a real browser
**Question.** The SPA calls `/api/*` on its own host (Vercel rewrite → `api.kayad.space`), so the session cookie (`token`, HttpOnly, SameSite=Lax, **no Domain** attribute → host-only) belongs to the **app host**. `SocketContext` connects to `VITE_SOCKET_URL` — `https://api.kayad.space` per `.env.example` — a **different host**.

**Reproduction** (`harness/browser/realtime-host-probe.mjs`): real Chromium, real production bundle, real `server.js` + Socket.IO. Two hostnames resolved to 127.0.0.1: `app.kayad.test:3000` (bundle + Vercel-like `/api` proxy) and `api.kayad.test:5070` (backend). Cookie planted exactly as login sets it (host-only on the app host). Signal: the server emits `notification` to `user_<id>` and `newMessage` to `chat_<id>` — only an authenticated socket can be in those rooms.

| Variant | Socket connects | Cookies the browser sends to the socket host | Private events received |
|---|---|---|---|
| **Cross-host** (`VITE_SOCKET_URL=http://api.kayad.test:5070`, mirrors production) | yes | **none** | **none** (anonymous socket; `joinChat` refused) |
| Same host, other port (`http://app.kayad.test:5070`) | yes | `token`, `XSRF-TOKEN` | `notification` **and** `newMessage` |

Result file: `evidence/certification-20261011/browser/realtime-host-probe.json`. **Diagnosis (evidence-based, local):** with the documented production topology the browser socket is anonymous, so realtime notifications and any private room never reach users in production; REST messaging and persisted notifications are unaffected. **Not verified against the real hosts** (sandbox cannot reach `kayad.space`/`api.kayad.space`) — staging check B1 in `17-…` confirms it in two minutes from DevTools.

Note for reproducing locally: ports 5060/5061 are on the WHATWG "bad ports" list (fetch and Chromium refuse them); the probe uses 5070.

## 4. Options (not implemented — they change the authentication model; owner decision)
| Option | Change | Trade-offs |
|---|---|---|
| A. Short-lived socket ticket (recommended) | `POST /api/v1/auth/socket-ticket` (CSRF-protected, same-origin through the rewrite) returns a ≤ 60 s JWT `aud:"socket"`; `SocketContext` passes it as `auth.token`; server verifies audience and re-checks revocation (also closes D-RT-2) | one endpoint + a few client lines; no cookie scope change |
| B. Cookie `Domain=.kayad.space` | cookie sent to every subdomain | widens exposure of the session to all subdomains; Safari ITP behaviour must be tested |
| C. Socket on the app host | not possible through Vercel rewrites (no WebSocket proxying) | — |
Never `SameSite=None` or wider CORS "to see if it helps". Cookie flags were **not** changed in this phase.

## 5. Remaining realtime risks
Single-instance fan-out (no Redis adapter); D-RT-2 (revocation/ban of a still-valid token not checked on sockets); unused Supabase Realtime publication.
