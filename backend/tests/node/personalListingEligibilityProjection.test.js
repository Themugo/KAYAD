import test from "node:test";
import assert from "node:assert/strict";
import { buildPersonalListingActionEligibility, buildPersonalListingMutationFilter } from "../../services/personalListingEligibilityProjection.js";

const base = (overrides = {}) => ({ id: "car-1", status: "available", approved: true, auction_status: "none", bids_count: 0, ...overrides });
const get = (input, id = "car-1") => buildPersonalListingActionEligibility(input).get(id);

test("active unlocked listing exposes only the supported seller lifecycle actions", () => {
  const result = get({ cars: [base()] });
  assert.equal(result.canEdit, true);
  assert.equal(result.canManagePhotos, true);
  assert.equal(result.canHide, true);
  assert.equal(result.canMarkSold, true);
  assert.equal(result.canRepublish, false);
  assert.equal(result.canRemove, true);
});

test("only a seller-originated hidden listing can be republished", () => {
  const input = {
    cars: [base({ status: "hidden" })],
    events: [{ car_id: "car-1", action: "seller_hide" }],
  };
  const result = get(input);
  assert.equal(result.isSellerHidden, true);
  assert.equal(result.canRepublish, true);
  assert.equal(result.canMarkSold, true);
  assert.equal(result.canEdit, false);
  assert.equal(result.canManagePhotos, false);
  assert.equal(result.canRemove, true);
  assert.match(result.reason, /Republish it before editing/);
});

test("moderator-hidden and unknown-provenance listings fail closed", () => {
  const moderator = get({ cars: [base({ status: "hidden" })], events: [{ car_id: "car-1", action: "moderation_hide" }] });
  assert.equal(moderator.canRepublish, false);
  assert.equal(moderator.canEdit, false);
  assert.equal(moderator.canManagePhotos, false);
  assert.equal(moderator.canRemove, false);
  assert.equal(moderator.canMarkSold, false);

  const unknown = get({ cars: [base({ status: "hidden" })] });
  assert.equal(unknown.canRepublish, false);
  assert.equal(unknown.canEdit, false);
  assert.equal(unknown.canRemove, false);
});

test("an open account-policy visibility event blocks seller restoration", () => {
  const result = get({
    cars: [base({ status: "hidden" })],
    events: [{ car_id: "car-1", action: "seller_hide" }],
    visibility: [{ car_id: "car-1" }],
  });
  assert.equal(result.isPolicyHidden, true);
  assert.equal(result.canRepublish, false);
  assert.equal(result.canEdit, false);

  const staleVisibleRow = get({ cars: [base({ status: "available" })], visibility: [{ car_id: "car-1" }] });
  assert.equal(staleVisibleRow.canEdit, false);
  assert.equal(staleVisibleRow.canManagePhotos, false);
  assert.equal(staleVisibleRow.canHide, false);
  assert.equal(staleVisibleRow.canRemove, false);
});

test("bids, live or ended auctions, escrow and purchase outcomes lock owner mutations", () => {
  const lockedByBid = get({ cars: [base()], bids: [{ car_id: "car-1" }] });
  const lockedByAuction = get({ cars: [base({ auction_status: "live" })] });
  const lockedByEscrow = get({ cars: [base()], escrows: [{ car: "car-1", status: "funded" }] });
  const lockedByOutcome = get({ cars: [base()], outcomes: [{ car_id: "car-1", status: "refund_pending" }] });
  for (const result of [lockedByBid, lockedByAuction, lockedByEscrow, lockedByOutcome]) {
    assert.equal(result.canEdit, false);
    assert.equal(result.canManagePhotos, false);
    assert.equal(result.canHide, false);
    assert.equal(result.canMarkSold, false);
    assert.equal(result.canRemove, false);
  }
});

test("unknown auction states fail closed for owner mutations", () => {
  const result = get({ cars: [base({ auction_status: "integrity_review" })] });
  assert.equal(result.canEdit, false);
  assert.equal(result.canManagePhotos, false);
  assert.equal(result.canHide, false);
  assert.equal(result.canMarkSold, false);
  assert.equal(result.canRemove, false);
});

test("sold, reserved and unknown lifecycle states never expose destructive actions", () => {
  const results = ["sold", "reserved", "new_unrecognised_state"].map((status, index) =>
    get({ cars: [base({ id: `car-${index}`, status })] }, `car-${index}`),
  );
  for (const result of results) {
    assert.equal(result.canEdit, false);
    assert.equal(result.canManagePhotos, false);
    assert.equal(result.canHide, false);
    assert.equal(result.canRepublish, false);
    assert.equal(result.canMarkSold, false);
    assert.equal(result.canRemove, false);
  }
});

test("legacy lifecycle aliases map to the same safe owner actions", () => {
  for (const status of ["active", "approved", "published"]) {
    const result = get({ cars: [base({ status })] });
    assert.equal(result.canEdit, true, `${status} remains editable when unlocked`);
    assert.equal(result.canHide, true, `${status} can be paused when unlocked`);
    assert.equal(result.canMarkSold, true, `${status} can be marked sold when unlocked`);
  }
  for (const status of ["submitted", "under_review", "pending_review"]) {
    const result = get({ cars: [base({ status })] });
    assert.equal(result.canEdit, true, `${status} remains editable when unlocked`);
    assert.equal(result.canHide, false, `${status} cannot be paused as a published listing`);
    assert.equal(result.canMarkSold, false, `${status} cannot be marked sold`);
  }
});

test("seller account access gates every owner mutation", () => {
  const result = get({ cars: [base()], sellerWriteAllowed: false, sellerWriteReason: "Verify your email before changing listings." });
  assert.equal(result.canEdit, false);
  assert.equal(result.canManagePhotos, false);
  assert.equal(result.canHide, false);
  assert.equal(result.canRepublish, false);
  assert.equal(result.canMarkSold, false);
  assert.equal(result.canRemove, false);
  assert.match(result.reason, /Verify your email/);
});

test("unsupported legacy buyer role does not receive personal seller mutations", () => {
  const result = get({ cars: [base()], sellerWriteAllowed: false, sellerWriteReason: "This account role cannot manage personal vehicle listings." });
  assert.equal(result.canEdit, false);
  assert.equal(result.canHide, false);
  assert.equal(result.canRemove, false);
});

test("personal owner writes use a conditional owner/status/auction/bid filter and photo snapshot", () => {
  const images = [{ url: "https://cdn.example.test/cover.jpg" }];
  const filter = buildPersonalListingMutationFilter({ car: base({ images }), ownerId: "seller-1", expectedImages: images, expectedUpdatedAt: "2026-11-19T08:00:00.000Z" });
  assert.equal(filter.id, "car-1");
  assert.equal(filter.dealer, "seller-1");
  assert.deepEqual(filter.deletedAt, { $exists: false });
  assert.ok(filter.status.$in.includes("available"));
  assert.equal(filter.highestBidderId, null);
  assert.equal(filter.$or.length, 4);
  assert.equal(typeof filter.images, "string", "jsonb snapshot must be JSON text, not a raw array");
  assert.deepEqual(JSON.parse(filter.images), images);
  assert.equal(filter.updatedAt, "2026-11-19T08:00:00.000Z");
});

test("a suspended or revoked seller cannot republish even their own hidden listing", () => {
  for (const capabilityStatus of ["suspended", "revoked"]) {
    const result = get({
      cars: [base({ status: "hidden" })],
      events: [{ car_id: "car-1", action: "seller_hide" }],
      capabilityStatus,
    });
    assert.equal(result.canRepublish, false);
  }
});

test("a sold listing says it is sold (not that it is protected by an auction or transaction) and is fully locked", () => {
  const result = get({ cars: [base({ status: "sold", sold: true })] });
  assert.equal(result.canEdit, false);
  assert.equal(result.canManagePhotos, false);
  assert.equal(result.canMarkSold, false);
  assert.equal(result.canRemove, false);
  assert.equal(result.reasonCode, "SOLD");
  assert.match(result.reason, /marked as sold/i);
  assert.doesNotMatch(result.reason, /auction, bid or transaction/i);
});

test("a reserved listing explains the reservation lock", () => {
  const result = get({ cars: [base({ status: "reserved" })] });
  assert.equal(result.canMarkSold, false);
  assert.equal(result.reasonCode, "RESERVED");
  assert.match(result.reason, /reserved/i);
});

test("an accepted offer awaiting payment (or paid) blocks Mark as sold, pause, edit and photos", () => {
  for (const status of ["awaiting_payment", "paid"]) {
    const result = get({ cars: [base()], settlements: [{ vehicle_id: "car-1", status }] });
    assert.equal(result.canMarkSold, false, status);
    assert.equal(result.canHide, false, status);
    assert.equal(result.canEdit, false, status);
    assert.equal(result.canManagePhotos, false, status);
    assert.equal(result.reasonCode, "OFFER_SETTLEMENT_LOCK");
    assert.match(result.reason, /accepted offer/i);
  }
});

test("a settlement on another vehicle does not lock this one", () => {
  const result = get({ cars: [base()], settlements: [{ vehicle_id: "car-2", status: "awaiting_payment" }] });
  assert.equal(result.canMarkSold, true);
  assert.equal(result.reason, "");
});

test("the unlocked action set is unchanged when no reason applies", () => {
  const result = get({ cars: [base()] });
  assert.equal(result.reason, "");
  assert.equal(result.reasonCode, "");
});
