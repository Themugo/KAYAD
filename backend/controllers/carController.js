import Car from "../models/Car.js";
import User from "../models/User.js";
import { cacheGet, cacheSet } from "../utils/cache.js";
import { uploadMultiple } from "../config/cloudinary.js";
import { cleanupFiles } from "../middleware/upload.js";

// Demo dealer can manage all demo cars — identified by seeded email
const isDemoDealer = (user) => user?.email?.toLowerCase() === "dealer@kayad.space";

// =============================
// 🧠 SAFE NUMBER PARSER
// =============================
const toNumber = (val, def) => {
  const n = Number(val);
  return isNaN(n) ? def : n;
};

// =============================
// 📦 GET ALL CARS (SERVER-SIDE FILTERING + PAGINATION)
// =============================
export const getCars = async (req, res) => {
  try {
    const {
      keyword, brand, city,
      minPrice, maxPrice,
      yearMin, yearMax,
      body, fuel, transmission, color, condition,
      mileageMin, mileageMax,
      category,
      sort,
      page = 1, limit = 12,
    } = req.query;

    const pageNum = toNumber(page, 1);
    const limitNum = toNumber(limit, 12);

    const query = { status: "active" };

    if (keyword) {
      const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: safe, $options: "i" } },
        { brand: { $regex: safe, $options: "i" } },
      ];
    }

    if (brand) query.brand = { $in: brand.split(",") };
    if (city) query["location.city"] = city;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = toNumber(minPrice, 0);
      if (maxPrice) query.price.$lte = toNumber(maxPrice, 999999999);
    }

    if (yearMin || yearMax) {
      query.year = {};
      if (yearMin) query.year.$gte = toNumber(yearMin, 0);
      if (yearMax) query.year.$lte = toNumber(yearMax, 9999);
    }

    if (body) query.bodyType = body;
    if (fuel) query.fuel = fuel;
    if (transmission) query.transmission = transmission;
    if (color) query.color = color;
    if (condition) query.condition = condition;

    if (mileageMin || mileageMax) {
      query.mileage = {};
      if (mileageMin) query.mileage.$gte = toNumber(mileageMin, 0);
      if (mileageMax) query.mileage.$lte = toNumber(mileageMax, 9999999);
    }

    if (category === "auction") {
      query.$or = [{ auctionStatus: "live" }, { allowBid: true }];
    } else if (category === "fixed") {
      query.auctionStatus = { $ne: "live" };
      query.allowBid = { $ne: true };
    }

    let sortOption = {};
    if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc") sortOption = { price: -1 };
    else if (sort === "year_desc") sortOption = { year: -1 };
    else if (sort === "year_asc") sortOption = { year: 1 };
    else if (sort === "mileage_asc") sortOption = { mileage: 1 };
    else if (sort === "views_desc") sortOption = { views: -1 };
    else sortOption = { auctionStatus: -1, createdAt: -1 };

    const skip = (pageNum - 1) * limitNum;

    const [cars, total] = await Promise.all([
      Car.find(query)
        .select(
          "title price images brand year model location fuel transmission mileage bodyType color description allowBid allowBuy auctionStatus currentBid bidsCount views trustScore dealRating createdAt dealerPhone isVerifiedDealer ntsaVerified dutyStatus isPromoted"
        )
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Car.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: cars || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });

  } catch (err) {
    console.error("❌ FETCH ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch cars", data: [] });
  }
};

// =============================
// ➕ CREATE CAR
// =============================
export const createCar = async (req, res) => {
  try {
    const seller = await User.findById(req.user.id).select(
      "+trialStartedAt +trialListingsUsed +firstVehicleUsed dealerPackage packageListingMax packageExpiresAt listingCount role approved"
    );

    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });
    if (!seller.approved) return res.status(403).json({ success: false, message: "Account not yet approved" });

    // ── PACKAGE / TRIAL ENFORCEMENT ─────────────────────────
    const config = await (await import("../models/PlatformConfig.js")).default.findOne().lean();
    const pkgs   = config?.packages || [];
    const pkg    = pkgs.find(p => p.id === seller.dealerPackage) || null;

    const isDealer = seller.role === "dealer";
    const isSeller = seller.role === "broker" || seller.role === "individual_seller";

    if (isDealer && pkg) {
      const now = new Date();

      // Trial window: pkg.trialDays > 0 and isFree
      if (pkg.isFree && pkg.trialDays > 0) {
        const trialStart = seller.trialStartedAt || now;
        const trialEnd   = new Date(trialStart.getTime() + pkg.trialDays * 86400000);

        if (now > trialEnd) {
          return res.status(402).json({
            success: false,
            message: `Your free trial ended on ${trialEnd.toLocaleDateString("en-KE")}. Please upgrade to a paid plan to continue listing.`,
            code: "TRIAL_EXPIRED",
          });
        }

        const trialMax = pkg.trialListingMax || pkg.listingMax || 3;
        if ((seller.trialListingsUsed || 0) >= trialMax) {
          return res.status(402).json({
            success: false,
            message: `Trial limit reached (${trialMax} listings). Upgrade to a paid plan to list more.`,
            code: "TRIAL_LIMIT_REACHED",
          });
        }

        // Set trial start date on first listing
        if (!seller.trialStartedAt) {
          await User.findByIdAndUpdate(req.user.id, { trialStartedAt: now });
        }
        await User.findByIdAndUpdate(req.user.id, { $inc: { trialListingsUsed: 1, listingCount: 1 } });

      } else if (!pkg.isFree) {
        // Paid package — check expiry and listing cap
        if (seller.packageExpiresAt && now > new Date(seller.packageExpiresAt)) {
          return res.status(402).json({
            success: false,
            message: "Your listing package has expired. Please renew to continue listing.",
            code: "PACKAGE_EXPIRED",
          });
        }
        if (pkg.listingMax > 0 && (seller.listingCount || 0) >= pkg.listingMax) {
          return res.status(402).json({
            success: false,
            message: `You've reached your plan limit of ${pkg.listingMax} listings. Upgrade to list more.`,
            code: "LISTING_LIMIT_REACHED",
          });
        }
        await User.findByIdAndUpdate(req.user.id, { $inc: { listingCount: 1 } });
      }
    }

    if (isSeller) {
      const sellerPkg = pkgs.find(p => p.id === seller.dealerPackage) || null;

      // First-vehicle free for sellers
      if (!seller.firstVehicleUsed) {
        // Mark first vehicle as used
        await User.findByIdAndUpdate(req.user.id, { firstVehicleUsed: true, $inc: { listingCount: 1 } });
      } else if (sellerPkg && !sellerPkg.isFree) {
        // Paid seller plan — enforce limit
        if (sellerPkg.listingMax > 0 && (seller.listingCount || 0) >= sellerPkg.listingMax) {
          return res.status(402).json({
            success: false,
            message: `You've reached your plan limit of ${sellerPkg.listingMax} listings.`,
            code: "LISTING_LIMIT_REACHED",
          });
        }
        await User.findByIdAndUpdate(req.user.id, { $inc: { listingCount: 1 } });
      } else if (!sellerPkg) {
        // No paid plan after free vehicle used
        return res.status(402).json({
          success: false,
          message: "Your free listing has been used. Subscribe to a seller plan to list more vehicles.",
          code: "FREE_VEHICLE_USED",
        });
      } else {
        await User.findByIdAndUpdate(req.user.id, { $inc: { listingCount: 1 } });
      }
    }

    const body = { ...req.body, dealer: req.user.id, views: 0, bidsCount: 0, trustScore: 0, status: "pending" };

    // ── PROCESS UPLOADED IMAGES ──────────────────────────────
    if (req.files && req.files.length > 0) {
      const uploaded = await uploadMultiple(req.files, "kayad/cars");
      body.images = uploaded;
      body.coverImage = 0;
      cleanupFiles(req.files);
    } else {
      const totalImages = (body.images || []).length;
      const requestedCover = Number(body.coverImage);
      body.coverImage = (!isNaN(requestedCover) && requestedCover >= 0 && requestedCover < totalImages)
        ? requestedCover
        : 0;
    }

    const car = await Car.create(body);
    await cacheSet("cars:list:*", null, 1);

    res.status(201).json({ success: true, data: car });
  } catch (err) {
    console.error("❌ CREATE ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to create car" });
  }
};

// =============================
// ✏️ UPDATE CAR
// =============================
export const updateCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isStaff = ["admin","superadmin","moderator","technical_support"].includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;
    const isDemoMgmt = car.isDemo && isDemoDealer(req.user);
    if (!isOwner && !isStaff && !isDemoMgmt) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this listing" });
    }

    // Preserve existing coverImage if caller didn't explicitly send one
    const incomingCover = req.body.coverImage;
    const hadExplicitCover = incomingCover !== undefined && incomingCover !== null && incomingCover !== '';

    // Track price change
    const newPrice = Number(req.body.price);
    if (!isNaN(newPrice) && newPrice !== car.price) {
      car.priceHistory.push({ price: car.price || 0, date: new Date() });
    }

    Object.assign(car, req.body);

    // ── SMART COVER IMAGE AUTO-SELECTION ────────────────────
    // Helper: find first index with a real URL
    const findFirstValidIdx = (images) => {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const url = typeof img === 'string' ? img : img?.url;
        if (url && url.startsWith('http')) return i;
      }
      return 0; // fallback to index 0
    };

    const totalImages = (car.images || []).length;
    if (totalImages === 0) {
      car.coverImage = 0;
    } else if (!hadExplicitCover) {
      // No explicit cover sent — keep existing if still valid, else auto-pick
      if (isNaN(car.coverImage) || car.coverImage < 0 || car.coverImage >= totalImages) {
        car.coverImage = findFirstValidIdx(car.images);
      }
      // else: keep the existing coverImage value untouched
    } else {
      // Explicit cover sent — validate it's in range
      const idx = Number(incomingCover);
      car.coverImage = (!isNaN(idx) && idx >= 0 && idx < totalImages) ? idx : findFirstValidIdx(car.images);
    }

    await car.save();
    await cacheSet("cars:list:*", null, 1);

    res.json({ success: true, data: car });
  } catch (err) {
    console.error("❌ UPDATE ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to update car" });
  }
};

// =============================
// ❌ DELETE CAR
// =============================
export const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isStaff = ["admin","superadmin","moderator"].includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;
    const isDemoMgmt = car.isDemo && isDemoDealer(req.user);
    if (!isOwner && !isStaff && !isDemoMgmt) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this listing" });
    }

    await car.deleteOne();

    // Decrement listing counts
    if (car.dealer) {
      const owner = await User.findById(car.dealer).select("listingCount trialListingsUsed");
      if (owner) {
        const updates = {};
        if (owner.listingCount > 0) updates.listingCount = owner.listingCount - 1;
        if (owner.trialListingsUsed > 0) updates.trialListingsUsed = owner.trialListingsUsed - 1;
        if (Object.keys(updates).length > 0) {
          await User.findByIdAndUpdate(car.dealer, updates);
        }
      }
    }

    await cacheSet("cars:list:*", null, 1);

    res.json({
      success: true,
      message: "Deleted",
    });

  } catch (err) {
    console.error("❌ DELETE ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch cars", data: [] });
  }
};

// =============================
// 📦 GET SINGLE CAR
// =============================
export const getCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id)
      .populate("dealer", "_id name email phone location businessName bio visibility dealerRating approved role")
      .lean();

    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    const isOwner = req.user && String(car.dealer?._id) === String(req.user.id);
    const isAdmin = req.user && ["admin", "superadmin", "moderator"].includes(req.user.role);
    if (car.status !== "active" && car.status !== "sold" && !isOwner && !isAdmin) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    if (car.dealer?.visibility) {
      const vis = car.dealer.visibility;
      if (!vis.showPhone)   { car.dealerPhone = undefined; if (car.dealer) car.dealer.phone = undefined; }
      if (!vis.showEmail)   { if (car.dealer) car.dealer.email = undefined; }
      if (!vis.showLocation) { if (car.dealer) car.dealer.location = undefined; }
      if (!vis.chatEnabled) { car.chatDisabled = true; }
      delete car.dealer?.visibility;
    }

    Car.updateOne({ _id: car._id }, { $inc: { views: 1 } }).catch(() => {});

    res.json({ success: true, data: car });

  } catch (err) {
    console.error("❌ GET ONE ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch car" });
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
      return res.status(400).json({ success: false, message: "Car not available for bidding" });
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
    res.status(500).json({ success: false, message: "Bid failed" });
  }
};

// =============================
// 🧪 GET ALL DEMO CARS (demo dealer only)
// =============================
export const getDemoCars = async (req, res) => {
  try {
    if (!isDemoDealer(req.user)) {
      return res.status(403).json({ success: false, message: "Only the demo dealer can view all demo cars" });
    }

    const cars = await Car.find({ isDemo: true })
      .populate("dealer", "name email businessName")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: cars });
  } catch (err) {
    console.error("❌ GET DEMO CARS ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch demo cars" });
  }
};