/**
 * Auction Enrichment Helper (H2)
 *
 * Merges auction data from the `auctions` table into car objects.
 * Car auction columns on `cars` are DEPRECATED — always use this
 * helper when returning car data that includes auction info.
 *
 * Usage:
 *   import { enrichCarWithAuction, enrichCarsWithAuctions } from "../services/auctionEnrichment.js";
 *   const enriched = await enrichCarWithAuction(car);
 *   const enrichedCars = await enrichCarsWithAuctions(cars);
 */

import { getSupabase } from "../utils/supabase.js";
import { mapRowIn } from "../utils/fieldMap.js";

/**
 * Enrich a single car object with auction data from the auctions table.
 * If the car has no auction, returns the car unchanged.
 */
export async function enrichCarWithAuction(car) {
  if (!car || !car.hasAuction) return car;

  const sb = getSupabase();
  const { data: auction } = await sb
    .from("auctions")
    .select("*")
    .eq("car_id", car.id)
    .maybeSingle();

  if (!auction) return car;

  const enriched = mapRowIn("auctions", auction);
  return {
    ...car,
    // Auction fields overridden by the auctions table (single source of truth)
    currentBid: enriched.currentBid ?? car.currentBid,
    bidsCount: enriched.bidsCount ?? car.bidsCount,
    auctionStatus: enriched.status ?? car.auctionStatus,
    auctionStartTime: enriched.startTime ?? car.auctionStartTime,
    auctionEnd: enriched.endTime ?? car.auctionEnd,
    startingBid: enriched.startPrice ?? car.startingBid,
    reservePrice: enriched.reservePrice ?? car.reservePrice,
    reserveMode: enriched.reserveMode ?? car.reserveMode,
    highestBidderId: enriched.highestBidderId ?? car.highestBidderId,
    bidIncrement: enriched.bidIncrement ?? car.bidIncrement,
    allowBid: enriched.allowBid ?? car.allowBid,
    allowBuy: enriched.allowBuy ?? car.allowBuy,
    // Nested auction object for consumers that need full auction data
    auction: enriched,
  };
}

/**
 * Enrich an array of car objects with their auction data.
 * Uses a single batch query instead of N+1 individual queries.
 */
export async function enrichCarsWithAuctions(cars) {
  if (!cars || cars.length === 0) return cars;

  const auctionCars = cars.filter((c) => c?.hasAuction);
  if (auctionCars.length === 0) return cars;

  const carIds = auctionCars.map((c) => c.id);
  const sb = getSupabase();
  const { data: auctions } = await sb
    .from("auctions")
    .select("*")
    .in("car_id", carIds);

  if (!auctions || auctions.length === 0) return cars;

  const auctionByCarId = new Map(
    auctions.map((a) => [a.car_id, mapRowIn("auctions", a)])
  );

  return cars.map((car) => {
    if (!car?.hasAuction) return car;
    const auction = auctionByCarId.get(car.id);
    if (!auction) return car;
    return {
      ...car,
      currentBid: auction.currentBid ?? car.currentBid,
      bidsCount: auction.bidsCount ?? car.bidsCount,
      auctionStatus: auction.status ?? car.auctionStatus,
      auctionStartTime: auction.startTime ?? car.auctionStartTime,
      auctionEnd: auction.endTime ?? car.auctionEnd,
      startingBid: auction.startPrice ?? car.startingBid,
      reservePrice: auction.reservePrice ?? car.reservePrice,
      reserveMode: auction.reserveMode ?? car.reserveMode,
      highestBidderId: auction.highestBidderId ?? car.highestBidderId,
      bidIncrement: auction.bidIncrement ?? car.bidIncrement,
      allowBid: auction.allowBid ?? car.allowBid,
      allowBuy: auction.allowBuy ?? car.allowBuy,
      auction,
    };
  });
}
