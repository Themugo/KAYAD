// ============================================================
//  KAYAD — Centralized maintenance policy (pure, dependency-free)
//
//  ONE place decides who may do what while maintenance is active. It is consumed by:
//    - middleware/systemCheck.js          (pre-authentication gate: anonymous traffic, global shutdown)
//    - middleware/maintenanceEnforcement  (identity-aware gate used by protect(), login and refresh)
//    - routes/maintenanceControlRoutes.js (the recovery/control API)
//  and documented in KAYAD_MAINTENANCE_POLICY_MATRIX.md. Nothing here reads the database or the request, so it is unit-testable
//  and the frontend can only *display* what the server decides; it can never widen it.
//
//  Targeting is deliberately limited to what the backend can enforce reliably: the caller's ROLE and dealer-team membership,
//  resolved server-side from the database on every protected request (never from a client-supplied value).
// ============================================================

export const MAINTENANCE_CODE = "SYSTEM_MAINTENANCE";
export const MAINTENANCE_FORBIDDEN_CODE = "MAINTENANCE_CONTROL_FORBIDDEN";

/** Selectable scopes. `global` is the genuine platform-wide emergency; the others restrict only the named audience. */
export const MAINTENANCE_SCOPES = Object.freeze({
  global: Object.freeze({
    label: "Global shutdown",
    summary: "Every visitor, buyer, seller, dealer and staff member is refused, including public browsing and sign-in. Only System Owners and explicitly authorised technical-recovery staff can sign in, and they can reach nothing except the session endpoints and the maintenance recovery controls.",
    affects: ["Visitors (public browsing)", "Buyers and private sellers", "Dealers and dealership staff", "Staff and administrators (except authorised recovery)"],
    defaultMessage: "The platform is temporarily offline for emergency maintenance.",
    requiresTypedConfirmation: true,
  }),
  ordinary_users: Object.freeze({
    label: "All ordinary users",
    summary: "Buyers, private sellers, dealers and dealership staff cannot sign in or use any signed-in function. Public browsing stays available; staff and administrators are not affected.",
    affects: ["Buyers and private sellers", "Dealers and dealership staff"],
    unaffected: ["Visitors (public browsing)", "Staff and administrators", "System Owners"],
    defaultMessage: "Signed-in services are temporarily under maintenance.",
  }),
  buyers_sellers: Object.freeze({
    label: "Buyers and private sellers",
    summary: "Buyers and private sellers cannot sign in or use signed-in functions, and new buyer registration is paused. Dealers, dealership staff, staff and public browsing are not affected.",
    affects: ["Buyers and private sellers", "New buyer registration"],
    unaffected: ["Visitors (public browsing)", "Dealers and dealership staff", "Staff and administrators", "System Owners"],
    defaultMessage: "Buyer and seller accounts are temporarily under maintenance.",
  }),
  dealers: Object.freeze({
    label: "Dealers and dealership staff",
    summary: "Dealer accounts and dealership team members cannot sign in or use signed-in functions. Buyers, private sellers, staff and public browsing are not affected.",
    affects: ["Dealers", "Dealership staff (active dealer-team members)"],
    unaffected: ["Visitors (public browsing)", "Buyers and private sellers", "Staff and administrators", "System Owners"],
    defaultMessage: "Dealer accounts are temporarily under maintenance.",
  }),
});
export const SCOPE_IDS = Object.freeze(Object.keys(MAINTENANCE_SCOPES));
export const isValidScope = (s) => typeof s === "string" && Object.prototype.hasOwnProperty.call(MAINTENANCE_SCOPES, s);

/** Audiences a request can belong to. `owner` and the technical-recovery capability are NOT audiences that any scope restricts. */
export const AUDIENCES = Object.freeze(["anonymous", "buyers_sellers", "dealers", "staff", "owner"]);

/** Which audiences each scope refuses. Owners are never in any set; technical-recovery staff are `staff` + a capability flag. */
const RESTRICTED = Object.freeze({
  global: new Set(["anonymous", "buyers_sellers", "dealers", "staff"]),
  ordinary_users: new Set(["buyers_sellers", "dealers"]),
  buyers_sellers: new Set(["buyers_sellers"]),
  dealers: new Set(["dealers"]),
});
export const isAudienceRestricted = (scope, audience) => !!RESTRICTED[scope]?.has(audience);

// ───────────────────────── route classification ─────────────────────────
const SESSION_ROUTES = new Set([
  "GET /auth/me", "POST /auth/login", "POST /auth/refresh", "POST /auth/logout", "GET /auth/csrf", "GET /auth/profile",
]);
const CONTROL_ROUTES = Object.freeze({
  "GET /admin/system/maintenance/status": "status",
  "POST /admin/system/maintenance/recover": "recover",
  "POST /admin/system/maintenance/activate": "activate",
});
const REGISTRATION_ROUTES = new Set(["POST /auth/register"]);

export const normalizeRoutePath = (path) => String(path || "").split("?")[0].replace(/^\/v\d+(?=\/)/, "").replace(/\/+$/, "") || "/";

/**
 * Classify a request by purpose and risk.
 *   session      - sign-in, session verification, refresh, safe logout (needed for authentication, MFA and recovery)
 *   control      - the maintenance control plane (status / recover / activate)
 *   registration - creating a new ordinary account
 *   other        - everything else (marketplace, dealer, finance, admin ...)
 */
export const classifyRoute = (method, path) => {
  const key = `${String(method || "").toUpperCase()} ${normalizeRoutePath(path)}`;
  if (CONTROL_ROUTES[key]) return { kind: "control", control: CONTROL_ROUTES[key] };
  if (key === "POST /auth/logout") return { kind: "session", logout: true };
  if (SESSION_ROUTES.has(key)) return { kind: "session" };
  if (REGISTRATION_ROUTES.has(key)) return { kind: "registration" };
  return { kind: "other" };
};

// ───────────────────────── identity ─────────────────────────
/** Staff roles that may hold the explicit platform-recovery permission. Mirrors config/roles.js STAFF_ROLES (kept local so this file stays dependency-free). */
const TECH_ELIGIBLE_ROLES = new Set(["admin", "superadmin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator", "ghost_checker"]);
export const PLATFORM_RECOVERY_PERMISSION = "platform_recovery";

/**
 * Explicit technical-recovery authority: a staff account that a System Owner has granted `platform_recovery` on that individual
 * account (and not revoked). Role names, "superadmin" role labels, e-mail addresses and default role permissions NEVER confer it.
 */
export const hasTechnicalRecovery = (user) => {
  if (!user || !TECH_ELIGIBLE_ROLES.has(user.role)) return false;
  if (user.status && user.status !== "approved") return false;
  const granted = Array.isArray(user.grantedPermissions) ? user.grantedPermissions : [];
  const revoked = Array.isArray(user.revokedPermissions) ? user.revokedPermissions : [];
  return granted.includes(PLATFORM_RECOVERY_PERMISSION) && !revoked.includes(PLATFORM_RECOVERY_PERMISSION);
};

/** Pure audience mapping. `dealerTeamMember` is supplied by the caller (database lookup) and only matters for role `user`. */
export const audienceForUser = (user, { isOwner = false, dealerTeamMember = false } = {}) => {
  if (isOwner) return "owner";
  const role = user?.role;
  if (TECH_ELIGIBLE_ROLES.has(role)) return "staff";
  if (role === "dealer") return "dealers";
  if (role === "individual_seller") return "buyers_sellers";
  if (role === "user") return dealerTeamMember ? "dealers" : "buyers_sellers";
  return "buyers_sellers"; // unknown roles are treated as ordinary (most restricted), never as privileged
};
export const needsDealerTeamLookup = (user, { isOwner = false } = {}) => !isOwner && user?.role === "user";

/** identity = { audience, isOwner, techRecovery } ; null = not yet known (pre-authentication). */
export const buildIdentity = (user, opts = {}) => {
  const isOwner = !!opts.isOwner;
  return { audience: audienceForUser(user, opts), isOwner, techRecovery: !isOwner && hasTechnicalRecovery(user) };
};

// ───────────────────────── the decision ─────────────────────────
const CONTROL_ALLOWED = Object.freeze({
  status: (id) => id.isOwner || id.techRecovery,
  recover: (id) => id.isOwner || id.techRecovery,
  activate: (id) => id.isOwner, // restricting the platform is never delegated to technical staff
});

/**
 * decide({ scope, route, identity }) -> { allow, reason }
 *   identity === null  : the caller is not authenticated yet. Session routes are allowed through (the handler decides after it
 *                        has verified the password / session); control routes are allowed through (they authenticate and authorise
 *                        themselves); everything else is judged as an anonymous request.
 */
export const decide = ({ scope, route, identity = null }) => {
  if (!isValidScope(scope)) return { allow: false, reason: "INVALID_SCOPE" };
  if (route.kind === "control") {
    if (!identity) return { allow: true, reason: "AUTHENTICATES_ITSELF" };
    return CONTROL_ALLOWED[route.control](identity) ? { allow: true, reason: "CONTROL_PERMITTED" } : { allow: false, reason: "CONTROL_NOT_PERMITTED" };
  }
  // Safe logout is never blocked: it only revokes the caller's own refresh tokens and sessions, so a restricted user must still be able to end
  // their session (and an operator must be able to revoke a stolen one) while maintenance is active.
  if (route.logout) return { allow: true, reason: "SAFE_LOGOUT" };
  if (scope === "global") {
    if (route.kind === "session") {
      if (!identity) return { allow: true, reason: "SESSION_PRE_AUTH" };
      return identity.isOwner || identity.techRecovery ? { allow: true, reason: "RECOVERY_SESSION" } : { allow: false, reason: "GLOBAL_SHUTDOWN" };
    }
    return { allow: false, reason: "GLOBAL_SHUTDOWN" };
  }
  // scoped maintenance
  const audience = identity ? identity.audience : "anonymous";
  if (route.kind === "session" && !identity) return { allow: true, reason: "SESSION_PRE_AUTH" };
  if (isAudienceRestricted(scope, audience)) return { allow: false, reason: "SCOPE_RESTRICTED" };
  if (route.kind === "registration" && !identity && isAudienceRestricted(scope, "buyers_sellers")) return { allow: false, reason: "REGISTRATION_PAUSED" };
  return { allow: true, reason: "UNAFFECTED" };
};

// ───────────────────────── state shape ─────────────────────────
export const DEFAULT_SYSTEM_STATUS = Object.freeze({
  isAuctionActive: true,
  isPaymentsActive: true,
  isGhostCheckActive: true,
  isMaintenanceMode: false,
  emergencyMessage: "System under scheduled maintenance.",
});

/**
 * Normalise the stored system_status value. Backward compatible: a row written before scopes existed (isMaintenanceMode=true, no
 * maintenanceScope — e.g. the hosted row today) is a GLOBAL shutdown, exactly as it behaved. An unknown stored scope fails closed to global.
 */
export const normalizeSystemStatus = (raw) => {
  const v = { ...DEFAULT_SYSTEM_STATUS, ...(raw && typeof raw === "object" ? raw : {}) };
  const active = v.isMaintenanceMode === true;
  const scope = !active ? null : isValidScope(v.maintenanceScope) ? v.maintenanceScope : "global";
  const meta = v.maintenanceMeta && typeof v.maintenanceMeta === "object" ? v.maintenanceMeta : {};
  const version = Number.isInteger(v.maintenanceVersion) && v.maintenanceVersion >= 0 ? v.maintenanceVersion : 0;
  return { ...v, isMaintenanceMode: active, maintenanceScope: scope, maintenanceMeta: meta, maintenanceVersion: version };
};

export const maintenanceResponse = (message, scope) => ({
  success: false,
  code: MAINTENANCE_CODE,
  maintenance: true,
  ...(scope ? { scope } : {}),
  message: message || DEFAULT_SYSTEM_STATUS.emergencyMessage,
});
