import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import { findAll } from "../db/index.js";

// KAYAD canonical auction model: auction lifecycle state is stored on the
// cars row (auctionStatus, auctionStartTime, auctionEnd, currentBid, etc.).
// There is intentionally no separate `auctions` table in the authoritative
// Supabase migration chain. Public auction endpoints therefore expose a
// stable auction-shaped response derived from the canonical car record.

const toPublicStatus = (car) => {
  if (car.auctionStatus === "ended") return "ended";
  if (car.auctionStatus === "live") {
    const end = car.auctionEnd ? new Date(car.auctionEnd).getTime() : NaN;
    if (Number.isFinite(end) && end <= Date.now()) return "ended";
    return "active";
  }
  return "draft";
};

const toAuctionResponse = (car) => ({
  id: car.id,
  carId: car.id,
  status: toPublicStatus(car),
  startingBid: Number(car.startingBid ?? car.price ?? 0),
  highestBid: Number(car.currentBid ?? 0),
  startTime: car.auctionStartTime ?? null,
  endTime: car.auctionEnd ?? null,
  bidIncrement: Number(car.bidIncrement ?? 0),
  bidCount: Number(car.bidsCount ?? 0),
  allowBid: Boolean(car.allowBid),
  allowBuy: Boolean(car.allowBuy),
  car: {
    _id: car.id,
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    images: car.images,
    fuel: car.fuel,
    transmission: car.transmission,
    mileage: car.mileage,
    // STAGE 2 API CONTRACT CONVERGENCE FIX: car.location is not a real field
    // or alias at all (the real DB column is location_city, app-level alias
    // "city" — see utils/fieldMap.js's cars.city -> location_city entry and
    // carController.js's own documented fix of the identical defect at
    // listing-creation time). car.location was always undefined here, so
    // every public auction response's nested car.location silently carried
    // no city text whatsoever, with no error raised anywhere.
    location: car.city,
    // The frontend's AuctionsView.tsx already defensively reads
    // `auction.car?.location || auction.car?.location_city` (a leftover
    // guard from when this was broken) — sending the snake_case key too
    // costs nothing and means that fallback isn't dead weight.
    location_city: car.city,
    dealer: car.dealer ? {
      id: car.dealer.id || car.dealer._id || car.dealer,
      name: car.dealer.name || car.dealer.businessName || 'Verified organizer',
      businessName: car.dealer.businessName || null,
      avatar: car.dealer.avatar || null,
      dealerRating: car.dealer.dealerRating ?? null,
      verified: Boolean(car.dealer.dealerApprovedAt),
    } : null,
    currentBid: car.currentBid,
    bidsCount: car.bidsCount,
    auctionStatus: car.auctionStatus,
    allowBid: car.allowBid,
    description: car.description,
    features: car.features,
    reserveMode: car.reserveMode,
    // STAGE 8 MARKETPLACE TRUST SIGNAL FIX: the auction detail response
    // must agree with the marketplace card for the same vehicle (master
    // prompt: "The detail page must agree with the listing card"). Both
    // fields already exist on the canonical Car record; they were simply
    // never threaded through this serializer.
    escrowEnabled: Boolean(car.escrowEnabled),
    inspectionStatus: car.inspectionStatus ?? null,
  },
});

const buildAuctionFilter = ({ status, search } = {}) => {
  const filter = {
    deletedAt: null,
    auctionStatus: { $in: ["live", "ended"] },
  };

  if (status === "active" || status === "live") filter.auctionStatus = "live";
  if (status === "ended") filter.auctionStatus = "ended";

  if (search) filter.$text = { $search: String(search).trim() };
  return filter;
};

export const listAuctions = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  // Scheduled auctions live in the published auction setup contract until their
  // start time; they do not have to be copied into the cars lifecycle row early.
  if (req.query.status === "draft" || req.query.status === "scheduled") {
    const setups = await findAll("auction_setups", {
      filters: { publication_status: "published" },
      limit: 1000,
    });
    const now = Date.now();
    const scheduled = setups
      .filter((setup) => {
        const start = setup?.config?.startsAt ? Date.parse(setup.config.startsAt) : NaN;
        return Number.isFinite(start) && start > now;
      })
      .sort((a, b) => Date.parse(a.config.startsAt) - Date.parse(b.config.startsAt));
    const pageRows = scheduled.slice(skip, skip + limit);
    const ids = pageRows.map((setup) => setup.car_id).filter(Boolean);
    const cars = ids.length ? await Car.find({ deletedAt: null, id: { $in: ids } }).lean() : [];
    const byId = new Map(cars.map((car) => [String(car.id), car]));
    const auctions = pageRows.map((setup) => {
      const car = byId.get(String(setup.car_id));
      if (!car) return null;
      const config = setup.config || {};
      return toAuctionResponse({
        ...car,
        auctionStatus: "draft",
        auctionStartTime: config.startsAt,
        auctionEnd: config.endsAt,
        startingBid: config.startingBid,
        bidIncrement: config.bidIncrement,
        reservePrice: config.reservePrice,
        reserveMode: config.reserveMode,
      });
    }).filter(Boolean);
    return res.json({ success: true, auctions, pagination: { page, limit, total: scheduled.length, pages: Math.ceil(scheduled.length / limit) } });
  }

  const filter = buildAuctionFilter(req.query);

  let sort = { auctionEnd: -1 };
  if (req.query.sort === "newest") sort = { auctionStartTime: -1 };
  else if (req.query.sort === "ending_soon") sort = { auctionEnd: 1 };
  else if (req.query.sort === "price_asc") sort = { currentBid: 1 };
  else if (req.query.sort === "price_desc") sort = { currentBid: -1 };

  const [cars, total] = await Promise.all([
    Car.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Car.countDocuments(filter),
  ]);

  const auctions = cars.map(toAuctionResponse);
  res.json({
    success: true,
    auctions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

export const getAuction = async (req, res) => {
  const car = await Car.findById(req.params.id).populate("dealer", "name businessName avatar dealerApprovedAt dealerRating").lean();
  if (!car || !["draft", "live", "ended"].includes(car.auctionStatus)) {
    return res.status(404).json({ success: false, message: "Auction not found" });
  }

  const setup = await findAll("auction_setups", {
    filters: { car_id: car.id, publication_status: "published" },
    limit: 1,
  }).then((rows) => rows[0] || null);

  if (!setup) {
    return res.status(404).json({ success: false, message: "Auction not published" });
  }

  const config = setup.config || {};
  const startsAt = car.auctionStartTime || config.startsAt || null;
  const endsAt = car.auctionStatus === "live" || car.auctionStatus === "ended" ? (car.auctionEnd || config.endsAt || null) : (config.endsAt || car.auctionEnd || null);
  const scheduled = car.auctionStatus === "draft" && startsAt && new Date(startsAt).getTime() > Date.now();

  // Public auction activity must never expose bidder PII. Only confirmed
  // market-moving bids are returned, using the auction's pseudonymous bidder tag.
  const bids = await Bid.find({
    carId: car.id,
    status: { $in: ["paid", "won", "lost"] },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({
    success: true,
    auction: toAuctionResponse({
      ...car,
      auctionStartTime: startsAt,
      auctionEnd: endsAt,
      bidIncrement: config.bidIncrement ?? car.bidIncrement,
      startingBid: config.startingBid ?? car.startingBid,
      reservePrice: config.reservePrice ?? car.reservePrice,
      reserveMode: config.reserveMode ?? car.reserveMode,
      auctionStatus: scheduled ? "draft" : car.auctionStatus,
    }),
    bids: bids.map((b) => ({
      id: b.id || b._id,
      amount: Number(b.amount || 0),
      bidderTag: b.bidderTag || "Bidder",
      status: b.status,
      isAuto: Boolean(b.isAuto),
      createdAt: b.createdAt,
    })),
  });
};

export const getPublicAuctionBids = async (req, res) => {
  const car = await Car.findById(req.params.id).populate("dealer", "name businessName avatar dealerApprovedAt dealerRating").lean();
  if (!car || !["draft", "live", "ended"].includes(car.auctionStatus)) {
    return res.status(404).json({ success: false, message: "Auction not found" });
  }
  const setup = await findAll("auction_setups", {
    filters: { car_id: car.id, publication_status: "published" },
    limit: 1,
  }).then((rows) => rows[0] || null);
  if (!setup) return res.status(404).json({ success: false, message: "Auction not published" });

  const bids = await Bid.find({
    carId: car.id,
    status: { $in: ["paid", "won", "lost"] },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({
    success: true,
    bids: bids.map((b) => ({
      id: b.id || b._id,
      amount: Number(b.amount || 0),
      bidderTag: b.bidderTag || "Bidder",
      status: b.status,
      isAuto: Boolean(b.isAuto),
      createdAt: b.createdAt,
    })),
  });
};

export const getMyAuctions = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const filter = {
    deletedAt: null,
    dealer: userId,
    auctionStatus: { $in: ["live", "ended"] },
  };
  if (req.query.status === "active" || req.query.status === "live") filter.auctionStatus = "live";
  if (req.query.status === "ended") filter.auctionStatus = "ended";

  const [cars, total] = await Promise.all([
    Car.find(filter).sort({ auctionEnd: -1 }).skip(skip).limit(limit).lean(),
    Car.countDocuments(filter),
  ]);

  res.json({
    success: true,
    auctions: cars.map(toAuctionResponse),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

export const getActiveAuctions = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const now = new Date().toISOString();
  const filter = {
    deletedAt: null,
    auctionStatus: "live",
    allowBid: true,
    auctionStartTime: { $lte: now },
    auctionEnd: { $gt: now },
    // STAGE 8 CUSTOMER AUCTION JOURNEY FIX: a listing an admin has
    // rejected mid-auction (POST /admin/cars/:id/moderate, action:
    // "reject") only ever sets car.status = "rejected" — it does not
    // touch auctionStatus/allowBid (closing the auction is a separate,
    // deliberately-not-automatic decision; see
    // CUSTOMER_AUCTION_EXPERIENCE_AUDIT_20261008.md). Without this
    // exclusion, a rejected listing's auction stayed fully live and
    // biddable and was displayed to customers as a perfectly normal
    // active auction (vehicleApi.ts maps any non-sold/pending/draft
    // status, including "rejected", to frontend "active") — directly
    // contradicting the admin's rejection decision.
    status: { $ne: "rejected" },
  };

  const [cars, total] = await Promise.all([
    Car.find(filter).sort({ auctionEnd: 1 }).skip(skip).limit(limit).lean(),
    Car.countDocuments(filter),
  ]);

  res.json({
    success: true,
    auctions: cars.map(toAuctionResponse),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};
