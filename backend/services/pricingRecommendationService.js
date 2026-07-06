import Car from "../models/Car.js";

export const getPricingRecommendations = async (carData) => {
  const { brand, model, year, mileage, fuel, transmission, bodyType } = carData;
  if (!brand) return { recommendations: [], marketData: null };

  const match = { brand, price: { $gt: 0, $lt: 50000000 } };
  if (model) match.model = model;
  if (year) match.year = { $gte: year - 3, $lte: year + 3 };
  if (fuel) match.fuel = fuel;
  if (bodyType) match.bodyType = bodyType;

  const similar = await Car.find(match)
    .select("price year mileage title")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  if (similar.length < 2) {
    const broader = await Car.find({ brand, price: { $gt: 0, $lt: 50000000 } })
      .select("price year mileage title")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    if (broader.length < 2) return { recommendations: [], marketData: null };
    return computePricing(carData, broader);
  }

  return computePricing(carData, similar);
};

function computePricing(carData, similar) {
  const prices = similar.map(c => c.price).sort((a, b) => a - b);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const medianPrice = prices.length % 2 === 0
    ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
    : prices[Math.floor(prices.length / 2)];
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];

  const currentPrice = carData.price || 0;
  let suggestion = null;
  let reason = null;

  if (currentPrice > 0 && similar.length >= 3) {
    if (currentPrice > q3) {
      const suggestedPrice = Math.round(medianPrice * 1.05);
      suggestion = suggestedPrice;
      reason = `Your ${carData.brand} is priced ${Math.round(((currentPrice - medianPrice) / medianPrice) * 100)}% above the market median of KES ${medianPrice.toLocaleString()}. Consider listing at KES ${suggestedPrice.toLocaleString()} — cars priced near market average sell 2x faster.`;
    } else if (currentPrice < q1) {
      suggestion = Math.round(medianPrice * 0.95);
      reason = `Your ${carData.brand} is priced below market range (KES ${q1.toLocaleString()}–${q3.toLocaleString()}). You could potentially increase the price to KES ${suggestion.toLocaleString()}.`;
    } else {
      reason = `Your pricing is competitive — within market range (KES ${q1.toLocaleString()}–${q3.toLocaleString()}).`;
    }
  } else if (currentPrice === 0 && similar.length >= 3) {
    suggestion = medianPrice;
    reason = `Based on ${similar.length} similar ${carData.brand} listings, the median price is KES ${medianPrice.toLocaleString()}.`;
  }

  return {
    recommendations: suggestion ? [{ suggestedPrice: suggestion, reason }] : [],
    marketData: {
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      sampleSize: similar.length,
      priceRange: { low: q1, high: q3 },
    },
  };
}
