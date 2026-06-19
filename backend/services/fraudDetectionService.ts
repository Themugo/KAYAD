import User from "../models/User.ts";
import Car from "../models/Car.ts";
import Bid from "../models/Bid.ts";
import Escrow from "../models/Escrow.ts";
import Dispute from "../models/Dispute.ts";
import FraudDetection from "../models/FraudDetection.ts";

// =============================
// 👤 USER FRAUD DETECTION
// =============================

export const detectDuplicateAccounts = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const duplicates = await User.find({
    $or: [
      { phone: user.phone, _id: { $ne: userId } },
      { email: user.email, _id: { $ne: userId } },
    ],
  });

  if (duplicates.length > 0) {
    await FraudDetection.create({
      target: userId,
      targetType: "user",
      fraudType: "multiple_accounts",
      severity: "high",
      evidence: {
        duplicateCount: duplicates.length,
        duplicateIds: duplicates.map((d) => d._id),
        phone: user.phone,
        email: user.email,
      },
      relatedEntities: duplicates.map((d) => d._id),
      detectionMethod: "duplicate_contact_check",
      confidenceScore: 90,
    });
    return duplicates;
  }

  return null;
};

export const detectDuplicatePhone = async (phone) => {
  const users = await User.find({ phone });

  if (users.length > 1) {
    const primaryUser = users[0];
    const otherUsers = users.slice(1);

    for (const user of otherUsers) {
      await FraudDetection.create({
        target: user._id,
        targetType: "user",
        fraudType: "duplicate_phone",
        severity: "high",
        evidence: {
          phone,
          primaryUserId: primaryUser._id,
          primaryUserName: primaryUser.name,
        },
        relatedEntities: [primaryUser._id],
        detectionMethod: "phone_duplication_check",
        confidenceScore: 95,
      });
    }

    return otherUsers;
  }

  return null;
};

export const detectDuplicateEmail = async (email) => {
  const users = await User.find({ email });

  if (users.length > 1) {
    const primaryUser = users[0];
    const otherUsers = users.slice(1);

    for (const user of otherUsers) {
      await FraudDetection.create({
        target: user._id,
        targetType: "user",
        fraudType: "duplicate_email",
        severity: "high",
        evidence: {
          email,
          primaryUserId: primaryUser._id,
          primaryUserName: primaryUser.name,
        },
        relatedEntities: [primaryUser._id],
        detectionMethod: "email_duplication_check",
        confidenceScore: 95,
      });
    }

    return otherUsers;
  }

  return null;
};

// =============================
// 🎯 AUCTION FRAUD DETECTION
// =============================

export const detectSelfBidding = async (carId) => {
  const car = await Car.findById(carId).populate("dealer");
  if (!car) return null;

  const bids = await Bid.find({ car: carId }).populate("user");
  const dealerId = car.dealer?._id;

  const suspiciousBids = bids.filter((bid) => bid.user?._id.toString() === dealerId?.toString());

  if (suspiciousBids.length > 0) {
    await FraudDetection.create({
      target: dealerId,
      targetType: "user",
      fraudType: "self_bidding",
      severity: "critical",
      evidence: {
        carId,
        carTitle: car.title,
        suspiciousBidCount: suspiciousBids.length,
        suspiciousBidIds: suspiciousBids.map((b) => b._id),
        bidAmounts: suspiciousBids.map((b) => b.amount),
      },
      relatedEntities: [carId, ...suspiciousBids.map((b) => b._id)],
      detectionMethod: "self_bidding_detection",
      confidenceScore: 100,
    });

    return suspiciousBids;
  }

  return null;
};

export const detectBidRing = async (carId) => {
  const bids = await Bid.find({ car: carId }).populate("user");

  // Group bids by user
  const userBids = {};
  bids.forEach((bid) => {
    const userId = bid.user?._id?.toString();
    if (userId) {
      if (!userBids[userId]) {
        userBids[userId] = [];
      }
      userBids[userId].push(bid);
    }
  });

  // Check for suspicious patterns
  const suspiciousUsers = [];
  for (const [userId, userBidList] of Object.entries(userBids)) {
    // If user bids immediately after another specific user
    for (let i = 1; i < userBidList.length; i++) {
      const currentBid = userBidList[i];
      const prevBid = userBidList[i - 1];
      const timeDiff = new Date(currentBid.createdAt) - new Date(prevBid.createdAt);

      // If bid comes within 30 seconds of previous bid from same user
      if (timeDiff < 30000 && timeDiff > 0) {
        suspiciousUsers.push({
          userId,
          bidCount: userBidList.length,
          pattern: "rapid_successive_bids",
        });
        break;
      }
    }
  }

  if (suspiciousUsers.length > 0) {
    await FraudDetection.create({
      target: carId,
      targetType: "auction",
      fraudType: "bid_ring",
      severity: "high",
      evidence: {
        suspiciousUsers,
        totalBids: bids.length,
        uniqueBidders: Object.keys(userBids).length,
      },
      relatedEntities: [carId],
      detectionMethod: "bid_ring_detection",
      confidenceScore: 70,
    });

    return suspiciousUsers;
  }

  return null;
};

export const detectSuspiciousBidSpike = async (carId) => {
  const bids = await Bid.find({ car: carId }).sort({ createdAt: 1 });

  if (bids.length < 5) return null;

  // Calculate bids per minute in sliding window
  const oneMinute = 60000;
  let maxBidsInMinute = 0;

  for (let i = 0; i < bids.length; i++) {
    const windowStart = new Date(bids[i].createdAt).getTime();
    const windowEnd = windowStart + oneMinute;

    const bidsInWindow = bids.filter((bid) => {
      const bidTime = new Date(bid.createdAt).getTime();
      return bidTime >= windowStart && bidTime <= windowEnd;
    }).length;

    if (bidsInWindow > maxBidsInMinute) {
      maxBidsInMinute = bidsInWindow;
    }
  }

  // If more than 5 bids in a minute, it's suspicious
  if (maxBidsInMinute > 5) {
    await FraudDetection.create({
      target: carId,
      targetType: "auction",
      fraudType: "suspicious_bid_spike",
      severity: "medium",
      evidence: {
        maxBidsInMinute,
        totalBids: bids.length,
        spikeRatio: maxBidsInMinute / bids.length,
      },
      relatedEntities: [carId],
      detectionMethod: "bid_spike_detection",
      confidenceScore: 60,
    });

    return { maxBidsInMinute, totalBids: bids.length };
  }

  return null;
};

// =============================
// 🔒 ESCROW FRAUD DETECTION
// =============================

export const detectRepeatedDisputes = async (userId) => {
  const disputes = await Dispute.find({
    $or: [{ openedBy: userId }, { openedAgainst: userId }],
  }).sort({ createdAt: -1 });

  if (disputes.length >= 3) {
    await FraudDetection.create({
      target: userId,
      targetType: "user",
      fraudType: "repeated_disputes",
      severity: "high",
      evidence: {
        disputeCount: disputes.length,
        disputeIds: disputes.map((d) => d._id),
        disputeCategories: disputes.map((d) => d.category),
        recentDisputes: disputes.slice(0, 3).map((d) => ({
          id: d._id,
          category: d.category,
          status: d.status,
          createdAt: d.createdAt,
        })),
      },
      relatedEntities: disputes.map((d) => d._id),
      detectionMethod: "repeated_dispute_check",
      confidenceScore: 80,
    });

    return disputes;
  }

  return null;
};

export const detectChargeback = async (escrowId) => {
  // This would integrate with payment processor webhooks
  // For now, it's a placeholder for when chargeback notifications come in
  const escrow = await Escrow.findById(escrowId);

  if (escrow && escrow.status === "released") {
    await FraudDetection.create({
      target: escrow.buyer,
      targetType: "user",
      fraudType: "chargeback",
      severity: "critical",
      evidence: {
        escrowId,
        amount: escrow.amount,
        carId: escrow.car,
      },
      relatedEntities: [escrowId, escrow.car],
      detectionMethod: "chargeback_notification",
      confidenceScore: 100,
    });

    return escrow;
  }

  return null;
};

// =============================
// 🚗 DEALER FRAUD DETECTION
// =============================

export const detectDuplicateListing = async (dealerId) => {
  const cars = await Car.find({ dealer: dealerId });

  // Check for duplicate titles or VINs
  const titleMap = {};
  const vinMap = {};
  const duplicates = [];

  cars.forEach((car) => {
    if (car.title) {
      if (!titleMap[car.title]) {
        titleMap[car.title] = [];
      }
      titleMap[car.title].push(car._id);

      if (titleMap[car.title].length > 1) {
        duplicates.push({ type: "title", value: car.title, carIds: titleMap[car.title] });
      }
    }

    if (car.vin) {
      if (!vinMap[car.vin]) {
        vinMap[car.vin] = [];
      }
      vinMap[car.vin].push(car._id);

      if (vinMap[car.vin].length > 1) {
        duplicates.push({ type: "vin", value: car.vin, carIds: vinMap[car.vin] });
      }
    }
  });

  if (duplicates.length > 0) {
    await FraudDetection.create({
      target: dealerId,
      targetType: "user",
      fraudType: "duplicate_listing",
      severity: "medium",
      evidence: {
        duplicateCount: duplicates.length,
        duplicates,
      },
      relatedEntities: duplicates.flatMap((d) => d.carIds),
      detectionMethod: "duplicate_listing_check",
      confidenceScore: 75,
    });

    return duplicates;
  }

  return null;
};

export const detectVinReuse = async (vin) => {
  const cars = await Car.find({ vin });

  if (cars.length > 1) {
    const primaryCar = cars[0];
    const otherCars = cars.slice(1);

    for (const car of otherCars) {
      await FraudDetection.create({
        target: car.dealer,
        targetType: "user",
        fraudType: "vin_reuse",
        severity: "high",
        evidence: {
          vin,
          primaryCarId: primaryCar._id,
          primaryCarTitle: primaryCar.title,
          primaryDealerId: primaryCar.dealer,
        },
        relatedEntities: [primaryCar._id, car._id],
        detectionMethod: "vin_reuse_detection",
        confidenceScore: 90,
      });
    }

    return otherCars;
  }

  return null;
};

export const detectStolenPhotos = async (carId) => {
  // This would integrate with image recognition service
  // For now, it's a placeholder
  const car = await Car.findById(carId);

  if (car && car.images && car.images.length > 0) {
    // Placeholder for image similarity check
    // In production, this would use a service like Google Vision API or similar
    return null;
  }

  return null;
};

// =============================
// � PRICE MANIPULATION DETECTION
// =============================

export const detectPriceManipulation = async (carId) => {
  const car = await Car.findById(carId);
  if (!car) return null;

  // Check if price is significantly below market value
  const similarCars = await Car.find({
    make: car.make,
    model: car.model,
    year: { $gte: car.year - 2, $lte: car.year + 2 },
    status: "active",
  });

  if (similarCars.length < 3) return null;

  const prices = similarCars.map((c) => c.price).filter((p) => p > 0);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const priceDeviation = (avgPrice - car.price) / avgPrice;

  // If price is more than 40% below market value, flag as suspicious
  if (priceDeviation > 0.4) {
    await FraudDetection.create({
      target: car.dealer,
      targetType: "user",
      fraudType: "price_manipulation",
      severity: "high",
      evidence: {
        carId,
        carTitle: car.title,
        listedPrice: car.price,
        marketAverage: avgPrice,
        deviation: (priceDeviation * 100).toFixed(1) + "%",
        similarCarsCount: similarCars.length,
      },
      relatedEntities: [carId],
      detectionMethod: "price_anomaly_detection",
      confidenceScore: 70,
    });

    return {
      listedPrice: car.price,
      marketAverage: avgPrice,
      deviation: (priceDeviation * 100).toFixed(1) + "%",
    };
  }

  return null;
};

// =============================
// 👥 ACCOUNT FARMS DETECTION
// =============================

export const detectAccountFarms = async (dealerId) => {
  const dealer = await User.findById(dealerId);
  if (!dealer) return null;

  // Check for multiple accounts from same IP or device
  const accounts = await User.find({
    $or: [{ ipAddress: dealer.ipAddress }, { userAgent: dealer.userAgent }],
    role: "dealer",
    _id: { $ne: dealerId },
  });

  if (accounts.length >= 3) {
    await FraudDetection.create({
      target: dealerId,
      targetType: "user",
      fraudType: "account_farm",
      severity: "critical",
      evidence: {
        relatedAccountsCount: accounts.length,
        relatedAccountIds: accounts.map((a) => a._id),
        ipAddress: dealer.ipAddress,
        userAgent: dealer.userAgent,
      },
      relatedEntities: accounts.map((a) => a._id),
      detectionMethod: "account_farm_detection",
      confidenceScore: 85,
    });

    return accounts;
  }

  return null;
};

// =============================
// 🖼️ DUPLICATE PHOTOS DETECTION
// =============================

export const detectDuplicatePhotos = async (carId) => {
  const car = await Car.findById(carId);
  if (!car || !car.images || car.images.length === 0) return null;

  // Check if same images are used in other listings
  const carsWithSameImages = await Car.find({
    images: { $in: car.images },
    _id: { $ne: carId },
  });

  if (carsWithSameImages.length > 0) {
    await FraudDetection.create({
      target: car.dealer,
      targetType: "user",
      fraudType: "duplicate_photos",
      severity: "high",
      evidence: {
        carId,
        carTitle: car.title,
        duplicateImageCount: car.images.length,
        duplicateCarIds: carsWithSameImages.map((c) => c._id),
        duplicateCarTitles: carsWithSameImages.map((c) => c.title),
      },
      relatedEntities: [carId, ...carsWithSameImages.map((c) => c._id)],
      detectionMethod: "duplicate_photo_detection",
      confidenceScore: 90,
    });

    return carsWithSameImages;
  }

  return null;
};

// =============================
// � COMPREHENSIVE FRAUD CHECK
// =============================

export const runFraudCheck = async (targetId, targetType) => {
  const results = [];

  switch (targetType) {
    case "user":
      results.push(await detectDuplicateAccounts(targetId));
      results.push(await detectRepeatedDisputes(targetId));
      results.push(await detectAccountFarms(targetId));
      break;
    case "car":
      results.push(await detectSelfBidding(targetId));
      results.push(await detectBidRing(targetId));
      results.push(await detectSuspiciousBidSpike(targetId));
      results.push(await detectPriceManipulation(targetId));
      results.push(await detectDuplicatePhotos(targetId));
      break;
    case "escrow":
      results.push(await detectChargeback(targetId));
      break;
    default:
      break;
  }

  return results.filter((r) => r !== null);
};
