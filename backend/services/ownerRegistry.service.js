// backend/services/ownerRegistry.service.js — STAGE 5B
// ─────────────────────────────────────────────────────────────────────────
// In-process, short-lived view of the database-backed owner membership. The synchronous predicates in config/owners.js read
// this snapshot; an Express middleware (and the socket handshake) calls ensureFresh() first, so a revocation takes effect
// on the next request on any instance within OWNER_REGISTRY_TTL_MS (default 5 s) and IMMEDIATELY on the instance that
// performed it (invalidate()).
//
// Modes (every one is documented in runbooks/stage5b-owner-governance-20261019/OWNER_BOOTSTRAP_AND_RECOVERY_RUNBOOK.md):
//   legacy    store not installed (migration not applied) or OWNER_STORE_MODE=legacy → Stage 5A env behaviour, unchanged.
//   database  store installed → owners = active + VERIFIED + not-suspended memberships. The env list grants nothing.
//   error     store installed but unreadable/malformed and no recent good copy → NO owner privilege (fail closed).
// A good snapshot may be served stale for at most OWNER_REGISTRY_STALE_MAX_MS (default 30 s) after a failed refresh.
// Under NODE_ENV=test the registry stays in legacy mode unless a test enables it (existing suites are unaffected).
// ─────────────────────────────────────────────────────────────────────────
import { __setOwnerSnapshotProvider, normalizeOwnerEmail } from "../config/owners.js";
import { getSupabase } from "../utils/supabase.js";
import { logError, logWarn } from "../infrastructure/logging/index.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };

let store = null; // test seam: async () => ({ data, error })
let forced = false; // test seam: run the registry under NODE_ENV=test
const state = { mode: "legacy", snapshot: null, bootstrap: null, loadedAt: 0, goodAt: 0, error: null, inflight: null, usableCount: 0, generation: 0, seenInstalled: false };

const enabled = () => forced || (process.env.NODE_ENV !== "test" && process.env.OWNER_STORE_MODE !== "legacy");
const ttl = () => num(process.env.OWNER_REGISTRY_TTL_MS, 5000);
const staleMax = () => num(process.env.OWNER_REGISTRY_STALE_MAX_MS, 30000);

const NOT_INSTALLED = (error) => {
  const code = String(error?.code || "");
  const msg = String(error?.message || "");
  return code === "PGRST202" || code === "42883" || /could not find the function|does not exist/i.test(msg) && /kayad_owner_snapshot/i.test(msg);
};

/** Strict parse. Anything unexpected throws → treated as an unreadable store (fail closed), never as "no owners needed". */
export function parseSnapshot(data) {
  if (!data || typeof data !== "object" || data.installed !== true) throw new Error("owner snapshot malformed: not installed marker");
  if (!Array.isArray(data.owners) || !Array.isArray(data.pending_emails)) throw new Error("owner snapshot malformed: arrays");
  if (data.bootstrap !== "open" && data.bootstrap !== "closed") throw new Error("owner snapshot malformed: bootstrap state");
  const owners = new Map(); const active = new Set(); const pending = new Set();
  for (const o of data.owners) {
    if (!o || typeof o.email !== "string" || !UUID.test(String(o.user_id)) || typeof o.usable !== "boolean") throw new Error("owner snapshot malformed: owner row");
    const email = normalizeOwnerEmail(o.email);
    if (!email) throw new Error("owner snapshot malformed: email");
    active.add(email);
    if (o.usable === true) owners.set(email, String(o.user_id));
  }
  for (const e of data.pending_emails) { if (typeof e !== "string") throw new Error("owner snapshot malformed: pending"); pending.add(normalizeOwnerEmail(e)); }
  return { owners, active, pending, bootstrap: data.bootstrap };
}

async function load() {
  if (store) return store();
  return getSupabase().rpc("kayad_owner_snapshot");
}

async function refresh() {
  const now = Date.now();
  const gen = state.generation; // STAGE 5B closure: a read that started before a membership change must never become the cache
  try {
    const { data, error } = await load();
    if (error) {
      // "Not installed" only means legacy mode for a process that has NEVER seen the store. Once the store has been seen, a missing
      // function (PostgREST schema-cache reload, partial rollback) must fail CLOSED — otherwise the env list would silently
      // restore privilege to an owner who was removed from the membership table (invariant: no legacy bypass after migration).
      if (NOT_INSTALLED(error) && !state.seenInstalled) { state.mode = "legacy"; state.snapshot = null; state.error = null; state.loadedAt = now; state.goodAt = now; return; }
      throw error;
    }
    const snap = parseSnapshot(data);
    if (gen !== state.generation) return; // invalidated while reading: discard, ensureFresh() reads again
    state.mode = "database"; state.snapshot = snap; state.bootstrap = snap.bootstrap; state.error = null; state.seenInstalled = true;
    state.usableCount = snap.owners.size; state.loadedAt = now; state.goodAt = now;
  } catch (e) {
    state.error = String(e?.code || e?.message || "unreadable").slice(0, 120);
    state.loadedAt = now - Math.max(0, ttl() - 1000); // retry after ~1 s
    if (state.snapshot && now - state.goodAt <= staleMax()) { logWarn("Owner store unreadable; serving last good snapshot", { event: "owner.registry_stale", error: state.error }); return; }
    if (state.mode !== "error") logError("Owner store unreadable; owner privilege suspended (fail closed)", e, { event: "owner.registry_error" });
    state.mode = "error"; state.snapshot = { owners: new Map(), active: new Set(), pending: new Set(), bootstrap: state.bootstrap || "closed" }; state.usableCount = 0;
  }
}

export async function ensureFresh() {
  if (!enabled()) { state.mode = "legacy"; state.snapshot = null; return state; }
  for (let attempt = 0; attempt < 3; attempt++) {
    if (state.loadedAt && Date.now() - state.loadedAt < ttl()) return state;
    if (!state.inflight) state.inflight = refresh().finally(() => { state.inflight = null; });
    await state.inflight; // may be a read that started BEFORE the latest invalidate(): loop until a post-invalidation read lands
  }
  return state;
}

/**
 * Drop the cached view (called by the instance that changed membership; other instances converge within the TTL).
 * Any read still in flight is discarded. With the default `taint`, the last good snapshot also stops being servable as "stale":
 * if the database cannot be read right after a local membership change, privilege is suspended (fail closed) instead of
 * resurrecting an owner who was just revoked. Invitation-only changes (no privilege change) pass { taint: false }.
 */
export function invalidate({ taint = true } = {}) {
  state.generation += 1;
  state.loadedAt = 0;
  if (taint) state.goodAt = 0;
}

/** Current usable owners as [email, userId] pairs (empty in legacy/error mode). */
export function currentOwners() { return state.mode === "database" && state.snapshot ? [...state.snapshot.owners] : []; }

export function describe() {
  return { mode: state.mode, usableOwners: state.mode === "database" ? state.usableCount : null, bootstrap: state.bootstrap, stale: !!state.error && state.mode === "database", error: state.error, ttlMs: ttl(), staleMaxMs: staleMax() };
}

// Express middleware: never throws and never blocks a request on registry trouble (the predicates fail closed by themselves).
export const ownerRegistryMiddleware = async (_req, _res, next) => { try { await ensureFresh(); } catch (e) { logError("owner registry refresh crashed", e); } next(); };

__setOwnerSnapshotProvider(() => (state.mode === "legacy" ? null : state.snapshot));

export const __testing = {
  enable(fn) { forced = true; store = fn || null; this.reset(); },
  disable() { forced = false; store = null; this.reset(); },
  reset() { Object.assign(state, { mode: "legacy", snapshot: null, bootstrap: null, loadedAt: 0, goodAt: 0, error: null, inflight: null, usableCount: 0, generation: 0, seenInstalled: false }); },
  state,
};
