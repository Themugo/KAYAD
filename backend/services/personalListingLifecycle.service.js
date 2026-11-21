import { getSupabase } from "../utils/supabase.js";

const ERROR_MAP = {
  PERSONAL_ACCOUNT_REQUIRED: [403, "PERSONAL_ACCOUNT_REQUIRED", "Listing lifecycle actions here are for personal accounts. Business accounts use their own workspace."],
  LISTING_NOT_FOUND: [404, "LISTING_NOT_FOUND", "Listing not found."],
  LISTING_REMOVED: [404, "LISTING_REMOVED", "This listing has been removed."],
  INVALID_LISTING_ACTION: [400, "INVALID_LISTING_ACTION", "Unsupported listing action."],
  LISTING_STATE_LOCKED: [409, "LISTING_STATE_LOCKED", "Sold, reserved or moderated listings cannot be changed here."],
  AUCTION_OR_BID_LOCK: [409, "AUCTION_OR_BID_LOCK", "This listing has auction activity or bids and cannot be changed by the seller."],
  TRANSACTION_LOCK: [409, "TRANSACTION_LOCK", "An active purchase or escrow transaction protects this listing."],
  OFFER_SETTLEMENT_LOCK: [409, "OFFER_SETTLEMENT_LOCK", "An accepted offer is awaiting payment or has been paid for this vehicle, so its status cannot be changed here."],
  LISTING_NOT_PUBLISHED: [409, "LISTING_NOT_PUBLISHED", "Only a currently published listing can be hidden."],
  LISTING_NOT_ELIGIBLE_TO_PUBLISH: [409, "LISTING_NOT_ELIGIBLE_TO_PUBLISH", "This listing is not eligible to be republished."],
  LISTING_NOT_SELLER_HIDDEN: [409, "LISTING_NOT_SELLER_HIDDEN", "This listing was hidden by moderation or another workflow and cannot be republished here."],
  LISTING_POLICY_HIDDEN: [409, "LISTING_POLICY_HIDDEN", "This listing is hidden by an account-level safety decision and cannot be restored here."],
  SELLER_CAPABILITY_BLOCKED: [403, "SELLER_CAPABILITY_BLOCKED", "Private selling is currently suspended for this account."],
  LISTING_NOT_ELIGIBLE_TO_MARK_SOLD: [409, "LISTING_NOT_ELIGIBLE_TO_MARK_SOLD", "This listing cannot be marked sold from its current state."],
};

export async function transitionPersonalListing({ carId, ownerId, action }) {
  const { data, error } = await getSupabase().rpc("kayad_personal_listing_lifecycle_atomic", {
    p_car_id: carId,
    p_owner_id: ownerId,
    p_action: action,
  });
  if (error) {
    const message = String(error.message || "");
    const key = Object.keys(ERROR_MAP).find((candidate) => message.includes(candidate));
    if (key) {
      const [status, code, safeMessage] = ERROR_MAP[key];
      throw Object.assign(new Error(safeMessage), { status, code, expose: true });
    }
    // The atomic lifecycle function (or a table it needs) is not deployed in this database. Say so plainly; never leak the internal
    // function name, and never fall back to a non-atomic status write (the RPC is the only safe writer of a status change).
    if (["PGRST202", "42883", "42P01", "PGRST205"].includes(String(error.code || "")) || /could not find the function|does not exist/i.test(message)) {
      throw Object.assign(new Error("Pausing, republishing and marking as sold are not enabled on this platform yet. Your listing is unchanged. Editing details and photos still work."), { status: 503, code: "LISTING_STATUS_SERVICE_UNAVAILABLE", expose: true });
    }
    throw error;
  }
  return data;
}

/** Records moderation decisions so seller republish can never reverse an administrator hide. */
export async function recordModerationListingLifecycle({ carId, sellerId, actorId, previousStatus, nextStatus }) {
  if (!carId || !sellerId || !actorId) return;
  const action = nextStatus === "hidden" ? "moderation_hide" : "moderation_approve";
  const { error } = await getSupabase().from("personal_listing_lifecycle_events").insert({
    car_id: carId, seller_user_id: sellerId, actor_user_id: actorId, actor_type: "moderator", action,
    previous_status: previousStatus || "pending", next_status: nextStatus,
  });
  if (error) throw error;
}
