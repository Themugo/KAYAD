import Car from "../models/Car.ts";

// =============================
// 🧠 SCORE CALCULATOR
// =============================
const calculateScore = (car) => {
  const viewsScore = (car.views || 0) * 0.3;
  const bidScore = (car.currentBid || 0) * 0.5;
  const recencyScore = (Date.now() - new Date(car.createdAt)) / 100000000;

  return viewsScore + bidScore - recencyScore;
};

// =============================
// 🚗 GET RECOMMENDED CARS
// =============================
export const getRecommendedCars = async ({ userId, limit = 10, filters = {} } = {}) => {
  const query = {
    status: "active", // 🔥 only active listings
    ...filters,
  };

  const cars = await Car.find(query).lean();

  // =============================
  // 🧠 SCORE + SORT
  // =============================
  const scored = cars.map((car) => ({
    ...car,
    score: calculateScore(car),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
};
