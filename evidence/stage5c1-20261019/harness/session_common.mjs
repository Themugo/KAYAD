/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5C.1 — shared implementation for the SEPARATE dealer (role_api_h) and private-seller (role_api_i) session/revocation journeys.
// Each journey uses its own users, its own listings and role-specific assertions; this module only removes copy-paste of the mechanics.
import { createRequire } from "node:module";
import { io } from "socket.io-client";
import { Client, BASE, sql, sleep, rec, eq, rawUser, envFile, BE } from "./lib.mjs";
const require = createRequire(`${BE}/package.json`); const jwt = require("jsonwebtoken");
const tk = (cl) => cl.token || cl.jar.token || null;
const J = (r) => JSON.stringify(r.body).slice(0, 200);
// Socket.IO: anonymous sockets are ALLOWED by design (public auction rooms), so "authenticated" is read from the server's own authState event.
const sock = ({ token, ticket, live }) => new Promise((res) => { const s = io(BASE, { auth: ticket ? { ticket } : token ? { token } : {}, transports: ["websocket"], reconnection: false, timeout: 4000 }); let st = null, expired = false; const done = () => { s.close(); res({ authenticated: st, expired }); }; const t = setTimeout(() => { s.close(); res({ authenticated: st === null ? "no-authState" : st, expired }); }, live ? 6000 : 4000); s.on("sessionExpired", () => { expired = true; if (live) { clearTimeout(t); done(); } }); s.on("authState", async (a) => { st = a.authenticated; if (live) { await live(s); } else { clearTimeout(t); done(); } }); s.on("connect_error", (e) => { clearTimeout(t); s.close(); res({ authenticated: "connect_error:" + e.message, expired }); }); });
const getTicket = async (cl) => (await cl.call("POST", "/api/realtime/socket-ticket", {})).body?.ticket;
export async function sessionJourney(o) {
  const { tag, label, em, PW, owner, adm, make, dashPaths, deniedPaths, extra } = o;
  console.log(`== ${tag} ${label} sessions ==`);
  const E = em(`${label.toLowerCase()}-sess`); const U = await make(E);   // verified, in the role's normal post-login state
  const c = U.client; const id = U.id; const ok = async (cl, paths) => { const out = []; for (const p of paths) out.push(`${p}:${(await cl.call("GET", p)).status}`); return out; };
  // 1. login + dashboard
  const l1 = new Client(); const lg = await l1.login(E, PW);
  rec(`${tag}.1 login after verification succeeds and issues an access token + refresh cookie`, lg.status === 200 && !!tk(l1) && !!l1.jar.refreshToken, `${lg.status} cookie=${!!l1.jar.refreshToken}`);
  const dp = await ok(l1, dashPaths); rec(`${tag}.2 ${label} dashboard / role APIs are reachable (200): ${dashPaths.join(", ")}`, dp.every((x) => x.endsWith(":200")), dp.join(" "));
  const dn = await ok(l1, deniedPaths); rec(`${tag}.3 role boundary: admin / owner / other-role APIs are denied (401/403): ${deniedPaths.join(", ")}`, dn.every((x) => /:(401|403)$/.test(x)), dn.join(" "));
  const prof = await l1.call("GET", "/api/v1/auth/profile"); rec(`${tag}.4 profile reflects the right role and verified e-mail`, prof.status === 200 && JSON.stringify(prof.body).includes(label === "Dealer" ? "dealer" : "individual_seller"), `${prof.status}`);
  // 2. refresh rotation + replay
  const oldRefresh = l1.jar.refreshToken; const rf = await l1.call("POST", "/api/v1/auth/refresh", {}); l1.token = rf.body?.token || rf.body?.accessToken || rf.body?.data?.token || l1.token;
  rec(`${tag}.5 refresh returns a new access token and keeps authorized access`, rf.status === 200 && (await ok(l1, dashPaths.slice(0, 1)))[0].endsWith(":200"), `${rf.status}`);
  rec(`${tag}.6 the refresh cookie was rotated`, !!l1.jar.refreshToken && l1.jar.refreshToken !== oldRefresh, "rotated");
  const replay = new Client(); replay.jar = { ...replay.jar, refreshToken: oldRefresh }; await replay.csrf(); const rp = await replay.call("POST", "/api/v1/auth/refresh", {});
  rec(`${tag}.7 replaying the already-used refresh token is refused (reuse detection)`, [401, 403].includes(rp.status), `${rp.status} ${J(rp)}`);
  const afterReuse = await l1.call("POST", "/api/v1/auth/refresh", {});
  rec(`${tag}.8 reuse revokes the whole token family (the legitimate current refresh token also stops working)`, [401, 403].includes(afterReuse.status), `${afterReuse.status}`);
  // 3. invalid / expired / tampered access tokens
  const good = new Client(); await good.login(E, PW); const gt = tk(good); const payload = jwt.decode(gt);
  const secret = envFile.JWT_SECRET; const { iat: _i, exp: _e, ...base } = payload; const mk = (extraPl, opts = {}, sec = secret) => jwt.sign({ ...base, ...extraPl }, sec, { ...opts });
  const probe = async (tok) => { const k = new Client(); k.token = tok; k.jar = {}; return (await k.call("GET", dashPaths[0])).status; };
  eq(`${tag}.9 garbage bearer token → 401`, await probe("not.a.jwt"), 401);
  eq(`${tag}.10 token signed with a different secret → 401`, await probe(mk({}, { expiresIn: "1h" }, "wrong-secret-wrong-secret-wrong-secret")), 401);
  eq(`${tag}.11 expired token → 401`, await probe(jwt.sign({ ...payload, iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 }, secret)), 401);
  eq(`${tag}.12 unsigned (alg:none) token → 401`, await probe(`${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ ...payload, exp: 9999999999 })).toString("base64url")}.`), 401);
  eq(`${tag}.13 role-escalation by editing the payload (admin) without re-signing → 401`, await probe(`${gt.split(".")[0]}.${Buffer.from(JSON.stringify({ ...payload, role: "admin" })).toString("base64url")}.${gt.split(".")[2]}`), 401);
  eq(`${tag}.14 stale tokenVersion → 401`, await probe(mk({ tokenVersion: (payload.tokenVersion ?? 0) + 5 }, { expiresIn: "1h" })), 401);
  // 4. sockets
  eq(`${tag}.15 socket handshake with a live session's access token is authenticated`, (await sock({ token: gt })).authenticated, true);
  eq(`${tag}.16 socket handshake without any credential is anonymous (not authenticated)`, (await sock({})).authenticated, false);
  eq(`${tag}.16b socket handshake with a tampered token is anonymous`, (await sock({ token: gt.slice(0, -4) + "AAAA" })).authenticated, false);
  const tkt = await getTicket(good); rec(`${tag}.16c a socket ticket can be minted from the cookie session`, !!tkt, "ticket minted");
  eq(`${tag}.16d the ticket authenticates exactly once`, (await sock({ ticket: tkt })).authenticated, true);
  eq(`${tag}.16e replaying the same ticket is anonymous (single-use)`, (await sock({ ticket: tkt })).authenticated, false);
  eq(`${tag}.16f reconnection: a fresh ticket authenticates the reconnecting client`, (await sock({ ticket: await getTicket(good) })).authenticated, true);
  eq(`${tag}.16g anonymous caller cannot mint a socket ticket (401)`, (await new Client().call("POST", "/api/realtime/socket-ticket", {})).status, 401);
  // 5. two sessions: list + revoke one
  const sA = new Client(), sB = new Client(); await sA.login(E, PW); await sB.login(E, PW);
  const list = await sA.call("GET", "/api/v1/auth/sessions"); const sessions = list.body?.sessions || list.body?.data || [];
  rec(`${tag}.17 the user can list their active sessions (≥2)`, list.status === 200 && sessions.length >= 2, `${list.status} n=${sessions.length}`);
  const pickB = sessions.find((s) => !s.current) || sessions[sessions.length - 1];
  const rv = await sA.call("DELETE", `/api/v1/auth/sessions/${pickB.id}`); rec(`${tag}.18 revoking a single session succeeds`, rv.status === 200, `${rv.status} ${J(rv)}`);
  const rB = await new Promise(async (res) => { const t = new Client(); t.jar = { ...t.jar }; res(null); });
  const sessionsAfter = (await sA.call("GET", "/api/v1/auth/sessions")).body?.sessions || [];
  rec(`${tag}.19 the revoked session is gone from the active list`, !sessionsAfter.some((s) => String(s.id) === String(pickB.id)), `n=${sessionsAfter.length}`);
  // 6. revoke-all
  const sC = new Client(); await sC.login(E, PW); const tokC = tk(sC); const tktC = await getTicket(sC);
  const ra = await sC.call("POST", "/api/v1/auth/sessions/revoke-all", {}); rec(`${tag}.20 revoke-all succeeds`, ra.status === 200, `${ra.status}`);
  eq(`${tag}.21 after revoke-all the access token is rejected on a protected request (401)`, await probe(tokC), 401);
  eq(`${tag}.22 after revoke-all a refresh attempt is refused`, [401, 403].includes((await sC.call("POST", "/api/v1/auth/refresh", {})).status), true);
  eq(`${tag}.23 after revoke-all the socket handshake no longer authenticates that token`, (await sock({ token: tokC })).authenticated, false);
  eq(`${tag}.23b a ticket minted before revoke-all no longer authenticates`, (await sock({ ticket: tktC })).authenticated, false);
  eq(`${tag}.24 a fresh login after revocation works`, (await new Client().login(E, PW)).status, 200);
  // 7. logout
  const lo = new Client(); await lo.login(E, PW); const tokLo = tk(lo); const tktLo = await getTicket(lo); const lr = await lo.call("POST", "/api/v1/auth/logout", {});
  rec(`${tag}.25 logout succeeds`, lr.status === 200, `${lr.status}`);
  eq(`${tag}.26 the logged-out access token is rejected server-side (401), not just forgotten by the browser`, await probe(tokLo), 401);
  eq(`${tag}.27 refresh after logout is refused`, [401, 403].includes((await lo.call("POST", "/api/v1/auth/refresh", {})).status), true);
  eq(`${tag}.28 socket handshake with the logged-out token is not authenticated`, (await sock({ token: tokLo })).authenticated, false);
  eq(`${tag}.28b a ticket minted before logout no longer authenticates`, (await sock({ ticket: tktLo })).authenticated, false);
  // 8. password change invalidates other sessions
  const pc = new Client(), pcOther = new Client(); await pc.login(E, PW); await pcOther.login(E, PW); const otherTok = tk(pcOther); const NEW = PW.replace("Pass", "Newp");
  const ch = await pc.call("PUT", "/api/v1/auth/change-password", { currentPassword: PW, newPassword: NEW }); rec(`${tag}.29 password change succeeds`, ch.status === 200, `${ch.status} ${J(ch)}`);
  eq(`${tag}.30 the other session's token is rejected after the password change`, await probe(otherTok), 401);
  eq(`${tag}.31 old password refused, new password accepted`, `${(await new Client().login(E, PW)).status}/${(await new Client().login(E, NEW)).status}`, "401/200");
  o.PW2 = NEW;
  // 9. suspension (ban) → existing sessions die, login/refresh refused; unban restores
  const live = new Client(); await live.login(E, NEW); const liveTok = tk(live);
  const banAdmin = await adm.call("POST", `/api/admin/users/${id}/toggle-ban`, { reason: "5C.1 test" });
  const banRes = banAdmin.status === 200 ? banAdmin : await owner.call("POST", `/api/admin/users/${id}/toggle-ban`, { reason: "5C.1 test" });
  rec(`${tag}.32 ban succeeds (ordinary admin ${banAdmin.status}${banAdmin.status === 200 ? "" : ", owner fallback " + banRes.status})`, banRes.status === 200, J(banRes));
  eq(`${tag}.33 a banned user's existing access token is rejected server-side (403)`, await probe(liveTok), 403);
  eq(`${tag}.34 banned user cannot log in`, (await new Client().login(E, NEW)).status >= 400, true);
  eq(`${tag}.35 banned user's refresh is refused`, [401, 403].includes((await live.call("POST", "/api/v1/auth/refresh", {})).status), true);
  eq(`${tag}.36 banned user's socket handshake is not authenticated`, (await sock({ token: liveTok })).authenticated, false);
  await (banAdmin.status === 200 ? adm : owner).call("POST", `/api/admin/users/${id}/toggle-ban`, { reason: "5C.1 test unban" });
  eq(`${tag}.37 after unban the user can log in again`, (await new Client().login(E, NEW)).status, 200);
  // 9b. LIVE socket: connected & authenticated, then the session is revoked server-side → the next private-room join must downgrade it
  const lv = new Client(); await lv.login(E, NEW); const lvTok = tk(lv);
  const liveRes = await sock({ token: lvTok, live: async (s) => { await lv.call("POST", "/api/v1/auth/sessions/revoke-all", {}); s.emit("joinChat", "00000000-0000-4000-8000-000000000000"); } });
  eq(`${tag}.41b a CONNECTED socket is downgraded (sessionExpired) once its session is revoked server-side`, liveRes.expired, true);
  eq(`${tag}.41c login still works after live revocation`, (await new Client().login(E, NEW)).status, 200);
  // 10. deactivation (superadmin)
  const SA = em("superadmin-" + label.toLowerCase()); rawUser(SA, "superadmin", PW); const sa = new Client(); await sa.login(SA, PW);
  const dl = new Client(); await dl.login(E, NEW); const dlTok = tk(dl);
  const de = await sa.call("PUT", `/api/admin/users/${id}/deactivate`, {}); rec(`${tag}.38 superadmin deactivates the account`, de.status === 200, `${de.status} ${J(de)}`);
  eq(`${tag}.39 deactivated user's access token is rejected (403)`, await probe(dlTok), 403);
  eq(`${tag}.40 deactivated user cannot log in`, (await new Client().login(E, NEW)).status >= 400, true);
  await sa.call("PUT", `/api/admin/users/${id}/deactivate`, {});
  eq(`${tag}.41 reactivation restores login`, (await new Client().login(E, NEW)).status, 200);
  if (extra) await extra({ E, NEW, id, c, probe, sock });
}
