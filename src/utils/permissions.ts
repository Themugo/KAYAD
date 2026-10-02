// ============================================================
//  KAYAD — Frontend Permission Mirror
//  Mirrors backend/config/roles.js so the UI can compute the
//  same effective permissions the API enforces. The backend
//  remains the source of truth; this only controls what the UI
//  shows/hides. Never rely on it for security.
// ============================================================

export const PERM = {
  MANAGE_CARS:        "manage_cars",
  MANAGE_AUCTIONS:    "manage_auctions",
  MANAGE_USERS:       "manage_users",
  MANAGE_ESCROW:      "manage_escrow",
  VIEW_ESCROW:        "view_escrow",
  OPERATE_ESCROW:     "operate_escrow",
  APPROVE_ESCROW_RELEASE: "approve_escrow_release",
  APPROVE_ESCROW_REFUND: "approve_escrow_refund",
  SETTLE_ESCROW_PAYOUT: "settle_escrow_payout",
  RECONCILE_ESCROW:   "reconcile_escrow",
  CONFIGURE_ESCROW:   "configure_escrow",
  VIEW_ESCROW_AUDIT:  "view_escrow_audit",
  EMERGENCY_ESCROW_CONTROL: "emergency_escrow_control",
  MANAGE_ADS:         "manage_ads",
  MANAGE_MODERATION:  "manage_moderation",
  MANAGE_SUPPORT:     "manage_support",
  MANAGE_FINANCE:     "manage_finance",
  MANAGE_STAFF:       "manage_staff",
  VIEW_LOGS:          "view_logs",
  VIEW_ANALYTICS:     "view_analytics",
  MANAGE_INSPECTIONS: "manage_inspections",
  MANAGE_PLATFORM:    "manage_platform",
  BYPASS_RATE_LIMIT:  "bypass_rate_limit",
  FULL_ACCESS:        "full_access",
} as const;

export type Permission = typeof PERM[keyof typeof PERM];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  user:               [],
  individual_seller:  [PERM.MANAGE_CARS],
  broker:             [PERM.MANAGE_CARS, PERM.MANAGE_AUCTIONS],
  dealer:             [PERM.MANAGE_CARS, PERM.MANAGE_AUCTIONS],
  ghost_checker:      [PERM.MANAGE_INSPECTIONS, PERM.VIEW_ANALYTICS],
  moderator:          [PERM.MANAGE_MODERATION, PERM.VIEW_LOGS],
  ad_manager:         [PERM.MANAGE_ADS, PERM.VIEW_ANALYTICS],
  marketing:          [PERM.VIEW_ANALYTICS, PERM.MANAGE_ADS],
  escrow_officer:     [PERM.VIEW_ESCROW, PERM.OPERATE_ESCROW, PERM.VIEW_ESCROW_AUDIT, PERM.VIEW_LOGS],
  technical_support:  [PERM.MANAGE_SUPPORT, PERM.VIEW_LOGS, PERM.MANAGE_USERS],
  hr:                 [PERM.MANAGE_STAFF, PERM.MANAGE_USERS],
  accounts:           [PERM.MANAGE_FINANCE, PERM.VIEW_ANALYTICS, PERM.VIEW_LOGS],
  admin:              [PERM.MANAGE_CARS, PERM.MANAGE_AUCTIONS, PERM.MANAGE_USERS,
                       PERM.MANAGE_ESCROW, PERM.VIEW_ESCROW, PERM.OPERATE_ESCROW,
                       PERM.APPROVE_ESCROW_RELEASE, PERM.APPROVE_ESCROW_REFUND,
                       PERM.SETTLE_ESCROW_PAYOUT, PERM.RECONCILE_ESCROW, PERM.CONFIGURE_ESCROW,
                       PERM.VIEW_ESCROW_AUDIT, PERM.EMERGENCY_ESCROW_CONTROL, PERM.MANAGE_ADS, PERM.MANAGE_MODERATION,
                       PERM.MANAGE_SUPPORT, PERM.MANAGE_FINANCE, PERM.MANAGE_STAFF,
                       PERM.VIEW_LOGS, PERM.VIEW_ANALYTICS, PERM.MANAGE_INSPECTIONS,
                       PERM.MANAGE_PLATFORM, PERM.BYPASS_RATE_LIMIT],
  superadmin:         Object.values(PERM),
};

export const ASSIGNABLE_PERMISSIONS: Permission[] = [
  PERM.MANAGE_CARS, PERM.MANAGE_AUCTIONS, PERM.MANAGE_USERS, PERM.MANAGE_ESCROW,
  PERM.VIEW_ESCROW, PERM.OPERATE_ESCROW, PERM.APPROVE_ESCROW_RELEASE, PERM.APPROVE_ESCROW_REFUND,
  PERM.SETTLE_ESCROW_PAYOUT, PERM.RECONCILE_ESCROW, PERM.CONFIGURE_ESCROW, PERM.VIEW_ESCROW_AUDIT,
  PERM.EMERGENCY_ESCROW_CONTROL,
  PERM.MANAGE_ADS, PERM.MANAGE_MODERATION, PERM.MANAGE_SUPPORT, PERM.MANAGE_FINANCE,
  PERM.MANAGE_STAFF, PERM.VIEW_LOGS, PERM.VIEW_ANALYTICS, PERM.MANAGE_INSPECTIONS,
  PERM.MANAGE_PLATFORM, PERM.BYPASS_RATE_LIMIT,
];

export interface PermLabel {
  label: string;
  desc: string;
  group: string;
}

export const PERM_LABELS: Record<Permission, PermLabel> = {
  [PERM.MANAGE_CARS]:        { label: "Manage Listings",    desc: "Approve, edit and remove car listings",     group: "Marketplace" },
  [PERM.MANAGE_AUCTIONS]:    { label: "Manage Auctions",    desc: "Start, end, extend auctions and bids",      group: "Marketplace" },
  [PERM.MANAGE_MODERATION]:  { label: "Moderation",         desc: "Review flagged content, reviews and chats", group: "Marketplace" },
  [PERM.MANAGE_USERS]:       { label: "Manage Users",       desc: "View and manage customer & seller accounts",group: "Users" },
  [PERM.MANAGE_STAFF]:       { label: "Manage Staff",       desc: "Manage dealer applications & staff records", group: "Users" },
[PERM.MANAGE_ESCROW]:      { label: "Escrow Operations",  desc: "Legacy escrow operations umbrella",             group: "Finance" },
  [PERM.VIEW_ESCROW]:        { label: "View Escrow", desc: "View escrow cases without money-moving authority", group: "Escrow" },
  [PERM.OPERATE_ESCROW]:     { label: "Operate Escrow", desc: "Process operational escrow steps", group: "Escrow" },
  [PERM.APPROVE_ESCROW_RELEASE]: { label: "Approve Release", desc: "Approve release of held funds", group: "Escrow" },
  [PERM.APPROVE_ESCROW_REFUND]: { label: "Approve Refund", desc: "Approve refund initiation", group: "Escrow" },
  [PERM.SETTLE_ESCROW_PAYOUT]: { label: "Settle Payouts", desc: "Record confirmed payout/refund settlement", group: "Escrow" },
  [PERM.RECONCILE_ESCROW]:   { label: "Reconcile Escrow", desc: "Reconcile custody, ledger and provider records", group: "Escrow" },
  [PERM.CONFIGURE_ESCROW]:   { label: "Configure Escrow", desc: "Manage custody accounts and escrow rules", group: "Escrow" },
  [PERM.VIEW_ESCROW_AUDIT]:  { label: "Escrow Audit", desc: "View escrow operational and financial audit history", group: "Escrow" },
  [PERM.EMERGENCY_ESCROW_CONTROL]: { label: "Emergency Escrow Control", desc: "Exceptional escrow controls reserved for senior administrators", group: "Escrow" },
  [PERM.MANAGE_FINANCE]:     { label: "Finance",            desc: "Transactions, refunds and payouts",         group: "Finance" },
  [PERM.MANAGE_ADS]:         { label: "Ads & Promotions",   desc: "Manage ad placements and campaigns",        group: "Growth" },
  [PERM.VIEW_ANALYTICS]:     { label: "View Analytics",     desc: "Access reports and market data",            group: "Growth" },
  [PERM.MANAGE_INSPECTIONS]: { label: "Inspections",        desc: "Ghost-check vehicles & NTSA queue",         group: "Operations" },
  [PERM.MANAGE_SUPPORT]:     { label: "Support",            desc: "Handle support tickets and user help",      group: "Operations" },
  [PERM.VIEW_LOGS]:          { label: "View Security Logs", desc: "Read audit and security logs",              group: "Operations" },
  [PERM.MANAGE_PLATFORM]:    { label: "Platform Settings",  desc: "Edit platform-wide settings",               group: "System" },
  [PERM.BYPASS_RATE_LIMIT]:  { label: "Bypass Rate Limit",  desc: "Exempt from API rate limiting",             group: "System" },
  [PERM.FULL_ACCESS]:        { label: "Full Access",        desc: "Unrestricted access to all features",       group: "System" },
};

/**
 * Effective permissions for a user object:
 *   role defaults ∪ grantedPermissions − revokedPermissions
 * Superadmin always has the full set.
 */
export interface UserPermissions {
  role?: string;
  grantedPermissions?: string[];
  revokedPermissions?: string[];
}

export function getEffectivePermissions(user: UserPermissions | null | undefined): Permission[] {
  if (!user) return [];
  if (user.role === "superadmin") return Object.values(PERM);
  const base = new Set<Permission>(ROLE_PERMISSIONS[user.role || ""] || []);
  for (const p of (user.grantedPermissions || [])) base.add(p as Permission);
  for (const p of (user.revokedPermissions || [])) base.delete(p as Permission);
  return [...base] as Permission[];
}

export function userHasPermission(user: UserPermissions | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return getEffectivePermissions(user).includes(permission);
}

// Maps an admin route → the permission that unlocks it.
// A page is visible if the user's role grants it OR a permission was assigned.
export const PAGE_PERMISSIONS: Record<string, Permission> = {
  "/admin/users":         PERM.MANAGE_USERS,
  "/admin/sellers":       PERM.MANAGE_STAFF,
  "/admin/cars":          PERM.MANAGE_CARS,
  "/admin/moderation":    PERM.MANAGE_MODERATION,
  "/admin/auctions":      PERM.MANAGE_AUCTIONS,
  "/admin/bids":          PERM.MANAGE_AUCTIONS,
  "/admin/escrows":       PERM.VIEW_ESCROW,
  "/admin/transactions":  PERM.MANAGE_FINANCE,
  "/admin/reviews":       PERM.MANAGE_MODERATION,
  "/admin/chats":         PERM.MANAGE_MODERATION,
  "/admin/referrals":     PERM.VIEW_ANALYTICS,
  "/admin/market-data":   PERM.VIEW_ANALYTICS,
  "/admin/ntsa-queue":    PERM.MANAGE_INSPECTIONS,
  "/admin/inspections":   PERM.MANAGE_INSPECTIONS,
  "/admin/inspector-applications": PERM.MANAGE_INSPECTIONS,
  "/admin/security-log":  PERM.VIEW_LOGS,
  "/admin/ads":           PERM.MANAGE_ADS,
  "/admin/settings":      PERM.MANAGE_PLATFORM,
};

// Superadmin-only pages — never unlocked by a granted permission.
export const SUPERADMIN_ONLY = new Set([
  "/admin/staff",
  "/admin/staff-permissions",
  "/admin/control-room",
  "/admin/panic-room",
  "/admin/webhoist",
]);
