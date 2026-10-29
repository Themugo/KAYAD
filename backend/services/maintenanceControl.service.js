// Maintenance control plane: reads and changes system_settings.system_status safely.
//
//   - Every write is a compare-and-swap on `maintenanceVersion` (PostgREST conditional UPDATE), so concurrent activations, scope changes,
//     recoveries and legacy feature kill-switches are SERIALISED: nobody silently overwrites anybody else, and the final state is always one
//     the requests could have produced in some order. A caller that supplies `expectedVersion` gets an honest 409 instead of a blind overwrite.
//   - Activation / scope change / recovery are idempotent: asking for the state that already exists changes nothing and is reported as such.
//   - The response always carries the state read back from the database; callers (and the UI) never assume a write succeeded.
//   - Every effective change writes an audit record with actor, reason, incident reference, scope transition and version.
import { getSupabase } from "../utils/supabase.js";
import { auditAfterCommit } from "../utils/auditAfterCommit.js";
import { invalidateSystemStatusCache } from "../middleware/systemCheck.js";
import {
  MAINTENANCE_SCOPES, SCOPE_IDS, isValidScope, normalizeSystemStatus,
} from "../config/maintenancePolicy.js";

export class MaintenanceError extends Error {
  constructor(code, message, status = 400, extra = {}) { super(message); this.code = code; this.status = status; this.extra = extra; }
}

const KEY = "system_status";
const MAX_ATTEMPTS = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isMissingTable = (e) => /PGRST205|42P01/.test(String(e?.code)) || /does not exist|schema cache|could not find the table/i.test(String(e?.message || ""));

const storeError = (e) => new MaintenanceError("MAINTENANCE_STORE_UNAVAILABLE",
  isMissingTable(e) ? "The system settings table is not available in this database." : "The system settings store is unreachable right now; nothing was changed.", 503);

/** Read the raw row. Returns { raw, exists }. Throws MaintenanceError(503) when the store cannot be read. */
async function readRow() {
  let res;
  try {
    res = await getSupabase().from("system_settings").select("value").eq("key", KEY).maybeSingle();
  } catch (e) { throw storeError(e); }
  if (res.error) throw storeError(res.error);
  return { raw: res.data?.value ?? null, exists: !!res.data };
}

/** Current server-side state (normalised). Always read from the database, never from the request cache. */
export async function readState() {
  const { raw } = await readRow();
  return normalizeSystemStatus(raw);
}

/**
 * Atomic read-modify-write. `fn(current)` returns { next, ...result } to write, or { noop: true, ...result } to leave the row untouched.
 * Returns { changed, state, ...result }.
 */
export async function mutateSystemStatus(fn, { expectedVersion } = {}) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { raw, exists } = await readRow();
    const cur = normalizeSystemStatus(raw);
    if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== cur.maintenanceVersion) {
      throw new MaintenanceError("MAINTENANCE_STATE_CONFLICT", "The maintenance state changed since you loaded it. Review the current state and try again.", 409, { state: publicState(cur) });
    }
    const out = fn(cur);
    if (out.noop) return { ...out, changed: false, state: cur };
    const nextValue = { ...(raw && typeof raw === "object" ? raw : {}), ...out.next, maintenanceVersion: cur.maintenanceVersion + 1 };

    let written;
    try {
      if (!exists) {
        const ins = await getSupabase().from("system_settings").insert({ key: KEY, value: nextValue }).select("value");
        if (ins.error) { if (String(ins.error.code) === "23505") { await sleep(10 + Math.random() * 30); continue; } throw ins.error; }
        written = ins.data;
      } else {
        let q = getSupabase().from("system_settings").update({ value: nextValue }).eq("key", KEY);
        q = raw && Number.isInteger(raw.maintenanceVersion) ? q.eq("value->>maintenanceVersion", String(raw.maintenanceVersion)) : q.is("value->>maintenanceVersion", null);
        const upd = await q.select("value");
        if (upd.error) throw upd.error;
        written = upd.data;
      }
    } catch (e) { throw storeError(e); }

    if (Array.isArray(written) && written.length === 1) {
      invalidateSystemStatusCache();
      return { ...out, changed: true, state: normalizeSystemStatus(written[0].value) };
    }
    await sleep(5 + Math.random() * 25 * (attempt + 1)); // lost the race: somebody else wrote first; re-read and re-apply
  }
  throw new MaintenanceError("MAINTENANCE_STATE_CONTENDED", "Too many simultaneous changes to the maintenance state. Nothing was applied by this request; retry.", 503);
}

// ───────────────────────── views ─────────────────────────
export const publicState = (s) => {
  const meta = s.maintenanceMeta || {};
  const scopeDef = s.maintenanceScope ? MAINTENANCE_SCOPES[s.maintenanceScope] : null;
  return {
    active: s.isMaintenanceMode === true,
    scope: s.maintenanceScope,
    scopeLabel: scopeDef?.label || null,
    affects: scopeDef?.affects || [],
    unaffected: scopeDef?.unaffected || [],
    message: s.emergencyMessage,
    reason: meta.reason || null,
    incidentRef: meta.incidentRef || null,
    operatorName: meta.operatorName || null,
    operatorRole: meta.operatorRole || null,
    activatedAt: meta.activatedAt || null,
    updatedAt: meta.updatedAt || null,
    lastRecovery: meta.lastRecovery || null,
    version: s.maintenanceVersion,
    featureSwitches: { auctions: s.isAuctionActive !== false, payments: s.isPaymentsActive !== false, ghostCheck: s.isGhostCheckActive !== false },
  };
};

export const scopeCatalog = () => SCOPE_IDS.map((id) => ({ id, ...MAINTENANCE_SCOPES[id] }));

// ───────────────────────── input validation ─────────────────────────
const cleanText = (v, max) => (typeof v === "string" ? [...v].map((ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch)).join("").trim().slice(0, max) : "");
export function validateActivation(body = {}) {
  const scope = body.scope;
  if (!isValidScope(scope)) throw new MaintenanceError("MAINTENANCE_INVALID_SCOPE", `Choose a maintenance scope: ${SCOPE_IDS.join(", ")}.`, 400);
  const reason = cleanText(body.reason, 300);
  if (reason.length < 8) throw new MaintenanceError("MAINTENANCE_REASON_REQUIRED", "State the reason for this maintenance (at least 8 characters).", 400);
  const incidentRef = cleanText(body.incidentRef, 64);
  if (incidentRef && !/^[A-Za-z0-9._\-/# ]+$/.test(incidentRef)) throw new MaintenanceError("MAINTENANCE_INVALID_INCIDENT_REF", "The incident reference may contain letters, digits and . _ - / # only.", 400);
  const message = cleanText(body.message, 280);
  return { scope, reason, incidentRef, message };
}
export function validateRecovery(body = {}) {
  const reason = cleanText(body.reason, 300);
  if (reason.length < 8) throw new MaintenanceError("MAINTENANCE_REASON_REQUIRED", "State why maintenance is being ended (at least 8 characters).", 400);
  const incidentRef = cleanText(body.incidentRef, 64);
  if (incidentRef && !/^[A-Za-z0-9._\-/# ]+$/.test(incidentRef)) throw new MaintenanceError("MAINTENANCE_INVALID_INCIDENT_REF", "The incident reference may contain letters, digits and . _ - / # only.", 400);
  return { reason, incidentRef };
}

const actorFields = (actor) => ({ operatorId: actor.id, operatorName: actor.name || actor.email || null, operatorRole: actor.isOwner ? "system_owner" : "technical_recovery" });
const audit = (action, actor, details, ip) =>
  auditAfterCommit({ action, admin: actor.name || actor.email, adminId: actor.id, actorRole: actorFields(actor).operatorRole, ipAddress: ip, details });

// ───────────────────────── operations ─────────────────────────
/** Activate maintenance in `scope`, or change the scope/message of an active maintenance. Owner-only (enforced by the route). */
export async function activate({ actor, scope, reason, incidentRef, message, expectedVersion, ip }) {
  const finalMessage = message || MAINTENANCE_SCOPES[scope].defaultMessage;
  const out = await mutateSystemStatus((cur) => {
    if (cur.isMaintenanceMode && cur.maintenanceScope === scope && cur.emergencyMessage === finalMessage) return { noop: true, transition: "unchanged" };
    const now = new Date().toISOString();
    const wasActive = cur.isMaintenanceMode;
    return {
      transition: wasActive ? "scope_changed" : "activated",
      previousScope: wasActive ? cur.maintenanceScope : null,
      next: {
        isMaintenanceMode: true,
        maintenanceScope: scope,
        emergencyMessage: finalMessage,
        maintenanceMeta: {
          reason, incidentRef: incidentRef || null,
          ...actorFields(actor),
          activatedAt: wasActive ? (cur.maintenanceMeta.activatedAt || now) : now,
          updatedAt: now,
          lastRecovery: null,
        },
      },
    };
  }, { expectedVersion });

  if (out.changed) {
    const title = out.transition === "activated" ? `Maintenance activated: ${scope}` : out.previousScope === scope ? `Maintenance updated: ${scope}` : `Maintenance scope changed: ${out.previousScope} -> ${scope}`;
    await audit(title, actor, { scope, previousScope: out.previousScope, reason, incidentRef: incidentRef || null, version: out.state.maintenanceVersion, message: finalMessage }, ip);
  }
  return { changed: out.changed, transition: out.transition, state: publicState(out.state) };
}

/** End maintenance. Owner or explicitly authorised technical-recovery staff (enforced by the route). Idempotent. */
export async function recover({ actor, reason, incidentRef, expectedVersion, ip }) {
  const out = await mutateSystemStatus((cur) => {
    if (!cur.isMaintenanceMode) return { noop: true, transition: "unchanged" };
    const now = new Date().toISOString();
    return {
      transition: "recovered",
      previousScope: cur.maintenanceScope,
      next: {
        isMaintenanceMode: false,
        maintenanceScope: null,
        maintenanceMeta: { ...cur.maintenanceMeta, updatedAt: now, lastRecovery: { at: now, by: actorFields(actor).operatorName, role: actorFields(actor).operatorRole, reason: reason || null, incidentRef: incidentRef || null, previousScope: cur.maintenanceScope } },
      },
    };
  }, { expectedVersion });

  if (out.changed) await audit(`Maintenance recovered: ${out.previousScope}`, actor, { previousScope: out.previousScope, reason: reason || null, incidentRef: incidentRef || null, version: out.state.maintenanceVersion }, ip);
  return { changed: out.changed, transition: out.transition, state: publicState(out.state) };
}

/** Legacy per-feature switches (auctions / payments / ghost check) share the same atomic writer so they can never clobber maintenance state. */
export async function setFeatureSwitch(key, enabled) {
  const out = await mutateSystemStatus((cur) => (cur[key] === enabled ? { noop: true } : { next: { [key]: enabled } }));
  return { changed: out.changed, state: out.state };
}
export async function recoverAllFeatureSwitches() {
  const out = await mutateSystemStatus((cur) => (cur.isAuctionActive && cur.isPaymentsActive && cur.isGhostCheckActive ? { noop: true } : { next: { isAuctionActive: true, isPaymentsActive: true, isGhostCheckActive: true } }));
  return { changed: out.changed, state: out.state };
}

