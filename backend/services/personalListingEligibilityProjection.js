const idOf = (car) => String(car?.id ?? car?._id ?? "").trim();
const statusOf = (car) => {
  const raw = String(car?.status ?? "").trim().toLowerCase();
  const aliases = {
    active: "available",
    approved: "available",
    published: "available",
    submitted: "pending",
    under_review: "pending",
    pending_review: "pending",
    paused: "hidden",
  };
  return aliases[raw] || raw;
};
const auctionOf = (car) => String(car?.auctionStatus ?? car?.auction_status ?? "none").trim().toLowerCase();
const bidsOf = (car) => Number(car?.bidsCount ?? car?.bids_count ?? 0) || 0;
const highestBidderOf = (car) => car?.highestBidderId ?? car?.highest_bidder_id ?? null;

/** Conditional single-row filter used for owner edit/photo writes. */
export function buildPersonalListingMutationFilter({ car, ownerId, expectedImages, expectedUpdatedAt } = {}) {
  const filter = {
    id: String(car?.id ?? car?._id ?? "").trim(),
    dealer: String(ownerId ?? "").trim(),
    deletedAt: { $exists: false },
    status: { $in: ["draft", "pending", "available", "active", "approved", "published", "submitted", "under_review", "pending_review"] },
    highestBidderId: null,
    $or: [
      { auctionStatus: { $in: ["none", "draft", "scheduled", "cancelled"] }, bidsCount: 0 },
      { auctionStatus: { $in: ["none", "draft", "scheduled", "cancelled"] }, bidsCount: null },
      { auctionStatus: null, bidsCount: 0 },
      { auctionStatus: null, bidsCount: null },
    ],
  };
  // `images` is a jsonb column. A raw array would be sent as a Postgres array literal and PostgREST rejects it ("invalid input syntax for
  // type json"), which made every owner photo write fail against a real database; serialise the snapshot as JSON text instead.
  if (Array.isArray(expectedImages)) filter.images = JSON.stringify(expectedImages);
  if (expectedUpdatedAt !== undefined) {
    filter.updatedAt = expectedUpdatedAt instanceof Date ? expectedUpdatedAt.toISOString() : expectedUpdatedAt;
  }
  return filter;
}

/** Pure read-model projection; it never writes or replaces the canonical lifecycle RPC. */
export function buildPersonalListingActionEligibility({ cars, events = [], visibility = [], bids = [], escrows = [], outcomes = [], settlements = [], capabilityStatus = "", sellerWriteAllowed = true, sellerWriteReason = "" }) {
  const rows = Array.isArray(cars) ? cars : [];
  const latestAction = new Map();
  for (const event of events) {
    const carId = String(event?.car_id || "");
    if (carId && !latestAction.has(carId)) latestAction.set(carId, String(event.action || ""));
  }
  const policyHidden = new Set(visibility.map((row) => String(row?.car_id || "")).filter(Boolean));
  const bidLocked = new Set(bids.map((row) => String(row?.car_id || "")).filter(Boolean));
  const escrowLocked = new Set(escrows.map((row) => String(row?.car || "")).filter(Boolean));
  const outcomeLocked = new Set(outcomes.map((row) => String(row?.car_id || "")).filter(Boolean));
  const settlementLocked = new Set(settlements.map((row) => String(row?.vehicle_id || "")).filter(Boolean));
  const capability = String(capabilityStatus || "").toLowerCase();

  const eligibility = new Map();
  for (const car of rows) {
    const id = idOf(car);
    if (!id) continue;
    const status = statusOf(car);
    const lastAction = latestAction.get(id) || "";
    const hasPolicyHide = policyHidden.has(id);
    const sellerHidden = status === "hidden" && lastAction === "seller_hide" && !hasPolicyHide;
    const moderatedOrUnknownHidden = status === "hidden" && !sellerHidden;
    const auctionStatus = auctionOf(car);
    const auctionStatusKnown = ["none", "draft", "scheduled", "cancelled", "live", "ended"].includes(auctionStatus);
    const bidCount = bidsOf(car);
    const transactionLocked =
      ["sold", "reserved", "rejected"].includes(status) || car?.sold === true ||
      !auctionStatusKnown || ["live", "ended"].includes(auctionStatus) || bidCount > 0 || bidCount < 0 || Boolean(highestBidderOf(car)) ||
      bidLocked.has(id) || escrowLocked.has(id) || outcomeLocked.has(id) || settlementLocked.has(id);
    const mutableStatus = ["draft", "pending", "available"].includes(status);
    const canPublish = sellerWriteAllowed && sellerHidden && car?.approved === true && !transactionLocked && !["suspended", "revoked"].includes(capability);
    const canMarkSold = sellerWriteAllowed && (status === "available" || sellerHidden) && !transactionLocked && !hasPolicyHide;
    const canHide = sellerWriteAllowed && status === "available" && !transactionLocked && !hasPolicyHide;
    const canEdit = sellerWriteAllowed && mutableStatus && !transactionLocked && !moderatedOrUnknownHidden && !hasPolicyHide;
    const canManagePhotos = canEdit;
    const canRemove = sellerWriteAllowed && (["draft", "pending", "available"].includes(status) || sellerHidden) && !transactionLocked && !moderatedOrUnknownHidden && !hasPolicyHide;
    const isSold = status === "sold" || car?.sold === true;
    const reason = !sellerWriteAllowed
      ? sellerWriteReason || "Your selling access is not currently enabled. Contact support."
      : isSold
        ? "This vehicle is marked as sold. Sold listings are kept as a record and can no longer be edited."
      : status === "reserved"
        ? "This vehicle is reserved for a buyer, so its details and photos are locked until the reservation ends."
      : status === "rejected"
        ? "This listing was not approved. Contact support before making changes."
      : settlementLocked.has(id)
        ? "An accepted offer is awaiting payment or has been paid for this vehicle, so its status and details cannot be changed here."
      : transactionLocked
        ? "This listing is protected by an auction, bid or transaction. Its details and photos cannot be changed right now."
      : hasPolicyHide || moderatedOrUnknownHidden
        ? "This listing is hidden by a moderation or account-safety process. Contact support before changing it."
        : sellerHidden && car?.approved !== true
          ? "This listing has not been approved for publication. You can remove it or contact support, but cannot republish it yet."
          : sellerHidden && ["suspended", "revoked"].includes(capability)
            ? "Your seller access is currently restricted. Contact support before republishing this listing."
            : sellerHidden
              ? "This listing is paused. Republish it before editing its details or photos."
              : !mutableStatus
                ? "This listing's current status does not allow owner changes."
                : "";

    eligibility.set(id, {
      permissionsAvailable: true,
      isSellerHidden: sellerHidden,
      isPolicyHidden: hasPolicyHide,
      canEdit,
      canManagePhotos,
      canHide,
      canRepublish: canPublish,
      canMarkSold,
      canRemove,
      reason,
      reasonCode: !reason ? "" : !sellerWriteAllowed ? "SELLER_ACCESS" : isSold ? "SOLD" : status === "reserved" ? "RESERVED" : settlementLocked.has(id) ? "OFFER_SETTLEMENT_LOCK" : transactionLocked ? "TRANSACTION_LOCK" : hasPolicyHide || moderatedOrUnknownHidden ? "MODERATION_HIDDEN" : "STATE",
    });
  }
  return eligibility;
}
