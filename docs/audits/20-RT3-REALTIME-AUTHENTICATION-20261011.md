# RT-3: realtime authentication, root cause and verification

**Status: FIXED, verified locally (PASS).** Proven with real Socket.IO clients against the real `server.js` and real PostgreSQL, and with real Chromium in the cross-host topology. Not yet verified on staging or production hosts (NOT RUN): see checklist `28-…` §E.

## 1. Reproduction (before)
`browser/realtime-host-probe.mjs` uses the production bundle in real Chromium and two hostnames that both resolve to 127.0.0.1:
- `app.kayad.test:3000` serves the SPA, and `/api` is proxied there like the Vercel rewrite.
- `api.kayad.test:5070` serves the API and Socket.IO.
- The session cookie is planted exactly as login sets it: host-only, `HttpOnly`, `SameSite=Lax`.

| Variant | Socket connects | Authenticated delivery | Cookies the browser sends to the socket host |
|---|---|---|---|
| CROSS-HOST (production topology) | yes | **no** | none |
| SAME-HOST | yes | yes | `token`, `XSRF-TOKEN` |

Evidence: `evidence/runtime-convergence-20261011/rt3/realtime-host-probe-before.{json,txt}`, run against the foundation backend and bundle.

## 2. Root cause
- The SPA calls REST **same-origin** (`VITE_API_URL=/api`, proxied), so the httpOnly access cookie is **host-only on the app host**.
- `SocketContext` connects **directly** to the API host (`VITE_SOCKET_URL`, default `https://api.kayad.space`) with `withCredentials: true`.
- The browser never attaches the app host's cookie to another host. The handshake (`io.use`) found neither a cookie nor `auth.token`, so it marked the socket anonymous. The connection itself succeeded, which made the failure silent.
- Nothing else was broken: CORS with credentials, room authorization and the expiry timer all worked. The failure was purely a credential-transport problem.

A second defect sat on the same path (D-RT-2): the handshake verified only the JWT signature. Ban, deactivation, token-version bumps (logout-all, password change) and refresh-session revocation were not checked, while `protect` checks all of them for REST.

## 3. Options considered
| Option | Verdict |
|---|---|
| Widen the cookie to `.kayad.space` | Rejected. The mission forbids it, and it would send the access token to every subdomain. |
| Put the access token in the socket URL or query | Rejected. It leaks into logs, proxies and history. |
| Expose the access token to JS and send it in `auth` | Rejected. It defeats the httpOnly design. |
| Same-origin socket (proxy `/socket.io` through the app host) | Valid alternative. It needs hosting changes, including WebSocket upgrade support on the app host, so it is documented, not implemented. |
| **Short-lived, single-use socket ticket minted by the authenticated session** | **Implemented.** |

## 4. Implementation
- **`POST /api/realtime/socket-ticket`** (`backend/routes/realtimeRoutes.js`) works as follows:
  - The guards are `protect` (the full REST session check) and the global double-submit **CSRF**, plus `socketTicketLimiter` (60 per 5 minutes per user).
  - It returns `{ ticket, expiresIn: 60 }` with `Cache-Control: no-store`. The ticket travels only in the response body.
- **Ticket** (`backend/services/socketAuth.service.js`):
  - It is an HS256 JWT signed with a **domain-separated key**, `HMAC(JWT_SECRET, "kayad-socket-ticket-v1")`, or with `SOCKET_TICKET_SECRET` when set.
  - Claims are `aud=kayad-socket`, `iss=kayad-api`, `sub=<user id>`, `jti` (random), `tv` (token version), `sid` (session id) and `sexp` (the access token's expiry). There is no role, email or other identity data.
  - It lives **60 seconds** and is consumed on first use (replay rejected).
  - A ticket is never accepted as an access token, and an access token is never accepted as a ticket: the key, audience and issuer all differ.
- **Handshake** (`io.use` in `server.js`), in order:
  1. A ticket in `auth.ticket`.
  2. The access cookie (same-host deployments, unchanged).
  3. An access JWT in `auth.token` (non-browser clients).

  Every path ends in `resolveSocketUser`, which applies **exactly the `protect` rules**: user and `user_auth` exist, token version matches, refresh session is active, and the user is not banned or deactivated (owner exemption kept). A client-supplied id is never read. If the check cannot decide (database down), the socket stays anonymous (fail closed).
- **While connected:**
  - The session ends at `sexp`, the same instant as the access token it was minted from. The server then drops the private rooms and emits `sessionExpired`.
  - The session is re-validated every `SOCKET_REVALIDATE_MS` (default 5 minutes) and **immediately on every private-room join** (`joinChat`, `joinInspection`, `joinAdmin`/`joinControlPlane`).
  - The server emits `authState { authenticated }` with no identity data, so a signed-in tab that was downgraded knows to re-authenticate.
- **Frontend** (`src/context/SocketContext.tsx`):
  - A signed-in tab passes `auth: (cb) => fetch ticket → cb({ ticket })`. Socket.IO invokes it before **every** connect and reconnect, so a renewed session simply mints a new ticket.
  - The ticket is not stored anywhere.
  - If no ticket can be obtained, the socket connects anonymously (public auction rooms keep working) and retries with backoff (15 s, doubling, capped at 5 minutes) when `authState` reports anonymous.
  - Signed-out visitors send no auth payload and never call the endpoint.
- **Not changed:** cookie domain and flags, CORS, room authorization rules, presence (still no global broadcast) and event names.

## 5. Verification
| # | Required test | Test (real unless marked) | Before | After |
|---|---|---|---|---|
| — | Ticket endpoint requires session + CSRF, `no-store`, minimal claims, 60 s, not logged | `m14` #1 | FAIL (no endpoint) | PASS |
| 1 | Anonymous socket connection | `m14` #2; `m7` #2 | PASS | PASS |
| 2 | Valid authenticated connection with **no cookie to the socket host** | `m14` #3 | FAIL | PASS |
| 3 | Expired, invalid, forged, replayed, wrong-audience and cross-used credentials; client-supplied id | `m14` #4 | FAIL | PASS |
| 4 | Expiry after connection; revocation (token version) and ban while connected; deactivated account | `m14` #5–#7; `m7` #5 | FAIL | PASS |
| 5 | Reconnection after session renewal (no inherited rooms) | `m14` #8; `m7` #6 | FAIL | PASS |
| 6 | Two accounts exchange events; identities server-derived | `m14` #9; `m7` #3 | FAIL | PASS |
| 7 | Nonparticipant room join and typing injection | `m14` #10 | FAIL | PASS |
| 8 | Blocked conversation | `m14` #11; `m7` #8 | FAIL | PASS |
| 9 | Unauthorized presence visibility | `m14` #12; `m7` #1 | FAIL | PASS |
| 10 | Duplicate send and retry: one message, one event per participant | `m14` #13 | FAIL | PASS |
| — | Existing socket-authorization suite unchanged | `m7` 9/9 | PASS | PASS |
| — | Frontend wiring (**mocked**): ticket by POST, sent in `auth`, never in the URL; anonymous fallback with retry; signed-out visitors send nothing | `src/__tests__/context/SocketContext.ticket.test.tsx` 3/3 | — | PASS |
| — | **Real Chromium, cross-host topology** | `realtime-host-probe` | CROSS-HOST notification **false** | CROSS-HOST `authState=true`, notification **true**, newMessage **true**, cookies sent to socket host `[]`, `ticketInUrl=false` |

The "Before" column was run against the foundation backend (`KAYAD_BACKEND_DIR=<foundation>/backend`); the 12 FAILs come from the missing ticket path. Logs are in `evidence/runtime-convergence-20261011/rt3/`, and the final battery re-runs all of it.

## 6. Residual risks and deployment notes
- **Multiple API instances (RT-SCALE).** Single-use enforcement is in-process. With several instances, a ticket could be replayed once per instance within its 60 seconds, still bound to the same user and session. Before scaling out, add the Socket.IO Redis adapter and move the `jti` set to Redis (Redis is already configured).
- **Production needs:**
  - `/api/realtime/socket-ticket` must be reachable through the same-origin `/api` proxy (Vercel rewrite). It already is, because all `/api/*` is proxied.
  - The socket host must allow the app origin in `CORS_ORIGINS`. This is unchanged.
  - Optionally set a distinct `SOCKET_TICKET_SECRET`.
- **The `sessionExpired` → reconnect path** relies on the HTTP client's refresh on 401 to renew the cookie before the next ticket. This is verified at unit level; on staging, run checklist E3 (wait for access-token expiry with a tab open).
