import { findAll, findById } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

export const getPersonalizedRecommendations = async (userId) => {
  try {
    const user = await findById("users", userId);
    if (!user) return null;
    const userActivity = await getUserActivity(userId);
    const [recommendedCars, recommendedAuctions, recommendedDealers] = await Promise.all([
      getRecommendedCars(userId, userActivity),
      getRecommendedAuctions(userId, userActivity),
      getRecommendedDealers(userId, userActivity),
    ]);
    return { userId, recommendedCars, recommendedAuctions, recommendedDealers };
  } catch (error) { console.error("Error getting personalized recommendations:", error); return null; }
};

const getUserActivity = async (userId) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const [viewedData, favData, searchData, offerData, bidData] = await Promise.all([
    getSupabase().from("events").select("targetId").eq("user", userId).eq("eventType", "car_viewed"),
    getSupabase().from("events").select("targetId").eq("user", userId).eq("eventType", "car_favorited"),
    getSupabase().from("events").select("data").eq("user", userId).eq("eventType", "search_performed").gte("createdAt", thirtyDaysAgo).limit(50),
    getSupabase().from("events").select("targetId").eq("user", userId).eq("eventType", "offer_made"),
    getSupabase().from("events").select("targetId").eq("user", userId).eq("eventType", "bid_placed"),
  ]);
  return {
    viewedCars: (viewedData.data || []).map(r => r.targetId),
    favoriteCars: (favData.data || []).map(r => r.targetId),
    searchHistory: searchData.data || [],
    offers: (offerData.data || []).map(r => r.targetId),
    bids: (bidData.data || []).map(r => r.targetId),
  };
};

const getRecommendedCars = async (userId, userActivity) => {
  try {
    const { viewedCars, favoriteCars, searchHistory } = userActivity;
    const preferences = extractPreferences(searchHistory);
    const query = buildPreferenceQuery(preferences);
    const cars = await findAll("cars", { filters: query, orderBy: "createdAt", ascending: false, limit: 20 });
    const scoredCars = cars.map((car) => ({ ...car, recommendationScore: calculateCarScore(car, userActivity), recommendationReason: getRecommendationReason(car, userActivity) }));
    scoredCars.sort((a, b) => b.recommendationScore - a.recommendationScore);
    return scoredCars.slice(0, 10);
  } catch (error) { console.error("Error getting recommended cars:", error); return []; }
};

const getRecommendedAuctions = async (userId, userActivity) => {
  try {
    const { viewedCars } = userActivity;
    const query = { allowBid: true, auctionEnd: { $gt: new Date().toISOString() }, status: "active" };
    const auctions = await findAll("cars", { filters: query, orderBy: "auctionEnd", ascending: true, limit: 20 });
    const scoredAuctions = auctions.map((auction) => ({ ...auction, recommendationScore: calculateAuctionScore(auction, userActivity), recommendationReason: getRecommendationReason(auction, userActivity) }));
    scoredAuctions.sort((a, b) => b.recommendationScore - a.recommendationScore);
    return scoredAuctions.slice(0, 10);
  } catch (error) { console.error("Error getting recommended auctions:", error); return []; }
};

const getRecommendedDealers = async (userId, userActivity) => {
  try {
    const { viewedCars, favoriteCars } = userActivity;
    const { data: dealerData } = await getSupabase().from("cars").select("dealer").in("id", [...viewedCars, ...favoriteCars].slice(0, 50));
    const dealerIds = [...new Set((dealerData || []).map(r => r.dealer).filter(Boolean))];
    if (dealerIds.length === 0) return [];
    const trustScores = await findAll("dealer_trust_scores", { filters: { dealer: { $in: dealerIds } } });
    trustScores.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    const topDealerIds = trustScores.slice(0, 10).map(ts => ts.dealer);
    const dealers = await findAll("users", { filters: { id: { $in: topDealerIds }, role: "dealer" }, select: "id,name,businessName,location", limit: 10 });
    return dealers.map((dealer) => {
      const trustScore = trustScores.find((ts) => String(ts.dealer) === String(dealer.id));
      return { ...dealer, trustScore: trustScore?.overallScore || 75, tier: trustScore?.tier || "bronze" };
    });
  } catch (error) { console.error("Error getting recommended dealers:", error); return []; }
};

const extractPreferences = (searchHistory) => {
  const preferences = { makes: [], models: [], priceRange: { min: 0, max: Infinity }, yearRange: { min: 0, max: Infinity }, locations: [] };
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

const buildPreferenceQuery = (preferences) => {
  const query = { status: "active" };
  if (preferences.makes.length > 0) query.make = { $in: preferences.makes };
  if (preferences.models.length > 0) query.model = { $in: preferences.models };
  if (preferences.priceRange.min > 0 || preferences.priceRange.max < Infinity) {
    query.price = {};
    if (preferences.priceRange.min > 0) query.price.$gte = preferences.priceRange.min;
    if (preferences.priceRange.max < Infinity) query.price.$lte = preferences.priceRange.max;
  }
  if (preferences.yearRange.min > 0) query.year = { $gte: preferences.yearRange.min };
  if (preferences.locations.length > 0) query.location = { $in: preferences.locations };
  return query;
};

const calculateCarScore = (car, userActivity) => {
  let score = 50;
  const { favoriteCars, viewedCars, offers } = userActivity;
  if (favoriteCars.length > 0 && favoriteCars.includes(car.id)) score += 30;
  if (viewedCars.length > 0) score += Math.min(viewedCars.length * 2, 20);
  if (offers.length > 0) score += Math.min(offers.length * 5, 25);
  if (car.year >= 2020) score += 10;
  else if (car.year >= 2015) score += 5;
  if (car.price && car.price < 2000000) score += 5;
  return Math.min(score, 100);
};

const calculateAuctionScore = (auction, userActivity) => {
  let score = 50;
  const { bids } = userActivity;
  const timeToEnd = new Date(auction.auctionEnd) - new Date();
  if (timeToEnd < 86400000) score += 20;
  else if (timeToEnd < 259200000) score += 10;
  if (bids.length > 0) score += Math.min(bids.length * 5, 25);
  if (auction.price && auction.price < 1000000) score += 10;
  return Math.min(score, 100);
};

const getRecommendationReason = (car, userActivity) => {
  const { favoriteCars, viewedCars, searchHistory } = userActivity;
  if (favoriteCars.includes(car.id)) return "Based on your favorites";
  if (searchHistory.length > 0) { const lastSearch = searchHistory[searchHistory.length - 1]; if (lastSearch.data?.make === car.make) return `Matches your search for ${car.make}`; }
  if (viewedCars.length > 0) return "Based on your recent views";
  return "Popular listing";
};
