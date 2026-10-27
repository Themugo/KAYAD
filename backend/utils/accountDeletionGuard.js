// Phase 14.9 - account deletion dependency guard.
//
// DELETE /api/admin/users/:id used to hard-delete the user row after soft-deleting the user's cars. On the real schema
// that (a) failed with a foreign-key 500 for any user with listings, bids or escrows AFTER the listings had already been
// soft-deleted (partial failure), and (b) silently CASCADE-DELETED payments, dealer payouts, auction registrations and
// deposit holds, dealerships and team rows - transaction history required for reconciliation. There is no dealership
// transfer, succession or closure workflow in the codebase, so a destructive deletion of an account that is linked to any
// of the records below is refused with a documented 409 and the operator is told to deactivate the account instead.
//
// The table below is derived from the foreign keys that reference public.users / public.profiles on a database built from
// every repository migration (see runbooks/phase14-9-20261026/localdb/e2e_account_security.cjs, which compares this list
// with pg_constraint so it cannot silently drift). Purely personal data that is intended to go with the account
// (profile, credentials, sessions, preferences, OTP challenges, notifications, saved searches, activity logs, campaigns)
// is deliberately not listed, and neither are log-style tables whose foreign key is ON DELETE SET NULL (delivery logs, events,
// analytics, support tickets, inspection history): the database already keeps those records and merely detaches the account.
// SET NULL links in financial, listing, auction and team tables ARE listed, because detaching them would rewrite history.
import { getSupabase } from "./supabase.js";

export const ACCOUNT_DELETE_BLOCK_CODE = "ACCOUNT_DELETE_BLOCKED";

export const ACCOUNT_DELETE_DEPENDENCIES = [
  ["DEALER_ORGANIZATION", "dealers", ["user"]],
  ["DEALER_ORGANIZATION", "dealer_verifications", ["user", "reviewed_by"]],
  ["LINKED_RECORDS", "referrals", ["referrer", "referee"]],
  ["DEALER_TEAM", "dealer_teams", ["dealer", "invited_by", "member"]],
  ["DEALER_ORGANIZATION", "dealer_subscriptions", ["dealer"]],
  ["FINANCIAL_RECORDS", "loan_applications", ["dealer", "reviewed_by", "applicant"]],
  ["FINANCIAL_RECORDS", "dealer_payouts", ["dealer"]],
  ["LISTINGS", "listing_entitlement_reservations", ["dealer_id"]],
  ["AUCTION_AND_BIDS", "auction_registrations", ["bidder_id"]],
  ["LINKED_RECORDS", "hero_placements", ["seller_id"]],
  ["AUCTION_AND_BIDS", "auction_security_holds", ["bidder_id"]],
  ["LISTINGS", "private_seller_capabilities", ["user_id", "reviewed_by"]],
  ["LISTINGS", "private_seller_listing_visibility_events", ["seller_user_id"]],
  ["LINKED_RECORDS", "users", ["referred_by", "escrow_capability_granted_by", "deleted_by"]],
  ["LISTINGS", "cars", ["deleted_by", "highest_bidder_id", "dealer_id"]],
  ["AUCTION_AND_BIDS", "bids", ["user_id"]],
  ["LINKED_RECORDS", "favorites", ["user_id"]],
  ["LINKED_RECORDS", "car_views", ["user_id"]],
  ["FINANCIAL_RECORDS", "escrows", ["releasedBy", "refundedBy", "disputedBy", "seller", "buyer", "disputeAssignedTo", "funded_by"]],
  ["LINKED_RECORDS", "leads", ["dealer", "buyer"]],
  ["LINKED_RECORDS", "idempotency_keys", ["user"]],
  ["FINANCIAL_RECORDS", "refunds", ["initiated_by"]],
  ["LINKED_RECORDS", "lead_activities", ["actor"]],
  ["LINKED_RECORDS", "currency_exchange_rates", ["updated_by", "created_by"]],
  ["LINKED_RECORDS", "service_jobs", ["requester_id"]],
  ["LINKED_RECORDS", "service_job_events", ["actor_id"]],
  ["LINKED_RECORDS", "service_job_disputes", ["resolved_by", "raised_by"]],
  ["LINKED_RECORDS", "service_job_dispute_evidence", ["submitted_by"]],
  ["LINKED_RECORDS", "inspection_dispute_evidence", ["submitted_by"]],
  ["LINKED_RECORDS", "inspection_risk_flags", ["user_id", "resolved_by"]],
  ["AUCTION_AND_BIDS", "auction_setups", ["organizer_id", "published_by"]],
  ["AUCTION_AND_BIDS", "auction_setup_amendments", ["reviewed_by", "requested_by"]],
  ["AUCTION_AND_BIDS", "auction_registration_events", ["actor_id"]],
  ["AUCTION_AND_BIDS", "auction_platform_policies", ["updated_by"]],
  ["AUCTION_AND_BIDS", "auction_outcomes", ["defaulted_by", "organizer_id", "winner_user_id", "cancelled_by", "transfer_updated_by", "collection_updated_by"]],
  ["AUCTION_AND_BIDS", "auction_fulfilment_events", ["actor_id"]],
  ["LINKED_RECORDS", "report_versions", ["reviewed_by", "approved_by"]],
  ["LINKED_RECORDS", "report_corrections", ["resolved_by"]],
  ["LISTINGS", "private_seller_auction_proposals", ["seller_user_id", "custody_received_by", "admin_decision_by", "authority_verified_by", "custody_released_by"]],
  ["LISTINGS", "private_seller_auction_evidence_events", ["actor_user_id"]],
  ["LINKED_RECORDS", "vehicle_custody_capabilities", ["approved_by", "requested_by"]],
  ["LINKED_RECORDS", "vehicle_custody_capability_events", ["actor_user_id"]],
  ["LINKED_RECORDS", "improvements", ["created_by"]],
  ["LINKED_RECORDS", "experiments", ["created_by"]],
  ["LINKED_RECORDS", "innovation_ideas", ["created_by"]],
  ["LINKED_RECORDS", "purchase_outcomes", ["buyer_user_id"]],
  ["FINANCIAL_RECORDS", "inspection_refunds", ["approved_by", "requested_by"]],
  ["FINANCIAL_RECORDS", "ledger_entries", ["user_id"]],
  ["FINANCIAL_RECORDS", "escrow_audits", ["performed_by"]],
  ["LINKED_RECORDS", "conversations", ["buyer_id", "seller_id"]],
  ["LINKED_RECORDS", "messages", ["sender_id"]],
  ["FINANCIAL_RECORDS", "payments", ["user_id"]],
  ["FINANCIAL_RECORDS", "escrow_transactions", ["seller_id", "buyer_id"]],
  ["LINKED_RECORDS", "reviews", ["dealer_id", "reviewer_id"]],
  ["LINKED_RECORDS", "vehicle_inspections", ["requester_id"]],
  ["LINKED_RECORDS", "intelligence_scheduled_reports", ["created_by"]],
];

// PHASE 16: tables that exist only once the (candidate) owner-governance migration is applied. owner_memberships.user_id is ON DELETE RESTRICT,
// so deleting an owner's user row would otherwise hit a foreign-key 500 AFTER the user's cars had been soft-deleted. They are checked when the
// table exists and skipped (not failed) when it does not, so hosted behaviour is unchanged until the migration is applied.
export const ACCOUNT_DELETE_OPTIONAL_DEPENDENCIES = [
  ["OWNER_GOVERNANCE", "owner_memberships", ["user_id"]],
];
const isMissingTable = (e) => /PGRST205|42P01/.test(String(e?.code)) || /does not exist|schema cache|could not find the table/i.test(String(e?.message || ""));

export const ACCOUNT_DELETE_REASON_MESSAGES = Object.freeze({
  OWNER_GOVERNANCE: "The account holds or held platform-owner membership. Owner accounts cannot be deleted; remove ownership through Admin → Owners first.",
  DEALER_ORGANIZATION: "The account owns a dealer organization. No ownership transfer or closure workflow exists.",
  DEALER_TEAM: "The account owns a dealer team or is a member of one.",
  LISTINGS: "The account has vehicle listings (including soft-deleted history) or seller auction records.",
  AUCTION_AND_BIDS: "The account has auction registrations, deposits, bids or outcomes.",
  FINANCIAL_RECORDS: "The account has payment, escrow, ledger, payout or refund history that must be retained for reconciliation.",
  LINKED_RECORDS: "Other retained records (leads, inspections, support, audit attribution) reference the account.",
});

const quote = (c) => (/^[a-z_]+$/.test(c) ? c : `"${c}"`);

async function countFor(sb, table, cols, id, optional = false) {
  const filter = cols.map((c) => `${quote(c)}.eq.${id}`).join(",");
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true }).or(filter);
  if (error && optional && isMissingTable(error)) return 0;
  if (error) throw Object.assign(new Error(`Dependency check failed for ${table}: ${error.message}`), { code: "ACCOUNT_DELETE_CHECK_FAILED" });
  return count || 0;
}

/**
 * Inspect every retained relationship of an account. Fails closed: if any check cannot be evaluated the error is thrown and the
 * caller must refuse the deletion. Returns the reasons grouped by category (counts only - no row data).
 */
export async function inspectAccountDeletion(userId, { sb = getSupabase(), concurrency = 12 } = {}) {
  const id = String(userId);
  const found = new Map();
  const queue = [...ACCOUNT_DELETE_DEPENDENCIES, ...ACCOUNT_DELETE_OPTIONAL_DEPENDENCIES.map((d) => [...d, true])];
  const worker = async () => {
    while (queue.length) {
      const [category, table, cols, optional] = queue.shift();
      const n = await countFor(sb, table, cols, id, optional === true);
      if (n > 0) found.set(category, (found.get(category) || 0) + n);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return [...found.entries()].map(([code, count]) => ({ code, count, message: ACCOUNT_DELETE_REASON_MESSAGES[code] }));
}

export const accountDeletionBlockedBody = (reasons) => ({
  success: false,
  code: ACCOUNT_DELETE_BLOCK_CODE,
  message: "This account cannot be permanently deleted because retained records depend on it. Deactivate the account instead (PUT /api/admin/users/:id/deactivate).",
  reasons,
});
