import Car from "../models/Car.js";
import Bid from "../models/Bid.js";

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
  reservePrice: car.reservePrice ?? null,
  highestBidderId: car.highestBidderId ?? null,
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
    location: car.location,
    dealer: car.dealer,
    currentBid: car.currentBid,
    bidsCount: car.bidsCount,
    auctionStatus: car.auctionStatus,
    allowBid: car.allowBid,
    description: car.description,
    features: car.features,
    reservePrice: car.reservePrice,
    reserveMode: car.reserveMode,
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
  const car = await Car.findById(req.params.id).lean();
  if (!car || !["live", "ended"].includes(car.auctionStatus)) {
    return res.status(404).json({ success: false, message: "Auction not found" });
  }

  const bids = await Bid.find({ carId: car.id })
    .sort({ amount: -1 })
    .limit(50)
    .populate("user", "name email phone")
    .lean();

  res.json({
    success: true,
    auction: toAuctionResponse(car),
    bids,
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
