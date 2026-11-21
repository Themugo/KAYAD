import { getSupabase } from "../utils/supabase.js";
import { buildPersonalListingActionEligibility, buildPersonalListingMutationFilter } from "./personalListingEligibilityProjection.js";
export { buildPersonalListingMutationFilter };
import { getMySellerCapability } from "./privateSellerCapability.service.js";

const PERSONAL_ROLES = new Set(["user", "individual_seller"]);
const ACTIVE_ESCROW_STATUSES = ["pending", "funded", "vehicle_confirmed", "delivered", "disputed"];
const ACTIVE_OUTCOME_STATUSES = ["payment_received", "refund_pending", "ready_for_collection", "collected", "transfer_pending", "disputed"];
const PERSONAL_MUTATION_ACTIONS = new Set(["edit", "photos", "remove"]);
const idOf = (car) => String(car?.id ?? car?._id ?? "").trim();

function resultError(result, source) {
  if (result?.error) {
    const error = new Error(`Could not verify listing permissions (${source}).`);
    error.status = 503;
    error.code = "LISTING_PERMISSION_CHECK_UNAVAILABLE";
    error.source = source;
    error.cause = result.error;
    error.expose = true;
    throw error;
  }
  return result?.data || [];
}

/**
 * Read-only projection of the existing lifecycle, policy visibility and transaction records.
 * This is not a second lifecycle system: kayad_personal_listing_lifecycle_atomic remains the
 * authoritative writer and re-checks every lifecycle transition inside its database transaction.
 */
export async function getPersonalListingActionEligibility(cars, owner) {
  const rows = Array.isArray(cars) ? cars : [];
  const ids = [...new Set(rows.map(idOf).filter(Boolean))];
  if (!ids.length) return new Map();

  const supabase = getSupabase();
  const [eventsResult, visibilityResult, bidsResult, escrowsResult, outcomesResult, settlementsResult, sellerCapability] = await Promise.all([
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
    getMySellerCapability(owner),
  ]);

  const events = resultError(eventsResult, "lifecycle history");
  const visibility = resultError(visibilityResult, "policy visibility");
  const bids = resultError(bidsResult, "bids");
  const escrows = resultError(escrowsResult, "escrow activity");
  const outcomes = resultError(outcomesResult, "purchase outcomes");
  // A database that predates offer settlements cannot hold one, so a missing relation is an empty set (anything else still fails closed).
  const missingRelation = ["42P01", "PGRST205"].includes(String(settlementsResult?.error?.code || ""));
  const settlements = missingRelation ? [] : resultError(settlementsResult, "offer settlements");
  const role = String(owner?.role || "").toLowerCase();
  const roleAllowed = PERSONAL_ROLES.has(role);
  const emailVerified = role !== "user" || owner?.emailVerified === true;
  const sellerWriteAllowed = roleAllowed && sellerCapability?.canList === true && emailVerified;
  const sellerWriteReason = !roleAllowed
    ? "This account role cannot manage personal vehicle listings. Contact support if you believe this is incorrect."
    : !emailVerified
      ? "Verify your email before changing your vehicle listings."
    : sellerCapability?.packageMode !== "free"
      ? "Private seller listing access is currently unavailable under the platform's seller package settings. Contact support."
      : sellerCapability?.canList !== true
        ? `Your selling access is currently ${sellerCapability?.status || "unavailable"}. Recheck access or contact support.`
        : "";

  return buildPersonalListingActionEligibility({
    cars: rows,
    events,
    visibility,
    bids,
    escrows,
    outcomes,
    settlements,
    capabilityStatus: sellerCapability?.status,
    sellerWriteAllowed,
    sellerWriteReason,
  });
}


/** Fail-closed backend guard for owner mutations outside the atomic lifecycle RPC. */
export async function assertPersonalListingMutationAllowed({ car, owner, action }) {
  const role = String(owner?.role || "").toLowerCase();
  if (!PERSONAL_ROLES.has(role)) return { allowed: true, skipped: true };
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
    const error = new Error(permission.reason || "This listing cannot be changed in its current state.");
    error.status = 409; error.code = permission.isPolicyHidden ? "LISTING_MODERATION_LOCK" : "LISTING_MUTATION_LOCKED"; error.expose = true;
    throw error;
  }
  return { allowed: true };
}
