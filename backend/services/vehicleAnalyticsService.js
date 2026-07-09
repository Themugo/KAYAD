import { logInfo, logError } from "../utils/logger.js";
import { findAll, update, count, upsert } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

export const calculateAverageSellingPrice = async (startDate, endDate) => {
  try {
    const escrows = await findAll("escrows", { filters: { status: "released", releasedAt: { $gte: startDate, $lte: endDate } } });
    const auctionSales = await findAll("auctions", { filters: { status: "completed", endTime: { $gte: startDate, $lte: endDate } } });
    const prices = [];
    escrows.forEach((e) => { if (e.amount) prices.push(e.amount); });
    auctionSales.forEach((a) => { if (a.highestBid) prices.push(a.highestBid); });
    return prices.length === 0 ? 0 : prices.reduce((a, b) => a + b, 0) / prices.length;
  } catch (err) { logError("Failed to calculate average selling price", err); throw err; }
};

export const calculateAverageListingPrice = async (startDate, endDate) => {
  try {
    const cars = await findAll("cars", { filters: { status: "active", createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null } });
    return cars.length === 0 ? 0 : cars.reduce((a, b) => a + (b.price || 0), 0) / cars.length;
  } catch (err) { logError("Failed to calculate average listing price", err); throw err; }
};

export const calculateDaysOnMarket = async (startDate, endDate) => {
  try {
    const soldCars = await findAll("cars", { filters: { status: "sold", updatedAt: { $gte: startDate, $lte: endDate }, deletedAt: null } });
    if (soldCars.length === 0) return { average: 0, median: 0, fastest: 0 };
    const daysOnMarket = soldCars.map((car) => Math.floor((new Date(car.updatedAt) - new Date(car.createdAt)) / 86400000)).sort((a, b) => a - b);
    const sum = daysOnMarket.reduce((a, b) => a + b, 0);
    return { average: sum / daysOnMarket.length, median: daysOnMarket[Math.floor(daysOnMarket.length / 2)], fastest: daysOnMarket[0] };
  } catch (err) { logError("Failed to calculate days on market", err); throw err; }
};

export const getMostViewedVehicles = async (limit = 10, startDate, endDate) => {
  try {
    const cars = await findAll("cars", { filters: { createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null }, orderBy: "views", ascending: false, limit, select: "id,title,views,price" });
    return cars.map((car) => ({ carId: car.id, title: car.title, views: car.views, price: car.price }));
  } catch (err) { logError("Failed to get most viewed vehicles", err); throw err; }
};

export const getMostSearchedVehicles = async (limit = 10, startDate, endDate) => {
  try {
    const searches = await findAll("saved_searches", { filters: { createdAt: { $gte: startDate, $lte: endDate } }, select: "filters" });
    const searchCounts = {};
    searches.forEach((search) => { const key = JSON.stringify(search.filters); searchCounts[key] = (searchCounts[key] || 0) + 1; });
    return Object.entries(searchCounts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([filters, count]) => ({ filters: JSON.parse(filters), count }));
  } catch (err) { logError("Failed to get most searched vehicles", err); throw err; }
};

export const getFastestSellingVehicles = async (limit = 10, startDate, endDate) => {
  try {
    const soldCars = await findAll("cars", { filters: { status: "sold", updatedAt: { $gte: startDate, $lte: endDate }, deletedAt: null }, select: "id,title,createdAt,updatedAt,price" });
    return soldCars.map((car) => ({ carId: car.id, title: car.title, daysOnMarket: Math.floor((new Date(car.updatedAt) - new Date(car.createdAt)) / 86400000), sellingPrice: car.price })).sort((a, b) => a.daysOnMarket - b.daysOnMarket).slice(0, limit);
  } catch (err) { logError("Failed to get fastest selling vehicles", err); throw err; }
};

export const getCountyTrends = async (startDate, endDate) => {
  try {
    const cars = await findAll("cars", { filters: { status: { $in: ["active", "sold"] }, createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null }, select: "location,price,status,createdAt,updatedAt" });
    const countyData = {};
    cars.forEach((car) => {
      const county = car.location?.city || "Unknown";
      if (!countyData[county]) countyData[county] = { county, totalPrice: 0, volume: 0, totalDaysOnMarket: 0, soldCount: 0 };
      countyData[county].totalPrice += car.price || 0;
      countyData[county].volume += 1;
      if (car.status === "sold") {
        countyData[county].totalDaysOnMarket += Math.floor((new Date(car.updatedAt) - new Date(car.createdAt)) / 86400000);
        countyData[county].soldCount += 1;
      }
    });
    return Object.values(countyData).map((data) => ({ county: data.county, averagePrice: data.volume > 0 ? data.totalPrice / data.volume : 0, volume: data.volume, daysOnMarket: data.soldCount > 0 ? data.totalDaysOnMarket / data.soldCount : 0 }));
  } catch (err) { logError("Failed to get county trends", err); throw err; }
};

export const getBrandTrends = async (startDate, endDate) => {
  try {
    const cars = await findAll("cars", { filters: { status: { $in: ["active", "sold"] }, createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null }, select: "brand,price,status,createdAt,updatedAt" });
    const totalVolume = cars.length;
    const brandData = {};
    cars.forEach((car) => {
      const brand = car.brand || "Unknown";
      if (!brandData[brand]) brandData[brand] = { brand, totalPrice: 0, volume: 0, totalDaysOnMarket: 0, soldCount: 0 };
      brandData[brand].totalPrice += car.price || 0;
      brandData[brand].volume += 1;
      if (car.status === "sold") {
        brandData[brand].totalDaysOnMarket += Math.floor((new Date(car.updatedAt) - new Date(car.createdAt)) / 86400000);
        brandData[brand].soldCount += 1;
      }
    });
    return Object.values(brandData).map((data) => ({ brand: data.brand, averagePrice: data.volume > 0 ? data.totalPrice / data.volume : 0, volume: data.volume, daysOnMarket: data.soldCount > 0 ? data.totalDaysOnMarket / data.soldCount : 0, marketShare: totalVolume > 0 ? (data.volume / totalVolume) * 100 : 0 }));
  } catch (err) { logError("Failed to get brand trends", err); throw err; }
};

export const getModelTrends = async (startDate, endDate) => {
  try {
    const cars = await findAll("cars", { filters: { status: { $in: ["active", "sold"] }, createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null }, select: "brand,model,price,status,createdAt,updatedAt" });
    const modelData = {};
    cars.forEach((car) => {
      const key = `${car.brand || "Unknown"}-${car.model || "Unknown"}`;
      if (!modelData[key]) modelData[key] = { brand: car.brand || "Unknown", model: car.model || "Unknown", totalPrice: 0, volume: 0, totalDaysOnMarket: 0, soldCount: 0 };
      modelData[key].totalPrice += car.price || 0;
      modelData[key].volume += 1;
      if (car.status === "sold") {
        modelData[key].totalDaysOnMarket += Math.floor((new Date(car.updatedAt) - new Date(car.createdAt)) / 86400000);
        modelData[key].soldCount += 1;
      }
    });
    return Object.values(modelData).map((data) => ({ brand: data.brand, model: data.model, averagePrice: data.volume > 0 ? data.totalPrice / data.volume : 0, volume: data.volume, daysOnMarket: data.soldCount > 0 ? data.totalDaysOnMarket / data.soldCount : 0 }));
  } catch (err) { logError("Failed to get model trends", err); throw err; }
};

export const getSpecTrends = async (startDate, endDate) => {
  try {
    const cars = await findAll("cars", { filters: { status: { $in: ["active", "sold"] }, createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null }, select: "fuel,transmission,bodyType,price" });
    const fuelData = {}, transmissionData = {}, bodyTypeData = {};
    cars.forEach((car) => {
      if (car.fuel) { if (!fuelData[car.fuel]) fuelData[car.fuel] = { type: car.fuel, totalPrice: 0, volume: 0 }; fuelData[car.fuel].totalPrice += car.price || 0; fuelData[car.fuel].volume += 1; }
      if (car.transmission) { if (!transmissionData[car.transmission]) transmissionData[car.transmission] = { type: car.transmission, totalPrice: 0, volume: 0 }; transmissionData[car.transmission].totalPrice += car.price || 0; transmissionData[car.transmission].volume += 1; }
      if (car.bodyType) { if (!bodyTypeData[car.bodyType]) bodyTypeData[car.bodyType] = { type: car.bodyType, totalPrice: 0, volume: 0 }; bodyTypeData[car.bodyType].totalPrice += car.price || 0; bodyTypeData[car.bodyType].volume += 1; }
    });
    const toArr = (obj) => Object.values(obj).map((d) => ({ type: d.type, averagePrice: d.volume > 0 ? d.totalPrice / d.volume : 0, volume: d.volume }));
    return { fuelTypeTrends: toArr(fuelData), transmissionTrends: toArr(transmissionData), bodyTypeTrends: toArr(bodyTypeData) };
  } catch (err) { logError("Failed to get spec trends", err); throw err; }
};

export const getPriceTrend = async (startDate, endDate) => {
  try {
    const analytics = await findAll("vehicle_market_analytics", { filters: { startDate: { $gte: startDate }, endDate: { $lte: endDate } }, orderBy: "startDate", ascending: true });
    return analytics.map((a) => ({ date: a.startDate, averagePrice: a.averageSellingPrice, volume: a.totalSales }));
  } catch (err) { logError("Failed to get price trend", err); throw err; }
};

export const getVolumeTrend = async (startDate, endDate) => {
  try {
    const analytics = await findAll("vehicle_market_analytics", { filters: { startDate: { $gte: startDate }, endDate: { $lte: endDate } }, orderBy: "startDate", ascending: true });
    return analytics.map((a) => ({ date: a.startDate, listings: a.totalListings, sales: a.totalSales }));
  } catch (err) { logError("Failed to get volume trend", err); throw err; }
};

export const generateMarketAnalytics = async (period, startDate, endDate) => {
  try {
    logInfo("Generating market analytics", { period, startDate, endDate });
    const [averageSellingPrice, averageListingPrice, daysOnMarket, mostViewed, mostSearched, fastestSelling, countyTrends, brandTrends, modelTrends, specTrends] = await Promise.all([
      calculateAverageSellingPrice(startDate, endDate), calculateAverageListingPrice(startDate, endDate),
      calculateDaysOnMarket(startDate, endDate), getMostViewedVehicles(10, startDate, endDate),
      getMostSearchedVehicles(10, startDate, endDate), getFastestSellingVehicles(10, startDate, endDate),
      getCountyTrends(startDate, endDate), getBrandTrends(startDate, endDate),
      getModelTrends(startDate, endDate), getSpecTrends(startDate, endDate),
    ]);

    const cars = await findAll("cars", { filters: { status: { $in: ["active", "sold"] }, createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null }, select: "price" });
    const prices = cars.map((c) => c.price).filter((p) => p > 0).sort((a, b) => a - b);
    const priceRange = { min: prices[0] || 0, max: prices[prices.length - 1] || 0, median: prices[Math.floor(prices.length / 2)] || 0 };

    const [totalListings, totalSales, totalAuctions] = await Promise.all([
      count("cars", { status: "active", createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null }),
      count("cars", { status: "sold", updatedAt: { $gte: startDate, $lte: endDate }, deletedAt: null }),
      count("auctions", { status: "completed", endTime: { $gte: startDate, $lte: endDate } }),
    ]);

    const conversionRate = totalListings > 0 ? (totalSales / totalListings) * 100 : 0;

    const analyticsData = { averageSellingPrice, averageListingPrice, priceRange, averageDaysOnMarket: daysOnMarket.average, medianDaysOnMarket: daysOnMarket.median, fastestSaleDays: daysOnMarket.fastest, totalListings, totalSales, totalAuctions, conversionRate, mostViewed, fastestSelling, topSearches: mostSearched, countyTrends, brandTrends, modelTrends, fuelTypeTrends: specTrends.fuelTypeTrends, transmissionTrends: specTrends.transmissionTrends, bodyTypeTrends: specTrends.bodyTypeTrends };

    const existing = await getSupabase().from("vehicle_market_analytics").select("id").eq("period", period).eq("startDate", startDate).eq("endDate", endDate).single();
    let analytics;
    if (existing.data) {
      const { data } = await getSupabase().from("vehicle_market_analytics").update(analyticsData).eq("id", existing.data.id).select().single();
      analytics = data;
    } else {
      const { data } = await getSupabase().from("vehicle_market_analytics").insert({ period, startDate, endDate, ...analyticsData }).select().single();
      analytics = data;
    }

    logInfo("Market analytics generated", { period, startDate, endDate, analyticsId: analytics?.id });
    return analytics;
  } catch (err) { logError("Failed to generate market analytics", err); throw err; }
};

export default {
  calculateAverageSellingPrice, calculateAverageListingPrice, calculateDaysOnMarket,
  getMostViewedVehicles, getMostSearchedVehicles, getFastestSellingVehicles,
  getCountyTrends, getBrandTrends, getModelTrends, getSpecTrends,
  getPriceTrend, getVolumeTrend, generateMarketAnalytics,
};
