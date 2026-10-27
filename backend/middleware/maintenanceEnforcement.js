// Identity-aware maintenance enforcement. Dependency-light on purpose (controllers/middleware that import it are unit-tested with mocked
// data layers): the only database access is a lazy import, and only when a scope that needs a dealer-team lookup is actually active.
import { decide, classifyRoute, buildIdentity, needsDealerTeamLookup, maintenanceResponse, MAINTENANCE_FORBIDDEN_CODE } from "../config/maintenancePolicy.js";

const TEAM_TTL_MS = 10_000;
const teamCache = new Map(); // userId -> { at, member }

export const __resetMaintenanceTeamCache = () => teamCache.clear();

async function isActiveDealerTeamMember(userId) {
  const hit = teamCache.get(userId);
  if (hit && Date.now() - hit.at < TEAM_TTL_MS) return hit.member;
  const { getSupabase } = await import("../utils/supabase.js");
  const { data, error } = await getSupabase().from("dealer_teams").select("id").eq("member", userId).eq("status", "active").limit(1);
  if (error) throw error;
  const member = Array.isArray(data) && data.length > 0;
  teamCache.set(userId, { at: Date.now(), member });
  return member;
}

/** Resolve { audience, isOwner, techRecovery } from the server-side user row. Throws if the dealer-team lookup cannot be answered. */
export async function resolveMaintenanceIdentity(user, isOwner, { needTeam = true } = {}) {
  const dealerTeamMember = needTeam && needsDealerTeamLookup(user, { isOwner }) ? await isActiveDealerTeamMember(String(user.id ?? user._id)) : false;
  return buildIdentity(user, { isOwner, dealerTeamMember });
}

const refuse = (req, res, scope, message, reason) => {
  res.setHeader("Retry-After", "60");
  // Control endpoints under a scoped (non-global) maintenance are ordinary authorization failures, not "maintenance".
  if (reason === "CONTROL_NOT_PERMITTED" && scope !== "global") {
    res.status(403).json({ success: false, code: MAINTENANCE_FORBIDDEN_CODE, message: "You are not authorised to use the maintenance controls." });
    return true;
  }
  res.status(503).json(maintenanceResponse(message, scope));
  return true;
};

/**
 * Apply the policy for an authenticated caller. `req.maintenance` is set by checkSystemStatus only while maintenance is active, so this is a
 * no-op (no database access) in normal operation. Returns true when a response has been sent.
 * Fail-closed on a lookup error: an honest 503 (MAINTENANCE_POLICY_UNAVAILABLE) is sent rather than guessing the caller's audience.
 */
export async function enforceMaintenance(req, res, user, isOwner) {
  const m = req.maintenance;
  if (!m?.active) return false;
  let identity;
  try {
    identity = await resolveMaintenanceIdentity(user, isOwner);
  } catch (err) {
    res.setHeader("Retry-After", "5");
    res.status(503).json({ success: false, code: "MAINTENANCE_POLICY_UNAVAILABLE", retryable: true, message: "Maintenance restrictions are active and your account type could not be verified right now. Please try again shortly." });
    return true;
  }
  req.maintenanceIdentity = identity;
  const route = classifyRoute(req.method, req.originalUrl ? req.originalUrl.replace(/^\/api/, "") : req.path);
  const d = decide({ scope: m.scope, route, identity });
  if (d.allow) return false;
  return refuse(req, res, m.scope, m.message, d.reason);
}
