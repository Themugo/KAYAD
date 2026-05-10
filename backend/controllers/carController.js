import Car from "../models/Car.js";
import { cacheGet, cacheSet } from "../utils/cache.js";

// =============================
// 🧠 SAFE NUMBER PARSER
// =============================
const toNumber = (val, def) => {
  const n = Number(val);
  return isNaN(n) ? def : n;
};

// =============================
// 📦 GET ALL CARS (FIXED + STABLE)
// =============================
export const getCars = async (req, res) => {
  try {
    const {
      keyword,
      minPrice,
      maxPrice,
      brand,
      city,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = toNumber(page, 1);
    const limitNum = toNumber(limit, 12);

    // 🔑 better cache key
    const key = `cars:list:${JSON.stringify({
      keyword,
      minPrice,
      maxPrice,
      brand,
      city,
      sort,
      page: pageNum,
      limit: limitNum,
    })}`;

    const cached = await cacheGet(key);
    if (cached) {
      return res.json(cached);
    }

    const query = {};

    // =============================
    // 🔍 SAFE SEARCH (NO TEXT INDEX BREAK)
    // =============================
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { brand: { $regex: keyword, $options: "i" } },
      ];
    }

    // =============================
    // 💰 PRICE FILTER
    // =============================
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = toNumber(minPrice, 0);
      if (maxPrice) query.price.$lte = toNumber(maxPrice, 999999999);
    }

    // =============================
    // 🚗 BRAND FILTER
    // =============================
    if (brand) {
      query.brand = { $in: brand.split(",") };
    }

    // =============================
    // 📍 LOCATION
    // =============================
    if (city) {
      query["location.city"] = city;
    }

    // =============================
    // 🔃 SORTING
    // =============================
    let sortOption = { createdAt: -1 };

    if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc") sortOption = { price: -1 };
    else if (sort === "newest") sortOption = { createdAt: -1 };

    const skip = (pageNum - 1) * limitNum;

    // =============================
    // ⚡ FETCH DATA
    // =============================
    const [cars, total] = await Promise.all([
      Car.find(query)
        .select(
          "title price images brand year location allowBid bidsCount views trustScore dealRating createdAt"
        )
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Car.countDocuments(query),
    ]);

    const response = {
      success: true,
      data: cars || [],
      pagination: {
        page: pageNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };

    // =============================
    // 🧠 CACHE (30s)
    // =============================
    await cacheSet(key, response, 30);

    res.json(response);

  } catch (err) {
    console.error("❌ FETCH ERROR:", err.message);
    res.status(500).json({
      success: false,
      data: [],
    });
  }
};

// =============================
// 📦 GET SINGLE CAR
// =============================
export const getCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id).lean();

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    // 🔥 non-blocking analytics
    Car.updateOne({ _id: car._id }, { $inc: { views: 1 } }).catch(() => {});

    res.json({
      success: true,
      data: car,
    });

  } catch (err) {
    console.error("❌ GET ONE ERROR:", err.message);
    res.status(500).json({ success: false });
  }
};

// =============================
// ➕ CREATE CAR
// =============================
export const createCar = async (req, res) => {
  try {
    const car = await Car.create({
      ...req.body,
      dealer: req.user.id,
      views: 0,
      bidsCount: 0,
      trustScore: 0,
    });

    // 🔥 invalidate cache
    await cacheSet("cars:list:*", null, 1);

    res.status(201).json({
      success: true,
      data: car,
    });

  } catch (err) {
    console.error("❌ CREATE ERROR:", err.message);
    res.status(500).json({ success: false });
  }
};

// =============================
// ✏️ UPDATE CAR
// =============================
export const updateCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) return res.status(404).json({ success: false });

    Object.assign(car, req.body);
    await car.save();

    await cacheSet("cars:list:*", null, 1);

    res.json({
      success: true,
      data: car,
    });

  } catch (err) {
    console.error("❌ UPDATE ERROR:", err.message);
    res.status(500).json({ success: false });
  }
};

// =============================
// ❌ DELETE CAR
// =============================
export const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) return res.status(404).json({ success: false });

    await car.deleteOne();

    await cacheSet("cars:list:*", null, 1);

    res.json({
      success: true,
      message: "Deleted",
    });

  } catch (err) {
    console.error("❌ DELETE ERROR:", err.message);
    res.status(500).json({ success: false });
  }
};

// =============================
// 💰 BUY CAR
// =============================
export const buyCar = async (req, res) => {
  try {
    const { phone, email } = req.body;

    const car = await Car.findById(req.params.id);

    if (!car || car.sold) {
      return res.status(400).json({
        success: false,
        message: "Unavailable",
      });
    }

    car.buyer = {
      phone,
      email,
      createdAt: new Date(),
    };

    await car.save();

    res.json({
      success: true,
      message: "Dealer will contact you",
    });

  } catch (err) {
    console.error("❌ BUY ERROR:", err.message);
    res.status(500).json({ success: false });
  }
};

// =============================
// ⚡ PLACE BID
// =============================
export const placeBid = async (req, res) => {
  try {
    const { amount } = req.body;

    const car = await Car.findById(req.params.id);

    if (!car || !car.allowBid) {
      return res.status(400).json({ success: false });
    }

    if (Number(amount) <= (car.currentBid || 0)) {
      return res.status(400).json({
        success: false,
        message: "Bid too low",
      });
    }

    car.currentBid = Number(amount);
    car.bidsCount += 1;

    await car.save();

    res.json({
      success: true,
      data: {
        currentBid: car.currentBid,
        bidsCount: car.bidsCount,
      },
    });

  } catch (err) {
    console.error("❌ BID ERROR:", err.message);
    res.status(500).json({ success: false });
  }
};