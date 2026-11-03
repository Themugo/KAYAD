import { findOne, update } from "../db/index.js";

const fail = (status, code, message) => Object.assign(new Error(message), { status, code, expose: true });

/**
 * Marks one of the dealer's OWN listings as sold.
 * Only columns that exist on `cars` are written (sold, status); sale details go to the audit log
 * (the previous version wrote a non-existent sale-details column and could not succeed).
 */
export async function markDealerListingSold(dealerId, carId, body = {}) {
  const existing = await findOne("cars", { id: carId, dealer: dealerId });
  if (!existing) throw fail(404, "CAR_NOT_FOUND", "Car not found");
  if (existing.status === "sold") throw fail(409, "ALREADY_SOLD", "This vehicle is already marked as sold.");
  const auctionStatus = String(existing.auctionStatus ?? existing.auction_status ?? "none");
  if (auctionStatus === "live") {
    throw fail(409, "AUCTION_IN_PROGRESS", "This vehicle has a live auction. Finish or cancel the auction first.");
  }
  const car = await update("cars", carId, { sold: true, status: "sold" });
  const salePrice = Number(body.salePrice);
  return {
    car,
    audit: {
      buyerName: body.buyerName ? String(body.buyerName).slice(0, 200) : null,
      salePrice: Number.isFinite(salePrice) && salePrice > 0 ? salePrice : existing.price,
      notes: (body.notes || body.saleNotes) ? String(body.notes || body.saleNotes).slice(0, 500) : null,
    },
  };
}
