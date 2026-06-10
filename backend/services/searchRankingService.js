import Car from "../models/Car.js";
import DealerTrustScore from "../models/DealerTrustScore.js";
import Event from "../models/Event.js";
import Escrow from "../models/Escrow.js";

// =============================
// 🔍 SEARCH RANKING ENGINE
// =============================

export const calculateSearchRank = async (carId) => {
  try {
    const car = await Car.findById(carId).populate("dealer");
    if (!car) return null;

    // Get dealer trust score
    const dealerTrustScore = await DealerTrustScore.findOne({ dealer: car.dealer._id });
    const dealerScore = dealerTrustScore?.overallScore || 75;

    // Calculate listing quality score
    const listingQuality = calculateListingQuality(car);

    // Calculate freshness score
    const freshnessScore = calculateFreshness(car.createdAt);

    // Get CTR from events
    const ctrScore = await calculateCTR(carId);

    // Get conversion rate from escrows
    const conversionScore = await calculateConversionRate(carId);

    // Calculate final rank score
    const rankScore = (
      dealerScore * 0.30 +           // 30% dealer quality
      listingQuality * 0.25 +        // 25% listing quality
      freshnessScore * 0.20 +         // 20% freshness
      ctrScore * 0.15 +               // 15% CTR
      conversionScore * 0.10          // 10% conversion rate
    );

    return {
      carId,
      rankScore: Math.round(rankScore),
      components: {
        dealerScore,
        listingQuality,
        freshnessScore,
        ctrScore,
        conversionScore,
      },
    };
  } catch (error) {
    console.error("Error calculating search rank:", error);
    return null;
  }
};

// =============================
// 📊 LISTING QUALITY SCORE
// =============================

const calculateListingQuality = (car) => {
  let score = 0;

  // Images (30 points)
  if (car.images && car.images.length > 0) {
    score += Math.min(car.images.length * 5, 30); // Up to 30 points for images
  }

  // Description (20 points)
  if (car.description && car.description.length > 100) {
    score += 20;
  } else if (car.description && car.description.length > 50) {
    score += 10;
  }

  // Price (15 points)
  if (car.price && car.price > 0) {
    score += 15;
  }

  // Year (10 points)
  if (car.year && car.year >= 2015) {
    score += 10;
  } else if (car.year && car.year >= 2010) {
    score += 5;
  }

  // Make and Model (10 points)
  if (car.make && car.model) {
    score += 10;
  }

  // Mileage (10 points)
  if (car.mileage && car.mileage < 100000) {
    score += 10;
  } else if (car.mileage && car.mileage < 150000) {
    score += 5;
  }

  // Condition (5 points)
  if (car.condition) {
    score += 5;
  }

  return Math.min(score, 100);
};

// =============================
// 🕐 FRESHNESS SCORE
// =============================

const calculateFreshness = (createdAt) => {
  const now = new Date();
  const created = new Date(createdAt);
  const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);

  // Newer listings get higher scores
  if (daysSinceCreation <= 1) return 100;
  if (daysSinceCreation <= 3) return 90;
  if (daysSinceCreation <= 7) return 80;
  if (daysSinceCreation <= 14) return 70;
  if (daysSinceCreation <= 30) return 60;
  if (daysSinceCreation <= 60) return 50;
  if (daysSinceCreation <= 90) return 40;
  if (daysSinceCreation <= 180) return 30;
  return 20;
};

// =============================
// 📊 CTR SCORE
// =============================

const calculateCTR = async (carId) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [views, searches] = await Promise.all([
      Event.countDocuments({
        targetType: "car",
        targetId: carId,
        eventType: "vehicle_viewed",
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Event.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    if (views === 0) return 50; // Base score for no views

    // Calculate CTR (views / searches)
    const ctr = searches > 0 ? (views / searches) * 100 : 0;

    // Convert to score (0-100)
    if (ctr >= 10) return 100;
    if (ctr >= 5) return 90;
    if (ctr >= 3) return 80;
    if (ctr >= 2) return 70;
    if (ctr >= 1) return 60;
    if (ctr >= 0.5) return 50;
    return 40;
  } catch (error) {
    console.error("Error calculating CTR:", error);
    return 50;
  }
};

// =============================
// 📊 CONVERSION RATE SCORE
// =============================

const calculateConversionRate = async (carId) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [views, leads, escrows] = await Promise.all([
      Event.countDocuments({
        targetType: "car",
        targetId: carId,
        eventType: "vehicle_viewed",
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Event.countDocuments({
        targetType: "car",
        targetId: carId,
        eventType: "lead_created",
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Escrow.countDocuments({
        car: carId,
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    if (views === 0) return 50; // Base score for no views

    // Calculate conversion rate (escrows / views)
    const conversionRate = (escrows / views) * 100;

    // Convert to score (0-100)
    if (conversionRate >= 20) return 100;
    if (conversionRate >= 15) return 90;
    if (conversionRate >= 10) return 80;
    if (conversionRate >= 5) return 70;
    if (conversionRate >= 3) return 60;
    if (conversionRate >= 1) return 50;
    return 40;
  } catch (error) {
    console.error("Error calculating conversion rate:", error);
    return 50;
  }
};

// =============================
// 🔍 RANK SEARCH RESULTS
// =============================

export const rankSearchResults = async (carIds) => {
  try {
    const ranks = await Promise.all(
      carIds.map(carId => calculateSearchRank(carId))
    );

    // Filter out null results and sort by rank score
    const validRanks = ranks.filter(r => r !== null);
    validRanks.sort((a, b) => b.rankScore - a.rankScore);

    return validRanks.map(r => r.carId);
  } catch (error) {
    console.error("Error ranking search results:", error);
    return carIds; // Return original order if ranking fails
  }
};

// =============================
// 🔍 SEARCH WITH RANKING
// =============================

export const searchWithRanking = async (filters = {}) => {
  try {
    // Build query from filters
    const query = buildSearchQuery(filters);

    // Get matching cars
    const cars = await Car.find(query)
      .populate("dealer", "name businessName")
      .sort({ createdAt: -1 })
      .limit(100);

    // Calculate ranks for each car
    const rankedCars = await Promise.all(
      cars.map(async (car) => {
        const rank = await calculateSearchRank(car._id);
        return {
          ...car.toObject(),
          rankScore: rank?.rankScore || 50,
        };
      })
    );

    // Sort by rank score
    rankedCars.sort((a, b) => b.rankScore - a.rankScore);

    return rankedCars;
  } catch (error) {
    console.error("Error searching with ranking:", error);
    return [];
  }
};

// =============================
// 🔍 BUILD SEARCH QUERY
// =============================

const buildSearchQuery = (filters) => {
  const query = { status: "active" };

  if (filters.make) query.make = filters.make;
  if (filters.model) query.model = filters.model;
  if (filters.year) query.year = { $gte: filters.year };
  if (filters.minPrice) query.price = { $gte: filters.minPrice };
  if (filters.maxPrice) {
    if (query.price) {
      query.price.$lte = filters.maxPrice;
    } else {
      query.price = { $lte: filters.maxPrice };
    }
  }
  if (filters.mileage) query.mileage = { $lte: filters.mileage };
  if (filters.fuelType) query.fuelType = filters.fuelType;
  if (filters.transmission) query.transmission = filters.transmission;
  if (filters.location) query.location = new RegExp(filters.location, "i");

  return query;
};
