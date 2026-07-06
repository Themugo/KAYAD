import Auction from "../models/Auction.js";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";

export const listAuctions = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const { status, search, sort } = req.query;

  const filter = { deletedAt: null };
  if (status) filter.status = status;

  let sortObj = { endTime: -1 };
  if (sort === "newest") sortObj = { startTime: -1 };
  else if (sort === "ending_soon") sortObj = { endTime: 1 };
  else if (sort === "price_asc") sortObj = { highestBid: 1 };
  else if (sort === "price_desc") sortObj = { highestBid: -1 };

  let pipeline = [
    { $match: filter },
    { $sort: sortObj },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "cars",
        localField: "carId",
        foreignField: "_id",
        as: "car",
      },
    },
    { $unwind: { path: "$car", preserveNullAndEmptyArrays: true } },
  ];

  if (search) {
    const searchRegex = new RegExp(search, "i");
    pipeline.unshift({
      $match: {
        $or: [
          { "car.title": searchRegex },
          { "car.brand": searchRegex },
          { "car.model": searchRegex },
        ],
      },
    });
  }

  const [auctions, total] = await Promise.all([
    Auction.aggregate(pipeline),
    Auction.countDocuments(filter),
  ]);

  const enriched = auctions.map((a) => ({
    _id: a._id,
    carId: a.car?._id || a.carId,
    roomId: a.roomId,
    status: a.status,
    startingBid: a.startingBid,
    highestBid: a.highestBid,
    winner: a.winner,
    bidHistory: a.bidHistory,
    startTime: a.startTime,
    endTime: a.endTime,
    extendedCount: a.extendedCount,
    paymentDeadline: a.paymentDeadline,
    paymentStatus: a.paymentStatus,
    bidSecurityAmount: a.bidSecurityAmount,
    commissionRate: a.commissionRate,
    createdBy: a.createdBy,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    car: a.car
      ? {
          _id: a.car._id,
          title: a.car.title,
          brand: a.car.brand,
          model: a.car.model,
          year: a.car.year,
          price: a.car.price,
          images: a.car.images,
          fuel: a.car.fuel,
          transmission: a.car.transmission,
          mileage: a.car.mileage,
          location: a.car.location,
          dealer: a.car.dealer,
          currentBid: a.car.currentBid,
          bidsCount: a.car.bidsCount,
          auctionStatus: a.car.auctionStatus,
          allowBid: a.car.allowBid,
        }
      : null,
  }));

  res.json({
    success: true,
    auctions: enriched,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

export const getAuction = async (req, res) => {
  const auction = await Auction.findById(req.params.id)
    .populate({
      path: "carId",
      select: "title brand model year price images fuel transmission mileage location dealer currentBid bidsCount auctionStatus allowBid description features reservePrice reserveMode",
    })
    .lean();

  if (!auction) {
    return res.status(404).json({ success: false, message: "Auction not found" });
  }

  const bids = await Bid.find({ carId: auction.carId })
    .sort({ amount: -1 })
    .limit(50)
    .populate("user", "name email phone")
    .lean();

  res.json({
    success: true,
    auction: {
      ...auction,
      car: auction.carId,
    },
    bids,
  });
};

export const getMyAuctions = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const userCars = await Car.find({ dealer: userId }).select("_id").lean();
  const carIds = userCars.map((c) => c._id);

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { carId: { $in: carIds }, deletedAt: null };
  if (req.query.status) filter.status = req.query.status;

  const [auctions, total] = await Promise.all([
    Auction.find(filter)
      .sort({ endTime: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "carId",
        select: "title brand model year price images",
      })
      .lean(),
    Auction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    auctions: auctions.map((a) => ({ ...a, car: a.carId })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

export const getActiveAuctions = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const now = new Date();
  const filter = {
    deletedAt: null,
    status: "active",
    startTime: { $lte: now },
    endTime: { $gt: now },
  };

  const [auctions, total] = await Promise.all([
    Auction.find(filter)
      .sort({ endTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "carId",
        select: "title brand model year price images fuel transmission mileage location currentBid bidsCount",
      })
      .lean(),
    Auction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    auctions: auctions.map((a) => ({ ...a, car: a.carId })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};
