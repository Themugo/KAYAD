import Car from "../models/Car.js";

const DEPRECIATION_BY_AGE = [
  { maxAge: 3, factor: 0.85 },
  { maxAge: 7, factor: 0.65 },
  { maxAge: 12, factor: 0.45 },
  { maxAge: Infinity, factor: 0.3 },
];

const BRAND_PREMIUM = {
  toyota: 1.15, mercedes: 1.5, bmw: 1.4, audi: 1.45,
  lexus: 1.6, landrover: 1.55, porsche: 1.8, volkswagen: 1.2,
  nissan: 1.0, mazda: 1.05, subaru: 1.0, honda: 1.1,
  ford: 0.95, mitsubishi: 0.9, suzuki: 0.85, hyundai: 0.9,
  kia: 0.88, peugeot: 0.85, isuzu: 0.95,
};

const MODEL_DEMAND = {
  prado: 95, landcruiser: 98, harrier: 88, cx5: 85,
  xtrail: 78, forester: 80, demio: 82, vitz: 85,
  axio: 75, premio: 80, corolla: 77, civic: 72,
  gle: 70, x5: 73, "c-class": 65, "e-class": 68,
};

function getDepreciationFactor(year) {
  const age = new Date().getFullYear() - year;
  for (const tier of DEPRECIATION_BY_AGE) {
    if (age <= tier.maxAge) return tier.factor;
  }
  return 0.3;
}

function parseModelKey(title, brand) {
  const lower = (title || "").toLowerCase();
  for (const key of Object.keys(MODEL_DEMAND)) {
    if (lower.includes(key)) return key;
  }
  return brand?.toLowerCase() || "generic";
}

export async function getMarketPulse(carId, car) {
  if (!car) {
    car = await Car.findById(carId).lean();
    if (!car) return null;
  }

  const brandKey = (car.brand || "").toLowerCase();
  const brandPremium = BRAND_PREMIUM[brandKey] || 1.0;
  const modelKey = parseModelKey(car.title, car.brand);
  const demandScore = MODEL_DEMAND[modelKey] || 60;

  const similar = await Car.find({
    brand: car.brand,
    model: { $regex: modelKey !== brandKey ? modelKey : "", $options: "i" },
    year: { $gte: car.year - 2, $lte: car.year + 2 },
    _id: { $ne: car._id },
  })
    .select("price year mileage views")
    .limit(30)
    .lean();

  const allPrices = [car.price, ...similar.map((c) => c.price)].filter(Boolean);
  const avgPrice =
    allPrices.reduce((s, p) => s + p, 0) / (allPrices.length || 1);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

  const depFactor = getDepreciationFactor(car.year);
  const mileageImpact = Math.floor((car.mileage || 50000) / 10000) * 25000;
  const fairPriceBase = Math.round(
    avgPrice * brandPremium * depFactor - mileageImpact
  );
  const fairPriceMin = Math.round(fairPriceBase * 0.9);
  const fairPriceMax = Math.round(fairPriceBase * 1.1);

  const priceRatio = car.price / (avgPrice || 1);
  let trend;
  if (priceRatio < 0.85) trend = "undervalued";
  else if (priceRatio > 1.15) trend = "overvalued";
  else trend = "stable";

  const avgViews = similar.length
    ? similar.reduce((s, c) => s + (c.views || 0), 0) / similar.length
    : 0;
  const daysOnMarket = car.createdAt
    ? Math.round(
        (Date.now() - new Date(car.createdAt).getTime()) / 86400000
      )
    : 1;
  const estDaysToSell = Math.max(
    3,
    Math.round(
      45 - demandScore * 0.3 + (car.price / (avgPrice || car.price)) * 15
    )
  );

  return {
    predictiveScore: Math.min(100, Math.round(demandScore * 0.6 + (avgViews > 100 ? 15 : 5) + (priceRatio < 1.1 ? 10 : 0))),
    trend,
    demandScore: Math.min(100, demandScore),
    fairPriceRange: { min: fairPriceMin, max: fairPriceMax, avg: fairPriceBase },
    estDaysToSell,
    daysOnMarket,
    marketAvgPrice: Math.round(avgPrice),
    priceVsMarket: Math.round((priceRatio - 1) * 100),
    brandPremium,
    sampleSize: similar.length,
  };
}

export async function getDealerInsights(dealerId) {
  const cars = await Car.find({
    $or: [{ dealer: dealerId }, { "dealer._id": dealerId }],
  })
    .select("title brand price year mileage views images createdAt status")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  if (!cars.length) {
    return { totalCars: 0, photoScore: "--", recommendations: [], averageScore: 0 };
  }

  const photoScore = Math.min(
    100,
    Math.round(
      cars.reduce((s, c) => {
        const imgCount = (c.images || []).length;
        return s + (imgCount >= 5 ? 95 : imgCount >= 3 ? 75 : imgCount >= 1 ? 50 : 10);
      }, 0) / cars.length
    )
  );

  const recommendations = await Promise.all(
    cars.slice(0, 5).map(async (c) => {
      const pulse = await getMarketPulse(c._id, c);
      const optimalPrice = pulse?.fairPriceRange?.avg || c.price;
      const priceDiff = Math.round(
        ((c.price - optimalPrice) / (optimalPrice || 1)) * 100
      );
      return {
        carId: c._id,
        title: c.title,
        currentPrice: c.price,
        optimalPrice,
        priceDiff,
        photoCount: (c.images || []).length,
        engagementScore: pulse?.predictiveScore || 50,
        daysOnMarket: c.createdAt
          ? Math.round(
              (Date.now() - new Date(c.createdAt).getTime()) / 86400000
            )
          : 0,
      };
    })
  );

  const avgScore = recommendations.length
    ? Math.round(
        recommendations.reduce((s, r) => s + r.engagementScore, 0) /
          recommendations.length
      )
    : 0;

  return {
    totalCars: cars.length,
    photoScore,
    recommendations,
    averageScore: avgScore,
  };
}
