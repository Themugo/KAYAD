// Socket.IO authentication (RT-3, D-RT-2 — docs/audits/20-RT3-REALTIME-AUTHENTICATION-20261011.md).
//
// Problem: in the production topology the SPA talks to the REST API same-origin (`/api`, proxied), so the httpOnly access
// cookie is host-only on the app host, while Socket.IO connects directly to the API host. The socket host never receives
// that cookie, so every browser socket was anonymous: no notifications, no private chat rooms. Widening the cookie domain
// would expose the access token to every subdomain, and putting a token in the URL would leak it into logs and history.
//
// Fix: a short-lived, single-use, audience-bound socket ticket.
//   * Issued only by an authenticated same-origin REST call (`POST /api/realtime/socket-ticket`: protect + CSRF), so the
//     identity comes from the existing cookie session — the browser never chooses a user id.
//   * Signed with a key derived from (or separate to) JWT_SECRET and checked with audience `kayad-socket`, so a ticket is
//     never accepted as an access token and an access token is never accepted as a ticket.
//   * Valid for SOCKET_TICKET_TTL_SECONDS (60 s) and consumed on first use (replay rejected).
//   * Sent in the Socket.IO CONNECT packet (`auth`), never in a URL or query string; never logged.
//   * The socket session ends no later than the access token it was minted from (`sexp`), and the user's security state
//     (ban, deactivation, token version, refresh-session revocation) is re-checked at the handshake, on every private-room
//     join and periodically while connected — the same rules `protect` applies to REST.
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import UserAuth from "../models/UserAuth.js";
import RefreshToken from "../models/RefreshToken.js";
import { isOwnerEmail, isUnverifiedOwner } from "../config/owners.js";

export const SOCKET_TICKET_TTL_SECONDS = 60;
const AUDIENCE = "kayad-socket";
const ISSUER = "kayad-api";

function ticketKey() {
  if (process.env.SOCKET_TICKET_SECRET) return process.env.SOCKET_TICKET_SECRET;
  const base = process.env.JWT_SECRET;
  if (!base) throw new Error("JWT_SECRET is not set");
  // Domain-separated key: a ticket signature can never be replayed as an access-token signature.
  return crypto.createHmac("sha256", base).update("kayad-socket-ticket-v1").digest();
}

// Single-use enforcement. In-process: correct for one API instance (the current deployment, see RT-SCALE). With several
// instances a ticket could be replayed once per instance within its 60 s life, still bound to the same user and session.
const consumed = new Map(); // jti -> expiry ms
function consumeOnce(jti, expSeconds) {
  const now = Date.now();
  if (consumed.size > 10_000) for (const [k, v] of consumed) if (v < now) consumed.delete(k);
  if (!jti || consumed.has(jti)) return false;
  consumed.set(jti, expSeconds * 1000);
  return true;
}

function readAccessToken(req) {
  const h = req.headers?.authorization;
  if (h && h.startsWith("Bearer ")) return h.slice(7);
  return req.cookies?.token || null;
}

/** Mint a ticket for the session `protect` already authenticated on this request. */
export function issueSocketTicket(req) {
  const token = readAccessToken(req);
  if (!token || !req.user?.id) throw Object.assign(new Error("Not authenticated"), { status: 401 });
  const access = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  if (String(access.id) !== String(req.user.id)) throw Object.assign(new Error("Session mismatch"), { status: 401 });
  const ticket = jwt.sign(
    {
      tv: access.tokenVersion ?? null,
      ...(access.sessionId ? { sid: access.sessionId } : {}),
      sexp: access.exp,
    },
    ticketKey(),
    { algorithm: "HS256", audience: AUDIENCE, issuer: ISSUER, subject: String(access.id), expiresIn: SOCKET_TICKET_TTL_SECONDS, jwtid: crypto.randomUUID() },
  );
  return { ticket, expiresIn: SOCKET_TICKET_TTL_SECONDS };
}

/**
 * Re-check the security state of an identity exactly as `protect` does. Returns the socket user, or null when the session
 * is no longer valid. Throws only when the decision could not be made (database unavailable) — callers fail closed.
 */
export async function resolveSocketUser({ id, tokenVersion, sessionId, exp }) {
  if (!id) return null;
  const user = await User.findById(id).select("_id,email,name,role,status,isBanned,deactivatedAt,emailVerified").lean();
  const userAuth = await UserAuth.findOne({ user: id }).select("+tokenVersion").lean();
  if (!user || !userAuth) return null;
  if (tokenVersion !== undefined && tokenVersion !== null && tokenVersion !== (userAuth.tokenVersion ?? 0)) return null;
  if (sessionId && !(await RefreshToken.findActiveSessionById(sessionId, id))) return null;
  if (isUnverifiedOwner(user)) return null; // STAGE 5A (Gate A)
  const owner = isOwnerEmail(user.email);
  if (!owner && (user.isBanned || user.deactivatedAt)) return null;
  return {
    id: String(user._id ?? user.id),
    role: owner ? "superadmin" : user.role,
    name: user.name || null,
    email: user.email,
    status: user.status || "approved",
    exp,
    tokenVersion: tokenVersion ?? undefined,
    sessionId: sessionId || undefined,
  };
}

function cookieAccessToken(cookieHeader = "") {
  const raw = cookieHeader.split(";").map((p) => p.trim()).find((p) => p.startsWith("token="))?.slice("token=".length);
  return raw ? decodeURIComponent(raw) : null;
}

/**
 * Authenticate a Socket.IO handshake. Order: ticket (cross-host browsers) → access cookie (same-host deployments) →
 * `auth.token` access JWT (non-browser clients). Every path ends in resolveSocketUser. Never trusts a client-supplied id.
 * Returns { user, reason } — user null means anonymous (public auction/showroom rooms only).
 */
export async function authenticateHandshake(handshake = {}) {
  const auth = handshake.auth || {};
  if (typeof auth.ticket === "string" && auth.ticket) {
    let claims;
    try {
      claims = jwt.verify(auth.ticket, ticketKey(), { algorithms: ["HS256"], audience: AUDIENCE, issuer: ISSUER });
    } catch (e) {
      return { user: null, reason: e?.name === "TokenExpiredError" ? "ticket_expired" : "ticket_invalid" };
    }
    if (!consumeOnce(claims.jti, claims.exp)) return { user: null, reason: "ticket_replayed" };
    if (!Number.isFinite(claims.sexp) || claims.sexp * 1000 <= Date.now()) return { user: null, reason: "session_expired" };
    const user = await resolveSocketUser({ id: claims.sub, tokenVersion: claims.tv, sessionId: claims.sid, exp: claims.sexp });
    return { user, reason: user ? "ticket" : "session_invalid" };
  }
  const token = cookieAccessToken(handshake.headers?.cookie) || (typeof auth.token === "string" ? auth.token : null);
  if (!token) return { user: null, reason: "anonymous" };
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch (e) {
    return { user: null, reason: e?.name === "TokenExpiredError" ? "token_expired" : "token_invalid" };
  }
  // A socket ticket must never pass as an access token (different key, but be explicit).
  if (decoded.aud === AUDIENCE) return { user: null, reason: "token_invalid" };
  const user = await resolveSocketUser({ id: decoded.id, tokenVersion: decoded.tokenVersion, sessionId: decoded.sessionId, exp: decoded.exp });
  return { user, reason: user ? "access_token" : "session_invalid" };
}

/** Re-validate a connected socket's identity (used on private-room joins and periodically). */
export async function revalidateSocketUser(socket) {
  const u = socket.user;
  if (!u) return null;
  if (!Number.isFinite(u.exp) || u.exp * 1000 <= Date.now()) return null;
  return resolveSocketUser({ id: u.id, tokenVersion: u.tokenVersion, sessionId: u.sessionId, exp: u.exp });
}

export const __testing = { consumed, ticketKey, AUDIENCE, ISSUER };
