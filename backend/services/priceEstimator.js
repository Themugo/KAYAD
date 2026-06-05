import Car from "../models/Car.js";

export const estimatePrice = async (car) => {
  const similar = await Car.find({
    brand: car.brand,
    model: car.model,
    year: { $gte: car.year - 1, $lte: car.year + 1 },
  }).select("price");

  if (!similar.length) return null;

  const avg =
    similar.reduce((sum, c) => sum + c.price, 0) / similar.length;

  let rating = "fair";

  if (car.price < avg * 0.8) rating = "great";
  else if (car.price < avg * 0.95) rating = "good";
  else if (car.price > avg * 1.2) rating = "overpriced";

  return {
    avgMarketPrice: avg,
    dealRating: rating,
  };
};