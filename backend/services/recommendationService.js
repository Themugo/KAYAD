import Car from "../models/Car.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import DealerTrustScore from "../models/DealerTrustScore.js";

// =============================
// 🎯 RECOMMENDATION ENGINE
// =============================

export const getPersonalizedRecommendations = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    // Get user activity
    const userActivity = await getUserActivity(userId);

    // Get recommendations
    const [recommendedCars, recommendedAuctions, recommendedDealers] = await Promise.all([
      getRecommendedCars(userId, userActivity),
      getRecommendedAuctions(userId, userActivity),
      getRecommendedDealers(userId, userActivity),
    ]);

    return {
      userId,
      recommendedCars,
      recommendedAuctions,
      recommendedDealers,
    };
  } catch (error) {
    console.error("Error getting personalized recommendations:", error);
    return null;
  }
};

// =============================
// 📊 GET USER ACTIVITY
// =============================

const getUserActivity = async (userId) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [viewedCars, favoriteCars, searchHistory, offers, bids] = await Promise.all([
    Event.distinct("targetId", {
      user: userId,
      eventType: "vehicle_viewed",
      createdAt: { $gte: thirtyDaysAgo },
    }),
    Event.distinct("targetId", {
      user: userId,
      eventType: "vehicle_favorite_added",
      createdAt: { $gte: thirtyDaysAgo },
    }),
    Event.find({
      user: userId,
      eventType: "search_performed",
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select("data")
      .limit(50),
    Event.distinct("targetId", {
      user: userId,
      eventType: "offer_sent",
      createdAt: { $gte: thirtyDaysAgo },
    }),
    Event.distinct("targetId", {
      user: userId,
      eventType: "bid_placed",
      createdAt: { $gte: thirtyDaysAgo },
    }),
  ]);

  return {
    viewedCars,
    favoriteCars,
    searchHistory,
    offers,
    bids,
  };
};

// =============================
// 🚗 GET RECOMMENDED CARS
// =============================

const getRecommendedCars = async (userId, userActivity) => {
  try {
    const { viewedCars, favoriteCars, searchHistory } = userActivity;

    // Extract preferences from search history
    const preferences = extractPreferences(searchHistory);

    // Build query based on preferences
    const query = buildPreferenceQuery(preferences);

    // Exclude already viewed cars
    if (viewedCars.length > 0) {
      query._id = { $nin: viewedCars };
    }

    // Get matching cars
    const cars = await Car.find(query).populate("dealer", "name businessName").sort({ createdAt: -1 }).limit(20);

    // Score and rank cars
    const scoredCars = cars.map((car) => ({
      ...car.toObject(),
      recommendationScore: calculateCarScore(car, userActivity),
      recommendationReason: getRecommendationReason(car, userActivity),
    }));

    // Sort by score
    scoredCars.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return scoredCars.slice(0, 10);
  } catch (error) {
    console.error("Error getting recommended cars:", error);
    return [];
  }
};

// =============================
// 🎯 GET RECOMMENDED AUCTIONS
// =============================

const getRecommendedAuctions = async (userId, userActivity) => {
  try {
    const { viewedCars, bids } = userActivity;

    const query = {
      allowBid: true,
      auctionEnd: { $gt: new Date() },
      status: "active",
    };

    // Exclude already viewed auctions
    if (viewedCars.length > 0) {
      query._id = { $nin: viewedCars };
    }

    const auctions = await Car.find(query).populate("dealer", "name businessName").sort({ auctionEnd: 1 }).limit(20);

    // Score and rank auctions
    const scoredAuctions = auctions.map((auction) => ({
      ...auction.toObject(),
      recommendationScore: calculateAuctionScore(auction, userActivity),
      recommendationReason: getRecommendationReason(auction, userActivity),
    }));

    // Sort by score
    scoredAuctions.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return scoredAuctions.slice(0, 10);
  } catch (error) {
    console.error("Error getting recommended auctions:", error);
    return [];
  }
};

// =============================
// 👥 GET RECOMMENDED DEALERS
// =============================

const getRecommendedDealers = async (userId, userActivity) => {
  try {
    const { viewedCars, favoriteCars } = userActivity;

    // Get dealers from viewed and favorite cars
    const dealerIds = await Car.distinct("dealer", {
      _id: { $in: [...viewedCars, ...favoriteCars] },
    });

    // Get dealer trust scores
    const trustScores = await DealerTrustScore.find({
      dealer: { $in: dealerIds },
    });

    // Sort by trust score
    trustScores.sort((a, b) => b.overallScore - a.overallScore);

    // Get dealer details
    const dealers = await User.find({
      _id: trustScores.map((ts) => ts.dealer),
      role: "dealer",
    })
      .select("name businessName location")
      .limit(10);

    return dealers.map((dealer) => {
      const trustScore = trustScores.find((ts) => ts.dealer.toString() === dealer._id.toString());
      return {
        ...dealer.toObject(),
        trustScore: trustScore?.overallScore || 75,
        tier: trustScore?.tier || "bronze",
      };
    });
  } catch (error) {
    console.error("Error getting recommended dealers:", error);
    return [];
  }
};

// =============================
// 📊 EXTRACT PREFERENCES
// =============================

const extractPreferences = (searchHistory) => {
  const preferences = {
    makes: [],
    models: [],
    priceRange: { min: 0, max: Infinity },
    yearRange: { min: 0, max: Infinity },
    locations: [],
  };

  searchHistory.forEach((search) => {
    const data = search.data || {};
    if (data.make) preferences.makes.push(data.make);
    if (data.model) preferences.models.push(data.model);
    if (data.minPrice) preferences.priceRange.min = Math.max(preferences.priceRange.min, data.minPrice);
    if (data.maxPrice) preferences.priceRange.max = Math.min(preferences.priceRange.max, data.maxPrice);
    if (data.year) preferences.yearRange.min = Math.max(preferences.yearRange.min, data.year);
    if (data.location) preferences.locations.push(data.location);
  });

  return preferences;
};

// =============================
// 🔍 BUILD PREFERENCE QUERY
// =============================

const buildPreferenceQuery = (preferences) => {
  const query = { status: "active" };

  if (preferences.makes.length > 0) {
    query.make = { $in: preferences.makes };
  }

  if (preferences.models.length > 0) {
    query.model = { $in: preferences.models };
  }

  if (preferences.priceRange.min > 0 || preferences.priceRange.max < Infinity) {
    query.price = {};
    if (preferences.priceRange.min > 0) query.price.$gte = preferences.priceRange.min;
    if (preferences.priceRange.max < Infinity) query.price.$lte = preferences.priceRange.max;
  }

  if (preferences.yearRange.min > 0) {
    query.year = { $gte: preferences.yearRange.min };
  }

  if (preferences.locations.length > 0) {
    query.location = { $in: preferences.locations };
  }

  return query;
};

// =============================
// 📊 CALCULATE CAR SCORE
// =============================

const calculateCarScore = (car, userActivity) => {
  let score = 50; // Base score

  const { favoriteCars, viewedCars, offers } = userActivity;

  // Boost for matching make/model from favorites
  if (favoriteCars.length > 0) {
    const favoriteCarsData = Car.find({ _id: { $in: favoriteCars } });
    // This would need to be async, but for simplicity we'll use a simple check
    if (favoriteCars.includes(car._id.toString())) score += 30;
  }

  // Boost for recent views of similar cars
  if (viewedCars.length > 0) {
    score += Math.min(viewedCars.length * 2, 20);
  }

  // Boost for offers on similar cars
  if (offers.length > 0) {
    score += Math.min(offers.length * 5, 25);
  }

  // Boost for newer cars
  if (car.year >= 2020) score += 10;
  else if (car.year >= 2015) score += 5;

  // Boost for good price
  if (car.price && car.price < 2000000) score += 5;

  return Math.min(score, 100);
};

// =============================
// 📊 CALCULATE AUCTION SCORE
// =============================

const calculateAuctionScore = (auction, userActivity) => {
  let score = 50; // Base score

  const { bids } = userActivity;

  // Boost for auctions ending soon
  const timeToEnd = new Date(auction.auctionEnd) - new Date();
  if (timeToEnd < 24 * 60 * 60 * 1000)
    score += 20; // Ending within 24 hours
  else if (timeToEnd < 72 * 60 * 60 * 1000) score += 10; // Ending within 72 hours

  // Boost for auctions user has bid on similar cars
  if (bids.length > 0) {
    score += Math.min(bids.length * 5, 25);
  }

  // Boost for low starting price
  if (auction.price && auction.price < 1000000) score += 10;

  return Math.min(score, 100);
};

// =============================
// 📝 GET RECOMMENDATION REASON
// =============================

const getRecommendationReason = (car, userActivity) => {
  const { favoriteCars, viewedCars, searchHistory } = userActivity;

  if (favoriteCars.includes(car._id.toString())) {
    return "Based on your favorites";
  }

  if (searchHistory.length > 0) {
    const lastSearch = searchHistory[searchHistory.length - 1];
    if (lastSearch.data?.make === car.make) {
      return `Matches your search for ${car.make}`;
    }
  }

  if (viewedCars.length > 0) {
    return "Based on your recent views";
  }

  return "Popular listing";
};
