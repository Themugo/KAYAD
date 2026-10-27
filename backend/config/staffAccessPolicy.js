// backend/config/staffAccessPolicy.js - PHASE 16: least-privilege read/write policy for the three Phase 15 "all staff roles" areas.
// Derived ONLY from the existing role -> permission definitions in config/roles.js (no new role, no new permission). Each entry lists the
// permissions of which holding ANY one is sufficient. The route files import these gates; tests assert the resulting role matrix.
import { PERM } from "./roles.js";

export const STAFF_ACCESS_POLICY = Object.freeze({
  // Financial ledger: balance sheet, trial balance, entries, reconciliation (reads and writes). Finance staff and administrators only.
  "ledger.read": [PERM.MANAGE_FINANCE],
  "ledger.write": [PERM.MANAGE_FINANCE],
  // Communications administration. Recipient-level history and retries expose customer contact details: support or platform administration.
  "communications.config.read": [PERM.MANAGE_PLATFORM, PERM.MANAGE_SUPPORT],
  "communications.config.write": [PERM.MANAGE_PLATFORM],
  "communications.recipient.read": [PERM.MANAGE_PLATFORM, PERM.MANAGE_SUPPORT],
  "communications.delivery.retry": [PERM.MANAGE_PLATFORM, PERM.MANAGE_SUPPORT],
  // Operations dashboards (/api/operations-dashboard, /api/v1/analytics/operations): NOT listed here. Verified empirically (Phase 16 matrix) that the
  // command-center controller already restricts them to admin / superadmin / owner (ensureOperator); the route layer is left as is.
  "dashboard.sales.summary": [PERM.VIEW_ANALYTICS],
  "dashboard.sales.revenue": [PERM.MANAGE_FINANCE],
});
