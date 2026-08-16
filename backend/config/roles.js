// ============================================================
//  KAYAD — Centralized Role Definitions & Permissions
//  Single source of truth. All middleware imports from here.
//  ============================================================

// ─── Role Hierarchy (ascending) ──────────────────────────────
// Each level inherits permissions from all levels below.
export const ROLE_HIERARCHY = [
  "user", // 0 — basic authenticated user
  "individual_seller", // 1 — private party seller
  "dealer", // 2 — registered dealer
  "ghost_checker", // 4 — can inspect/ghost-check vehicles
  "moderator", // 5 — content moderator
  "ad_manager", // 6 — manages ads & placements
  "marketing", // 7 — marketing team
  "escrow_officer", // 8 — manages escrow releases
  "technical_support", // 9 — support team
  "hr", // 10 — human resources
  "accounts", // 11 — finance & accounts
  "admin", // 12 — full admin access
  "superadmin", // 13 — system superadmin
];

// ─── Virtual Roles (not in User model, used at runtime) ─────
export const WEBHOIST = "webhoist"; // platform owner — bypasses ALL checks

// ─── Staff Roles (can access /admin/*) ──────────────────────
export const STAFF_ROLES = [
  "admin",
  "superadmin",
  "marketing",
  "technical_support",
  "hr",
  "accounts",
  "escrow_officer",
  "ad_manager",
  "moderator",
  "ghost_checker",
];

// ─── Seller Roles (can list cars for sale) ──────────────────
export const SELLER_ROLES = ["dealer", "individual_seller"];

// ─── Dealer Team Sub-Roles (inside a dealer org) ─────────────
export const TEAM_ROLES = {
  viewer: { canViewCars: true, canViewEarnings: false, canManageTeam: false, canApproveDeals: false },
  sales: { canViewCars: true, canViewEarnings: false, canManageTeam: false, canApproveDeals: false },
  finance_officer: { canViewCars: true, canViewEarnings: true, canManageTeam: false, canApproveDeals: false },
  manager: { canViewCars: true, canViewEarnings: true, canManageTeam: true, canApproveDeals: true },
};

// ─── Permission Constants ────────────────────────────────────
export const PERM = {
  MANAGE_CARS: "manage_cars",
  MANAGE_AUCTIONS: "manage_auctions",
  MANAGE_USERS: "manage_users",
  MANAGE_ESCROW: "manage_escrow",
  MANAGE_ADS: "manage_ads",
  MANAGE_MODERATION: "manage_moderation",
  MANAGE_SUPPORT: "manage_support",
  MANAGE_FINANCE: "manage_finance",
  MANAGE_STAFF: "manage_staff",
  VIEW_LOGS: "view_logs",
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_INSPECTIONS: "manage_inspections",
  MANAGE_PLATFORM: "manage_platform",
  BYPASS_RATE_LIMIT: "bypass_rate_limit",
  FULL_ACCESS: "full_access", // superadmin + webhoist only
};

// ─── Role → Permissions Mapping ──────────────────────────────
export const ROLE_PERMISSIONS = {
  user: [],
  individual_seller: [PERM.MANAGE_CARS],
  dealer: [PERM.MANAGE_CARS, PERM.MANAGE_AUCTIONS],
  ghost_checker: [PERM.MANAGE_INSPECTIONS, PERM.VIEW_ANALYTICS],
  moderator: [PERM.MANAGE_MODERATION, PERM.VIEW_LOGS],
  ad_manager: [PERM.MANAGE_ADS, PERM.VIEW_ANALYTICS],
  marketing: [PERM.VIEW_ANALYTICS, PERM.MANAGE_ADS],
  escrow_officer: [PERM.MANAGE_ESCROW, PERM.VIEW_LOGS],
  technical_support: [PERM.MANAGE_SUPPORT, PERM.VIEW_LOGS, PERM.MANAGE_USERS],
  hr: [PERM.MANAGE_STAFF, PERM.MANAGE_USERS],
  accounts: [PERM.MANAGE_FINANCE, PERM.VIEW_ANALYTICS, PERM.VIEW_LOGS],
  admin: [
    PERM.MANAGE_CARS,
    PERM.MANAGE_AUCTIONS,
    PERM.MANAGE_USERS,
    PERM.MANAGE_ESCROW,
    PERM.MANAGE_ADS,
    PERM.MANAGE_MODERATION,
    PERM.MANAGE_SUPPORT,
    PERM.MANAGE_FINANCE,
    PERM.MANAGE_STAFF,
    PERM.VIEW_LOGS,
    PERM.VIEW_ANALYTICS,
    PERM.MANAGE_INSPECTIONS,
    PERM.MANAGE_PLATFORM,
    PERM.BYPASS_RATE_LIMIT,
  ],
  superadmin: Object.values(PERM),
};

// ─── Helpers ──────────────────────────────────────────────────

export const getRoleLevel = (role) => ROLE_HIERARCHY.indexOf(role);

export const hasPermission = (role, permission) => {
  if (role === WEBHOIST) return true;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
};

export const getPermissions = (role) => {
  if (role === WEBHOIST) return Object.values(PERM);
  return [...(ROLE_PERMISSIONS[role] || [])];
};

export const isStaff = (role) => STAFF_ROLES.includes(role);

export const isSeller = (role) => SELLER_ROLES.includes(role);

export const isAtLeast = (role, minRole) => {
  if (role === WEBHOIST) return true;
  return getRoleLevel(role) >= getRoleLevel(minRole);
};

// ============================================================
//  ASSIGNABLE PERMISSIONS (superadmin grants/revokes per user)
// ============================================================

// Permissions a superadmin may grant or revoke on an individual staff member.
// FULL_ACCESS is intentionally excluded — it is reserved for superadmin/webhoist.
export const ASSIGNABLE_PERMISSIONS = [
  PERM.MANAGE_CARS,
  PERM.MANAGE_AUCTIONS,
  PERM.MANAGE_USERS,
  PERM.MANAGE_ESCROW,
  PERM.MANAGE_ADS,
  PERM.MANAGE_MODERATION,
  PERM.MANAGE_SUPPORT,
  PERM.MANAGE_FINANCE,
  PERM.MANAGE_STAFF,
  PERM.VIEW_LOGS,
  PERM.VIEW_ANALYTICS,
  PERM.MANAGE_INSPECTIONS,
  PERM.MANAGE_PLATFORM,
  PERM.BYPASS_RATE_LIMIT,
];

// Human-readable labels + descriptions for the superadmin assignment UI.
export const PERM_LABELS = {
  [PERM.MANAGE_CARS]: { label: "Manage Listings", desc: "Approve, edit and remove car listings", group: "Marketplace" },
  [PERM.MANAGE_AUCTIONS]: {
    label: "Manage Auctions",
    desc: "Start, end, extend auctions and bids",
    group: "Marketplace",
  },
  [PERM.MANAGE_MODERATION]: {
    label: "Moderation",
    desc: "Review flagged content, reviews and chats",
    group: "Marketplace",
  },
  [PERM.MANAGE_USERS]: { label: "Manage Users", desc: "View and manage customer & seller accounts", group: "Users" },
  [PERM.MANAGE_STAFF]: { label: "Manage Staff", desc: "Manage dealer applications & staff records", group: "Users" },
  [PERM.MANAGE_ESCROW]: { label: "Escrow Operations", desc: "Hold and release escrow funds", group: "Finance" },
  [PERM.MANAGE_FINANCE]: { label: "Finance", desc: "Transactions, refunds and payouts", group: "Finance" },
  [PERM.MANAGE_ADS]: { label: "Ads & Promotions", desc: "Manage ad placements and campaigns", group: "Growth" },
  [PERM.VIEW_ANALYTICS]: { label: "View Analytics", desc: "Access reports and market data", group: "Growth" },
  [PERM.MANAGE_INSPECTIONS]: { label: "Inspections", desc: "Ghost-check vehicles & NTSA queue", group: "Operations" },
  [PERM.MANAGE_SUPPORT]: { label: "Support", desc: "Handle support tickets and user help", group: "Operations" },
  [PERM.VIEW_LOGS]: { label: "View Security Logs", desc: "Read audit and security logs", group: "Operations" },
  [PERM.MANAGE_PLATFORM]: { label: "Platform Settings", desc: "Edit platform-wide settings", group: "System" },
  [PERM.BYPASS_RATE_LIMIT]: { label: "Bypass Rate Limit", desc: "Exempt from API rate limiting", group: "System" },
};

/**
 * Compute a user's EFFECTIVE permissions:
 *   role defaults ∪ grantedPermissions − revokedPermissions
 * Superadmin and webhoist always receive the full permission set.
 */
export const getEffectivePermissions = (user) => {
  if (!user) return [];
  if (user.role === "superadmin" || user.role === WEBHOIST) {
    return Object.values(PERM);
  }
  const base = new Set(ROLE_PERMISSIONS[user.role] || []);
  for (const p of user.grantedPermissions || []) base.add(p);
  for (const p of user.revokedPermissions || []) base.delete(p);
  return [...base];
};

/**
 * Permission check that honours per-user grants/revokes.
 * Pass the full user object (must include role + granted/revoked arrays).
 */
export const userHasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === "superadmin" || user.role === WEBHOIST) return true;
  return getEffectivePermissions(user).includes(permission);
};
