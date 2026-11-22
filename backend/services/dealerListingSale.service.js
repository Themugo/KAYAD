import { getSupabase } from "../utils/supabase.js";

/**
 * Canonical dealer listing lifecycle (Draft -> Active -> Paused -> Sold). Every status change that matters to a transaction goes
 * through kayad_dealer_listing_lifecycle_atomic, which locks the listing row, refuses while a funded escrow / purchase outcome /
 * accepted-offer settlement / auction or bids exist, writes status + sold flag + sold_at and the audit/sale row in ONE transaction.
 * Individual mark-sold, bulk sold and the dealer-platform bulk endpoint all use this module, so there is no second implementation.
 */
const ERROR_MAP = {
  DEALER_ACCOUNT_REQUIRED: [403, "DEALER_ACCOUNT_REQUIRED", "Only a dealer business can change dealer listings."],
  LISTING_NOT_FOUND: [404, "CAR_NOT_FOUND", "Car not found"],
  LISTING_REMOVED: [404, "LISTING_REMOVED", "This listing has been removed."],
  INVALID_LISTING_ACTION: [400, "INVALID_LISTING_ACTION", "Unsupported listing action."],
  ALREADY_SOLD: [409, "ALREADY_SOLD", "This vehicle is already marked as sold."],
  LISTING_STATE_LOCKED: [409, "LISTING_STATE_LOCKED", "Reserved or moderated listings cannot be changed here."],
  AUCTION_OR_BID_LOCK: [409, "AUCTION_OR_BID_LOCK", "This vehicle has auction activity or bids. Finish or cancel the auction first."],
  TRANSACTION_LOCK: [409, "TRANSACTION_LOCK", "A funded escrow or active purchase protects this vehicle. Complete or resolve it before changing the listing."],
  OFFER_SETTLEMENT_LOCK: [409, "OFFER_SETTLEMENT_LOCK", "An accepted offer is awaiting payment or has been paid for this vehicle, so it cannot be changed here."],
  LISTING_NOT_PUBLISHED: [409, "LISTING_NOT_PUBLISHED", "Only a published listing can be paused."],
  LISTING_NOT_ELIGIBLE_TO_PUBLISH: [409, "LISTING_NOT_ELIGIBLE_TO_PUBLISH", "Only a paused or draft listing can be published."],
  LISTING_NOT_ELIGIBLE_TO_MARK_SOLD: [409, "LISTING_NOT_ELIGIBLE_TO_MARK_SOLD", "This listing cannot be marked sold from its current state."],
  LISTING_SOLD_READ_ONLY: [409, "LISTING_SOLD_READ_ONLY", "Sold listings are read-only."],
};

const fail = (status, code, message) => Object.assign(new Error(message), { status, code, expose: true });

export function mapLifecycleError(error) {
  const message = String(error?.message || "");
  const key = Object.keys(ERROR_MAP).find((k) => message.includes(k));
  if (key) { const [status, code, text] = ERROR_MAP[key]; return fail(status, code, text); }
  if (["PGRST202", "42883", "42P01", "PGRST205"].includes(String(error?.code || "")) || /could not find the function|does not exist/i.test(message)) {
    return fail(503, "LISTING_STATUS_SERVICE_UNAVAILABLE", "Listing status changes are not enabled on this platform yet. Your listing is unchanged.");
  }
  return error;
}

export async function transitionDealerListing({ dealerId, carId, action, actorId = null, sale = {} }) {
  const { data, error } = await getSupabase().rpc("kayad_dealer_listing_lifecycle_atomic", {
    p_car_id: carId, p_dealer_id: dealerId, p_action: action, p_actor_id: actorId || dealerId, p_sale: sale || {},
  });
  if (error) throw mapLifecycleError(error);
  return data;
}

/** Marks one of the dealer business's OWN listings as sold (individual path). */
export async function markDealerListingSold(dealerId, carId, body = {}, actorId = null) {
  const sale = {
    salePrice: Number.isFinite(Number(body.salePrice)) && Number(body.salePrice) > 0 ? Number(body.salePrice) : null,
    buyerName: body.buyerName ? String(body.buyerName).slice(0, 200) : null,
    notes: (body.notes || body.saleNotes) ? String(body.notes || body.saleNotes).slice(0, 500) : null,
  };
  const result = await transitionDealerListing({ dealerId, carId, action: "mark_sold", actorId, sale });
  const { data: car } = await getSupabase().from("cars").select("*").eq("id", carId).maybeSingle();
  return {
    car: car || { id: carId, status: "sold", sold: true },
    audit: { buyerName: result.buyerName ?? null, salePrice: result.salePrice ?? null, notes: result.notes ?? null },
  };
}

const hasText = (v) => typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined && v !== "";
const imageCount = (images) => {
  if (Array.isArray(images)) return images.length;
  if (typeof images === "string") { try { const p = JSON.parse(images); return Array.isArray(p) ? p.length : 0; } catch { return 0; } }
  return 0;
};

/** Minimum a dealer listing must carry to go on the public marketplace. Pure; returns the list of missing items. */
export function missingForPublication(car) {
  const missing = [];
  if (!hasText(car?.brand)) missing.push("brand");
  if (!hasText(car?.model)) missing.push("model");
  if (!(Number(car?.year) >= 1950)) missing.push("year");
  if (!(Number(car?.price) > 0)) missing.push("price");
  if (imageCount(car?.images) < 1) missing.push("photos");
  return missing;
}

/**
 * Publish (draft or paused -> Active) or Pause (Active -> Paused) one of the dealer business's own listings. Same atomic RPC as
 * mark-sold, so the sold / escrow / settlement / auction locks and the audit row are shared. A repeat request is a clean 409.
 */
export async function setDealerListingVisibility({ dealerId, carId, action, actorId = null }) {
  if (!["publish", "pause"].includes(action)) throw fail(400, "INVALID_LISTING_ACTION", "Unsupported listing action.");
  const sb = getSupabase();
  const { data: car } = await sb.from("cars").select("id,status,sold,deleted_at,brand,model,year,price,images,dealer_id").eq("id", carId).eq("dealer_id", dealerId).maybeSingle();
  if (!car) throw fail(404, "CAR_NOT_FOUND", "Car not found");
  if (!car.deleted_at && action === "publish") {
    if (car.status === "available") throw fail(409, "ALREADY_PUBLISHED", "This listing is already active.");
    if (car.status === "pending") throw fail(409, "LISTING_UNDER_REVIEW", "This listing is under review and cannot be published yet.");
    if (["hidden", "draft"].includes(car.status)) {
      const missing = missingForPublication(car);
      if (missing.length) throw Object.assign(fail(422, "LISTING_INCOMPLETE", `Add the missing details before publishing: ${missing.join(", ")}.`), { missing });
    }
  }
  if (!car.deleted_at && action === "pause" && car.status === "hidden") throw fail(409, "ALREADY_PAUSED", "This listing is already paused.");
  const result = await transitionDealerListing({ dealerId, carId, action: action === "pause" ? "hide" : "publish", actorId });
  return { ...result, label: result.status === "available" ? "Active" : "Paused" };
}

const STATUS_TO_ACTION = { sold: "mark_sold", hidden: "hide", paused: "hide", available: "publish", active: "publish" };
export const BULK_STATUSES = new Set(["available", "active", "sold", "hidden", "paused", "draft", "pending"]);
export const BULK_MAX = 100;

/**
 * Bulk status change, itemised: every listing is processed in its own atomic transaction and the response lists exactly which
 * changed and which were skipped with a reason code. Duplicate ids are collapsed. A refusal on one listing never blocks the others.
 */
export async function bulkChangeDealerListingStatus({ dealerId, actorId = null, ids, status, sale = {} }) {
  if (!BULK_STATUSES.has(status)) throw fail(400, "INVALID_LISTING_STATUS", "Unsupported listing status");
  const unique = [...new Set((Array.isArray(ids) ? ids : []).map(String))];
  if (!unique.length) throw fail(400, "IDS_REQUIRED", "ids (array) and status required");
  if (unique.length > BULK_MAX) throw fail(400, "TOO_MANY_IDS", `At most ${BULK_MAX} listings can be changed at once.`);
  const updated = []; const skipped = [];
  const action = STATUS_TO_ACTION[status];
  for (const id of unique) {
    try {
      if (action === "publish" || action === "hide") {
        await setDealerListingVisibility({ dealerId, carId: id, action: action === "hide" ? "pause" : "publish", actorId });
      } else if (action) {
        await transitionDealerListing({ dealerId, carId: id, action, actorId, sale });
      } else {
        // draft / pending: not transaction-relevant states; sold, rejected and non-owned rows are refused, the DB trigger backstops.
        const sb = getSupabase();
        const { data: row } = await sb.from("cars").select("id,status,sold,deleted_at").eq("id", id).eq("dealer_id", dealerId).maybeSingle();
        if (!row || row.deleted_at) throw fail(404, "CAR_NOT_FOUND", "Car not found");
        if (row.status === "sold" || row.sold) throw fail(409, "ALREADY_SOLD", "Sold listings are read-only.");
        if (["rejected", "reserved"].includes(row.status)) throw fail(409, "LISTING_STATE_LOCKED", "Reserved or moderated listings cannot be changed here.");
        const { error } = await sb.from("cars").update({ status }).eq("id", id).eq("dealer_id", dealerId);
        if (error) throw mapLifecycleError(error);
      }
      updated.push(id);
    } catch (err) {
      if (!err?.expose) throw err;
      skipped.push({ id, code: err.code, message: err.message });
    }
  }
  return { updated, skipped, requested: unique.length };
}
