import VALUATION_COEFFICIENTS, { ROUNDING } from "../config/valuation.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, findById, findOne, create, update } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

const { priceEstimator: PE, marketPosition: MP, vehicleValuation: VV, aiPricing: AP } = VALUATION_COEFFICIENTS;

export const estimatePrice = async (car) => {
  const similar = await findAll("cars", { filters: { brand: car.brand, model: car.model, year: { $gte: car.year - 1, $lte: car.year + 1 } }, select: "price" });
  if (!similar.length) return null;
  const avg = similar.reduce((sum, c) => sum + c.price, 0) / similar.length;
  let rating = "fair";
  if (car.price < avg * PE.greatThreshold) rating = "great";
  else if (car.price < avg * PE.goodThreshold) rating = "good";
  else if (car.price > avg * PE.overpricedThreshold) rating = "overpriced";
  return { avgMarketPrice: ROUNDING.price(avg), dealRating: rating };
};

export const captureListingPrice = async (carId) => {
  try {
    const car = await findById("cars", carId);
    if (!car) { logWarn("Car not found for listing price capture", { carId }); return null; }
    const valuation = await create("vehicle_valuations", {
      car: car.id, vehicle: { brand: car.brand, model: car.model, year: car.year, bodyType: car.bodyType, fuelType: car.fuel, transmission: car.transmission, color: car.color, condition: car.condition, mileage: car.mileage },
      location: { city: car.location?.city, county: car.location?.city, coordinates: car.location?.coordinates },
      pricing: { listingPrice: car.price }, source: "listing", valuationDate: new Date().toISOString(),
    });
    logInfo("Listing price captured", { carId, price: car.price });
    return valuation;
  } catch (err) { logError("Failed to capture listing price", err); throw err; }
};

export const captureAuctionPrice = async (auctionId) => {
  try {
    const auction = await findById("auctions", auctionId);
    if (!auction) { logWarn("Auction not found", { auctionId }); return null; }
    if (auction.status !== "completed" || !auction.winner) { logWarn("Auction not completed", { auctionId }); return null; }
    const car = auction.carId ? await findById("cars", auction.carId) : null;
    if (!car) { logWarn("Car not found for auction", { auctionId }); return null; }
    const priceDiff = (auction.winner.bid || 0) - (car.price || 0);
    const valuation = await create("vehicle_valuations", {
      car: car.id, vehicle: { brand: car.brand, model: car.model, year: car.year, bodyType: car.bodyType, fuelType: car.fuel, transmission: car.transmission, color: car.color, condition: car.condition, mileage: car.mileage },
      location: { city: car.location?.city, county: car.location?.city, coordinates: car.location?.coordinates },
      pricing: { listingPrice: car.price, auctionPrice: auction.winner.bid, salePrice: auction.winner.bid },
      priceDifference: priceDiff, priceDifferencePercent: car.price > 0 ? (priceDiff / car.price) * 100 : 0,
      source: "auction", valuationDate: new Date().toISOString(), saleDate: new Date().toISOString(),
    });
    logInfo("Auction price captured", { auctionId, price: auction.winner.bid });
    return valuation;
  } catch (err) { logError("Failed to capture auction price", err); throw err; }
};

export const captureEscrowPrice = async (escrowId) => {
  try {
    const escrow = await findById("escrows", escrowId);
    if (!escrow) { logWarn("Escrow not found", { escrowId }); return null; }
    if (escrow.status !== "released") { logWarn("Escrow not released", { escrowId }); return null; }
    const car = escrow.car ? await findById("cars", escrow.car) : null;
    if (!car) { logWarn("Car not found for escrow", { escrowId }); return null; }
    const priceDiff = (escrow.amount || 0) - (car.price || 0);
    const valuation = await create("vehicle_valuations", {
      car: car.id, vehicle: { brand: car.brand, model: car.model, year: car.year, bodyType: car.bodyType, fuelType: car.fuel, transmission: car.transmission, color: car.color, condition: car.condition, mileage: car.mileage },
      location: { city: car.location?.city, county: car.location?.city, coordinates: car.location?.coordinates },
      pricing: { listingPrice: car.price, escrowPrice: escrow.amount, salePrice: escrow.amount },
      priceDifference: priceDiff, priceDifferencePercent: car.price > 0 ? (priceDiff / car.price) * 100 : 0,
      source: "escrow", valuationDate: new Date().toISOString(), saleDate: escrow.releasedAt,
    });
    logInfo("Escrow price captured", { escrowId, price: escrow.amount });
    return valuation;
  } catch (err) { logError("Failed to capture escrow price", err); throw err; }
};

export const calculateVehicleValue = async (carId) => {
  try {
    const car = await findById("cars", carId);
    if (!car) { logWarn("Car not found for valuation", { carId }); return null; }

    const [marketPricingArr, brandDepreciationArr, mileageImpactArr, demandSignalsArr] = await Promise.all([
      findAll("market_pricings", { filters: { county: car.location?.city, "vehicle.brand": car.brand }, orderBy: "createdAt", ascending: false, limit: 1 }),
      findAll("brand_depreciations", { filters: { brand: car.brand }, limit: 1 }),
      findAll("mileage_impacts", { filters: { "vehicle.brand": car.brand, "vehicle.bodyType": car.bodyType }, limit: 1 }),
      findAll("demand_signals", { filters: { "search.filters.brand": car.brand, "search.county": car.location?.city }, orderBy: "createdAt", ascending: false, limit: 1 }),
    ]);

    const marketPricing = marketPricingArr[0] || null;
    const brandDepreciation = brandDepreciationArr[0] || null;
    const mileageImpact = mileageImpactArr[0] || null;
    const demandSignals = demandSignalsArr[0] || null;

    let estimatedValue = car.price;
    if (marketPricing?.pricing?.averagePrice > 0) estimatedValue += (marketPricing.pricing.averagePrice - car.price) * VV.marketAdjustmentWeight;
    if (brandDepreciation?.depreciation?.annualRate > 0) { const carAge = new Date().getFullYear() - car.year; estimatedValue *= Math.pow(1 - brandDepreciation.depreciation.annualRate, carAge); }
    if (mileageImpact?.impact?.pricePer1000Miles && car.mileage > 0) { const mileageDep = mileageImpact.impact.pricePer1000Miles * (car.mileage / 1000); estimatedValue -= Math.min(mileageDep, car.price * VV.maxMileageDepreciation); }
    if (demandSignals?.priceImpact?.demandMultiplier > 0) estimatedValue *= demandSignals.priceImpact.demandMultiplier;
    estimatedValue = Math.max(estimatedValue, car.price * VV.minValueFloor);

    let confidence = 0;
    if (marketPricing) confidence += VV.confidenceWeights.marketPricing;
    if (brandDepreciation) confidence += VV.confidenceWeights.brandDepreciation;
    if (mileageImpact) confidence += VV.confidenceWeights.mileageImpact;
    if (demandSignals) confidence += VV.confidenceWeights.demandSignals;
    if (car.mileage > 0) confidence += VV.confidenceWeights.mileage;
    const priceRange = estimatedValue * VV.priceRangePercent;

    return {
      carId, vehicle: { brand: car.brand, model: car.model, year: car.year, mileage: car.mileage },
      valuation: { estimatedValue: ROUNDING.price(estimatedValue), confidence: Math.min(confidence, 1), priceRange: { low: ROUNDING.price(estimatedValue - priceRange), high: ROUNDING.price(estimatedValue + priceRange) } },
      marketData: { averagePrice: ROUNDING.price(marketPricing?.pricing?.averagePrice || 0), demandScore: demandSignals?.demand?.urgencyScore || 0 },
      factors: { marketAdjustment: ROUNDING.price(marketPricing ? (marketPricing.pricing.averagePrice - car.price) * VV.marketAdjustmentWeight : 0), depreciation: brandDepreciation?.depreciation?.annualRate || 0, mileageImpact: ROUNDING.price(mileageImpact ? mileageImpact.impact.pricePer1000Miles * (car.mileage / 1000) : 0), demandMultiplier: demandSignals?.priceImpact?.demandMultiplier || 1 },
    };
  } catch (err) { logError("Failed to calculate vehicle value", err); throw err; }
};

export const getMarketPosition = async (carId) => {
  try {
    const car = await findById("cars", carId);
    if (!car) return null;
    const mpArr = await findAll("market_pricings", { filters: { county: car.location?.city, "vehicle.brand": car.brand }, orderBy: "createdAt", ascending: false, limit: 1 });
    const marketPricing = mpArr[0] || null;
    if (!marketPricing || !marketPricing.pricing?.averagePrice) return null;
    const pctDiff = ((car.price - marketPricing.pricing.averagePrice) / marketPricing.pricing.averagePrice) * 100;
    let position;
    if (pctDiff < MP.belowThreshold) position = "below_market";
    else if (pctDiff > MP.aboveThreshold) position = "above_market";
    else position = "fair_market";
    return { position, percent: ROUNDING.percent(Math.abs(pctDiff)), marketAverage: ROUNDING.price(marketPricing.pricing.averagePrice), listingPrice: car.price };
  } catch (err) { logError("Failed to get market position", err); throw err; }
};

export const getHistoricalPrices = async (carId) => {
  try {
    const valuations = await findAll("vehicle_valuations", { filters: { car: carId }, orderBy: "valuationDate", ascending: false });
    return valuations.map((v) => ({ price: v.pricing?.salePrice || v.pricing?.listingPrice, date: v.valuationDate, source: v.source }));
  } catch (err) { logError("Failed to get historical prices", err); throw err; }
};

export const updateValuation = async (carId) => {
  try {
    const valuation = await calculateVehicleValue(carId);
    if (!valuation) return null;
    const existing = await findOne("vehicle_valuations", { car: carId });
    if (existing) {
      return update("vehicle_valuations", existing.id, { valuation: valuation.valuation, market: valuation.marketData, valuationDate: new Date().toISOString() });
    }
    const car = await findById("cars", carId);
    return create("vehicle_valuations", {
      car: carId, vehicle: { brand: car.brand, model: car.model, year: car.year, bodyType: car.bodyType, fuelType: car.fuel, transmission: car.transmission, color: car.color, condition: car.condition, mileage: car.mileage },
      location: { city: car.location?.city, county: car.location?.city, coordinates: car.location?.coordinates },
      pricing: { listingPrice: car.price }, valuation: valuation.valuation, market: valuation.marketData, source: "listing", valuationDate: new Date().toISOString(),
    });
  } catch (err) { logError("Failed to update valuation", err); throw err; }
};

export const getCountyPricing = async (county, filters = {}) => {
  const mpArr = await findAll("market_pricings", { filters: { county, ...filters }, orderBy: "createdAt", ascending: false, limit: 1 });
  const mp = mpArr[0] || null;
  return mp ? { county, pricing: mp.pricing, metrics: mp.metrics, trend: mp.trend } : null;
};

export const getBrandDepreciation = async (brand) => {
  const bdArr = await findAll("brand_depreciations", { filters: { brand }, limit: 1 });
  const bd = bdArr[0] || null;
  return bd ? { brand, depreciation: bd.depreciation, market: bd.market } : null;
};

export const getMileageImpact = async (filters = {}) => {
  const miArr = await findAll("mileage_impacts", { filters, limit: 1 });
  const mi = miArr[0] || null;
  return mi ? { vehicle: filters.vehicle || {}, mileageRanges: mi.mileageRanges, impact: mi.impact } : null;
};

export const getDemandSignals = async (filters = {}) => {
  const dsArr = await findAll("demand_signals", { filters, orderBy: "createdAt", ascending: false, limit: 1 });
  const ds = dsArr[0] || null;
  return ds ? { search: ds.search, demand: ds.demand, priceImpact: ds.priceImpact } : null;
};

export const getSimilarCars = async (car, options = {}) => {
  const yearRange = options.yearRange || 2;
  return findAll("cars", { filters: { brand: car.brand, model: car.model, year: { $gte: car.year - yearRange, $lte: car.year + yearRange }, status: "available" }, limit: options.limit || 20 });
};

export const calculateMarketAverage = (cars) => {
  return cars.length ? ROUNDING.price(cars.reduce((s, c) => s + c.price, 0) / cars.length) : 0;
};

export const calculateConditionAdjustment = (condition) => AP.conditionScores[condition?.toLowerCase()] || 1.0;

export const calculateMileageAdjustment = (car) => {
  if (!car.mileage) return 1.0;
  const carAge = new Date().getFullYear() - car.year;
  const expected = carAge * AP.mileage.annualKm;
  if (car.mileage < expected * AP.mileage.lowThreshold) return AP.mileage.lowMultiplier;
  if (car.mileage < expected * AP.mileage.belowAvgThreshold) return AP.mileage.belowAvgMultiplier;
  if (car.mileage < expected * AP.mileage.aboveAvgThreshold) return 1.0;
  if (car.mileage < expected * AP.mileage.highThreshold) return AP.mileage.aboveAvgMultiplier;
  return AP.mileage.highMultiplier;
};

export const calculateYearAdjustment = (year) => {
  const carAge = new Date().getFullYear() - year;
  if (carAge <= AP.yearAdjustment.newMaxAge) return AP.yearAdjustment.newMultiplier;
  if (carAge <= AP.yearAdjustment.recentMaxAge) return AP.yearAdjustment.recentMultiplier;
  if (carAge <= AP.yearAdjustment.avgMaxAge) return AP.yearAdjustment.avgMultiplier;
  if (carAge <= AP.yearAdjustment.oldMaxAge) return AP.yearAdjustment.oldMultiplier;
  return AP.yearAdjustment.vintageMultiplier;
};

export const recommendPrice = async (carId) => {
  try {
    const car = await findById("cars", carId);
    if (!car) throw new Error("Car not found");
    const similarCars = await getSimilarCars(car);
    const marketAverage = calculateMarketAverage(similarCars);
    if (marketAverage === 0) return { carId, currentPrice: car.price, recommendedPrice: car.price, priceRange: { lower: ROUNDING.price(car.price * 0.9), upper: ROUNDING.price(car.price * 1.1) }, marketAverage: 0, adjustments: {}, similarCars: [], recommendations: [{ priority: "low", type: "maintain", message: "No market data available", suggestedPrice: car.price }] };

    const adjustments = { condition: calculateConditionAdjustment(car.condition), mileage: calculateMileageAdjustment(car), year: calculateYearAdjustment(car.year), location: 1.0, demand: 1.0 };
    const { weights } = AP;
    const recommendedPrice = ROUNDING.price(marketAverage * (adjustments.condition * weights.condition + adjustments.mileage * weights.mileage + adjustments.year * weights.year + adjustments.location * weights.location + adjustments.demand * weights.demand + weights.marketAverage));
    const priceRange = { lower: ROUNDING.price(recommendedPrice * (1 - AP.priceRangePercent)), upper: ROUNDING.price(recommendedPrice * (1 + AP.priceRangePercent)) };
    const priceDiff = ((recommendedPrice - car.price) / car.price) * 100;
    const recs = [];
    if (priceDiff > AP.recommendThreshold) recs.push({ priority: "high", type: "increase", message: `Consider increasing price by ${ROUNDING.price(priceDiff)}% to match market`, suggestedPrice: recommendedPrice });
    else if (priceDiff < -AP.recommendThreshold) recs.push({ priority: "high", type: "decrease", message: `Consider decreasing price by ${ROUNDING.price(Math.abs(priceDiff))}% to match market`, suggestedPrice: recommendedPrice });
    else recs.push({ priority: "low", type: "maintain", message: "Price within market range", suggestedPrice: car.price });
    if (car.mileage > 100000) recs.push({ priority: "medium", type: "mileage", message: "High mileage may affect sale price" });
    if (car.year < 2015) recs.push({ priority: "medium", type: "age", message: "Older vehicle may require competitive pricing" });
    return { carId, currentPrice: car.price, recommendedPrice, priceRange, marketAverage, adjustments, similarCars: similarCars.slice(0, 5), recommendations: recs };
  } catch (error) { logError("Failed to recommend price", { error: error.message }); throw error; }
};

export const batchRecommendPrices = async (carIds) => Promise.allSettled(carIds.map(async (id) => { try { return await recommendPrice(id); } catch (e) { logError("Batch price failed", { carId: id, error: e.message }); return null; } }));

export default {
  estimatePrice, captureListingPrice, captureAuctionPrice, captureEscrowPrice,
  calculateVehicleValue, getMarketPosition, getHistoricalPrices, updateValuation,
  getCountyPricing, getBrandDepreciation, getMileageImpact, getDemandSignals,
  getSimilarCars, calculateMarketAverage, calculateConditionAdjustment,
  calculateMileageAdjustment, calculateYearAdjustment, recommendPrice, batchRecommendPrices,
};
