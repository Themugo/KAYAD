import { getSupabase } from "../utils/supabase.js";
import { buildPersonalListingActionEligibility, buildPersonalListingMutationFilter } from "./personalListingEligibilityProjection.js";
export { buildPersonalListingMutationFilter };
import { getMySellerCapability } from "./privateSellerCapability.service.js";

const PERSONAL_ROLES = new Set(["user", "individual_seller"]);
const ACTIVE_ESCROW_STATUSES = ["pending", "funded", "vehicle_confirmed", "delivered", "disputed"];
const ACTIVE_OUTCOME_STATUSES = ["payment_received", "refund_pending", "ready_for_collection", "collected", "transfer_pending", "disputed"];
const PERSONAL_MUTATION_ACTIONS = new Set(["edit", "photos", "remove"]);
const idOf = (car) => String(car?.id ?? car?._id ?? "").trim();

// A relation that does not exist in the database cannot hold a lock, a hold or a transaction. Only these two codes
// (Postgres "undefined_table" and PostgREST "table not in schema cache") mean that; every other failure is an unknown.
const MISSING_RELATION_CODES = new Set(["42P01", "PGRST205"]);
const isMissingRelation = (error) =>
  MISSING_RELATION_CODES.has(String(error?.code || ""))
  || /could not find the table .* in the schema cache|relation .* does not exist/i.test(String(error?.message || ""));

/**
 * Classify one record-set read:
 *  - ok       the rows are authoritative
 *  - missing  the table is not deployed in this database, so no such record can exist (empty set, reported as degraded)
 *  - error    the read failed for any other reason, so the answer is unknown and the actions that depend on it fail closed
 */
export function readRecordSet(result, source) {
  if (!result?.error) return { state: "ok", rows: result?.data || [], source };
  if (isMissingRelation(result.error)) return { state: "missing", rows: [], source };
  return { state: "error", rows: [], source, error: result.error };
}

/**
 * Read-only projection of the existing lifecycle, policy visibility and transaction records.
 * This is not a second lifecycle system: kayad_personal_listing_lifecycle_atomic remains the
 * authoritative writer and re-checks every lifecycle transition inside its database transaction.
 *
 * One unavailable record set no longer disables every control: each action fails closed only when a record set that
 * action genuinely depends on is unknown (see buildPersonalListingActionEligibility).
 */
export async function getPersonalListingActionEligibility(cars, owner) {
  const rows = Array.isArray(cars) ? cars : [];
  const ids = [...new Set(rows.map(idOf).filter(Boolean))];
  if (!ids.length) return new Map();

  const supabase = getSupabase();
  const [eventsResult, visibilityResult, bidsResult, escrowsResult, outcomesResult, settlementsResult, capabilityOutcome] = await Promise.all([
    supabase.from("personal_listing_lifecycle_events")
      .select("id,car_id,action,created_at")
      .in("car_id", ids)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(10000),
    supabase.from("private_seller_listing_visibility_events")
      .select("car_id")
      .in("car_id", ids)
      .is("restored_at", null),
    supabase.from("bids").select("car_id").in("car_id", ids).limit(10000),
    supabase.from("escrows").select("car,status").in("car", ids).in("status", ACTIVE_ESCROW_STATUSES),
    supabase.from("purchase_outcomes").select("car_id,status").in("car_id", ids).in("status", ACTIVE_OUTCOME_STATUSES),
    supabase.from("marketplace_offer_settlements").select("vehicle_id,status").in("vehicle_id", ids).in("status", ["awaiting_payment", "paid"]),
    getMySellerCapability(owner).then((capability) => ({ capability }), (error) => ({ error })),
  ]);

  const recordSets = {
    events: readRecordSet(eventsResult, "lifecycle history"),
    visibility: readRecordSet(visibilityResult, "policy visibility"),
    bids: readRecordSet(bidsResult, "bids"),
    escrows: readRecordSet(escrowsResult, "escrow activity"),
    outcomes: readRecordSet(outcomesResult, "purchase outcomes"),
    settlements: readRecordSet(settlementsResult, "offer settlements"),
  };

  const role = String(owner?.role || "").toLowerCase();
  const roleAllowed = PERSONAL_ROLES.has(role);
  const emailVerified = role !== "user" || owner?.emailVerified === true;
  const sellerCapability = capabilityOutcome.capability;
  const capabilityUnknown = Boolean(capabilityOutcome.error);
  const sellerWriteAllowed = roleAllowed && !capabilityUnknown && sellerCapability?.canList === true && emailVerified;
  let sellerWriteCode = "SELLER_ACCESS";
  const sellerWriteReason = !roleAllowed
    ? "This account role cannot manage personal vehicle listings. Contact support if you believe this is incorrect."
    : capabilityUnknown
      ? (sellerWriteCode = "SELLER_ACCESS_UNAVAILABLE", "We could not confirm your selling access just now, so changes are paused. Your listing is unchanged. Try again in a moment.")
      : !emailVerified
        ? "Verify your email before changing your vehicle listings."
        : sellerCapability?.packageMode !== "free"
          ? "Private seller listing access is currently unavailable under the platform's seller package settings. Contact support."
          : sellerCapability?.canList !== true
            ? `Your selling access is currently ${sellerCapability?.status || "unavailable"}. Recheck access or contact support.`
            : "";

  return buildPersonalListingActionEligibility({
    cars: rows,
    events: recordSets.events.rows,
    visibility: recordSets.visibility.rows,
    bids: recordSets.bids.rows,
    escrows: recordSets.escrows.rows,
    outcomes: recordSets.outcomes.rows,
    settlements: recordSets.settlements.rows,
    recordSets,
    capabilityStatus: sellerCapability?.status,
    sellerWriteAllowed,
    sellerWriteReason,
    sellerWriteCode,
  });
}


/** Fail-closed backend guard for owner mutations outside the atomic lifecycle RPC. */
export async function assertPersonalListingMutationAllowed({ car, owner, action }) {
  const role = String(owner?.role || "").toLowerCase();
  if (!PERSONAL_ROLES.has(role)) {
    // Business (dealer) owners: a sold listing is read-only for edits, price, photos and removal (DA-03). Corrections go through the
    // audited admin function kayad_admin_correct_sold_listing; the database trigger trg_cars_sold_read_only is the final backstop.
    // Removal keeps its established contract (409 LISTING_DELETE_BLOCKED / reason LISTING_SOLD from listingDeletionBlock), so only edit and
    // photo changes are refused here.
    if (action !== "remove" && car && (car.status === "sold" || car.sold === true)) {
      const error = new Error("Sold listings are read-only.");
      error.status = 409; error.code = "LISTING_SOLD_READ_ONLY"; error.expose = true;
      throw error;
    }
    return { allowed: true, skipped: true };
  }
  if (!PERSONAL_MUTATION_ACTIONS.has(action)) {
    const error = new Error("Unsupported listing mutation.");
    error.status = 400; error.code = "INVALID_LISTING_MUTATION"; error.expose = true;
    throw error;
  }
  const eligibility = await getPersonalListingActionEligibility([car], owner);
  const permission = eligibility.get(String(car?.id ?? car?._id ?? "").trim());
  if (!permission) {
    const error = new Error("Could not verify listing permissions. Refresh and try again.");
    error.status = 503; error.code = "LISTING_PERMISSION_CHECK_UNAVAILABLE"; error.expose = true;
    throw error;
  }
  const allowed = action === "edit" ? permission.canEdit : action === "photos" ? permission.canManagePhotos : permission.canRemove;
  if (!allowed) {
    // A temporary read failure is a retryable 503, distinct from a genuine permission/state denial (409).
    const unknown = permission.permissionsAvailable === false;
    const error = new Error(permission.reason || (unknown ? "Could not verify listing permissions. Try again." : "This listing cannot be changed in its current state."));
    error.status = unknown ? 503 : 409;
    error.code = unknown ? "LISTING_PERMISSION_CHECK_UNAVAILABLE" : permission.isPolicyHidden ? "LISTING_MODERATION_LOCK" : "LISTING_MUTATION_LOCKED";
    error.expose = true;
    throw error;
  }
  return { allowed: true };
}
