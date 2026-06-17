import Car from "../models/Car.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const searchCars = async ({
  keyword,
  minPrice,
  maxPrice,
  brand,
  year,
  minMileage,
  maxMileage,
  sort = "latest", // latest | price_asc | price_desc | popular
  page = 1,
  limit = 12,
}) => {
  const filter = {
    status: "active",
  };

  // =============================
  // 🔍 KEYWORD SEARCH (OPTIMIZED)
  // =============================
  if (keyword) {
    // Use MongoDB text index for better performance
    filter.$text = { $search: keyword };
  }

  // =============================
  // 🏷 BRAND
  // =============================
  if (brand) {
    filter.brand = brand;
  }

  // =============================
  // 💰 PRICE RANGE
  // =============================
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // =============================
  // 📅 YEAR
  // =============================
  if (year) {
    filter.year = Number(year);
  }

  // =============================
  // 🚗 MILEAGE
  // =============================
  if (minMileage || maxMileage) {
    filter.mileage = {};
    if (minMileage) filter.mileage.$gte = Number(minMileage);
    if (maxMileage) filter.mileage.$lte = Number(maxMileage);
  }

  // =============================
  // 🔽 SORTING
  // =============================
  let sortOption = { createdAt: -1 };

  if (sort === "price_asc") sortOption = { price: 1 };
  if (sort === "price_desc") sortOption = { price: -1 };
  if (sort === "popular") sortOption = { views: -1 };
  if (keyword && sort === "latest") {
    // When searching by keyword, sort by text score for relevance
    sortOption = { score: { $meta: "textScore" }, createdAt: -1 };
  }

  // =============================
  // 📄 PAGINATION
  // =============================
  const skip = (page - 1) * limit;

  // Add text score projection if searching by keyword
  const projection = keyword ? { score: { $meta: "textScore" } } : {};

  const [cars, total] = await Promise.all([
    Car.find(filter, projection).sort(sortOption).skip(skip).limit(limit).lean(),
    Car.countDocuments(filter),
  ]);

  return {
    data: cars,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  };
};
