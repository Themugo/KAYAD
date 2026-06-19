import Car from "../models/Car.ts";
import User from "../models/User.ts";
import { cacheDelPattern } from "../utils/cache.ts";
import { uploadMultiple, deleteImage } from "../config/cloudinary.ts";
import { cleanupFiles } from "../middleware/upload.ts";
import { logActionFromReq } from "../utils/securityLogger.ts";
import * as path from "path";
import { STAFF_ROLES, SELLER_ROLES } from "../config/roles.ts";
import { detectDuplicates, flagDuplicate } from "../services/duplicateVehicleService.ts";
import { logVehicleCreated, logVehicleEdited, logVehicleDeleted } from "../services/auditService.ts";

const DEALER_ROLES = SELLER_ROLES; // backward compat

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
      keyword,
      brand,
      city,
      minPrice,
      maxPrice,
      yearMin,
      yearMax,
      body,
      fuel,
      transmission,
      color,
      condition,
      mileageMin,
      mileageMax,
      category,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(toNumber(page, 1), 1);
    // Hard cap: clamp limit to 1..100 so a request like ?limit=999999 can
    // never trigger an unbounded query (pagination cap — Issue: security test).
    const limitNum = Math.min(Math.max(toNumber(limit, 12), 1), 100);

    const query = { status: "active" };

    if (keyword) {
      const trimmed = keyword.trim();
      if (trimmed.length >= 3) {
        // Use MongoDB text index (fast, index-backed) for 3+ char queries
        query.$text = { $search: trimmed };
      } else {
        // Short queries: fall back to regex (text index needs full tokens)
        const safe = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.$or = [{ title: { $regex: safe, $options: "i" } }, { brand: { $regex: safe, $options: "i" } }];
      }
    }

    if (brand) query.brand = { $in: brand.split(",") };
    if (city) {
      const safeCity = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query["location.city"] = { $regex: `^${safeCity}$`, $options: "i" };
    }

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

    const exactText = (value) => ({
      $regex: `^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    });
    if (body) query.bodyType = exactText(body);
    if (fuel) query.fuel = exactText(fuel);
    if (transmission) query.transmission = exactText(transmission);
    if (color) query.color = exactText(color);
    if (condition) query.condition = exactText(condition);

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
    if (query.$text && !sort) {
      // When using text search without explicit sort, rank by relevance
      sortOption = { score: { $meta: "textScore" }, createdAt: -1 };
    } else if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc") sortOption = { price: -1 };
    else if (sort === "year_desc") sortOption = { year: -1 };
    else if (sort === "year_asc") sortOption = { year: 1 };
    else if (sort === "mileage_asc") sortOption = { mileage: 1 };
    else if (sort === "views_desc") sortOption = { views: -1 };
    else sortOption = { auctionStatus: -1, createdAt: -1 };

    const skip = (pageNum - 1) * limitNum;

    // Build the query chain — add text score projection if using $text
    let findQuery = Car.find(query);
    if (query.$text) {
      findQuery = findQuery.select({
        score: { $meta: "textScore" },
        title: 1,
        price: 1,
        images: 1,
        brand: 1,
        year: 1,
        model: 1,
        location: 1,
        fuel: 1,
        transmission: 1,
        mileage: 1,
        bodyType: 1,
        color: 1,
        condition: 1,
        description: 1,
        allowBid: 1,
        allowBuy: 1,
        auctionStatus: 1,
        currentBid: 1,
        bidsCount: 1,
        views: 1,
        trustScore: 1,
        dealRating: 1,
        createdAt: 1,
        dealerPhone: 1,
        isVerifiedDealer: 1,
        ntsaVerified: 1,
        dutyStatus: 1,
        isPromoted: 1,
        isDemo: 1,
        demoEditedAt: 1,
        demoEditedBy: 1,
      });
    } else {
      findQuery = findQuery.select(
        "title price images brand year model location fuel transmission mileage bodyType color condition description allowBid allowBuy auctionStatus currentBid bidsCount views trustScore dealRating createdAt dealerPhone isVerifiedDealer ntsaVerified dutyStatus isPromoted isDemo demoEditedAt demoEditedBy",
      );
    }

    const [cars, total] = await Promise.all([
      findQuery.sort(sortOption).skip(skip).limit(limitNum).lean(),

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
      "+trialStartedAt +trialListingsUsed +firstVehicleUsed dealerPackage packageListingMax packageExpiresAt listingCount role status isDemo",
    );

    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });
    if (seller.status !== "approved")
      return res.status(403).json({ success: false, message: "Account not yet approved" });
    const isDemoSeller = !!seller.isDemo;

    // ── PACKAGE / TRIAL ENFORCEMENT ─────────────────────────
    const config = await (await import("../models/PlatformConfig.ts")).default.findOne().lean();
    const pkgs = config?.packages || [];
    const pkg = pkgs.find((p) => p.id === seller.dealerPackage) || null;

    // Monetisation master switch (admin-controlled, no code change to flip):
    // free unless an admin has explicitly turned freeMarket OFF. Absent config
    // (fresh DB) therefore means free — listings are unlimited and free.
    const monetisationOff = config?.freeMarket !== false || config?.waivePayments === true;

    const isDealer = seller.role === "dealer";
    const isSeller = seller.role === "broker" || seller.role === "individual_seller";
    const currentListingCount = isDemoSeller ? 0 : await Car.countDocuments({ dealer: req.user.id });

    // Determine if user is allowed to create a listing (without incrementing yet)
    let shouldIncrementListingCount = false;

    if (monetisationOff) {
      // Free-for-all launch mode — allow the listing, still track count for analytics.
      shouldIncrementListingCount = !isDemoSeller;
    } else if (!isDemoSeller && isDealer && pkg) {
      const now = new Date();

      if (pkg.isFree && pkg.trialDays > 0) {
        const trialStart = seller.trialStartedAt || now;
        const trialEnd = new Date(trialStart.getTime() + pkg.trialDays * 86400000);

        if (now > trialEnd) {
          return res.status(402).json({
            success: false,
            message: `Your free trial ended on ${trialEnd.toLocaleDateString("en-KE")}. Please upgrade to a paid plan to continue listing.`,
            code: "TRIAL_EXPIRED",
          });
        }

        const trialMax = pkg.trialListingMax || pkg.listingMax || 3;
        if (currentListingCount >= trialMax) {
          return res.status(402).json({
            success: false,
            message: `Trial limit reached (${trialMax} listings). Upgrade to a paid plan to list more.`,
            code: "TRIAL_LIMIT_REACHED",
          });
        }

        shouldIncrementListingCount = true;

        // Set trial start date on first listing
        if (!seller.trialStartedAt) {
          await User.findByIdAndUpdate(req.user.id, { trialStartedAt: now });
        }
      } else if (!pkg.isFree) {
        if (seller.packageExpiresAt && now > new Date(seller.packageExpiresAt)) {
          return res.status(402).json({
            success: false,
            message: "Your listing package has expired. Please renew to continue listing.",
            code: "PACKAGE_EXPIRED",
          });
        }
        if (pkg.listingMax > 0 && currentListingCount >= pkg.listingMax) {
          return res.status(402).json({
            success: false,
            message: `You've reached your plan limit of ${pkg.listingMax} listings. Upgrade to list more.`,
            code: "LISTING_LIMIT_REACHED",
          });
        }
        shouldIncrementListingCount = true;
      }
    }

    if (!monetisationOff && !isDemoSeller && isSeller) {
      const sellerPkg = pkgs.find((p) => p.id === seller.dealerPackage) || null;

      if (!seller.firstVehicleUsed || currentListingCount === 0) {
        shouldIncrementListingCount = true;
      } else if (sellerPkg && !sellerPkg.isFree) {
        if (sellerPkg.listingMax > 0 && currentListingCount >= sellerPkg.listingMax) {
          return res.status(402).json({
            success: false,
            message: `You've reached your plan limit of ${sellerPkg.listingMax} listings.`,
            code: "LISTING_LIMIT_REACHED",
          });
        }
        shouldIncrementListingCount = true;
      } else if (!sellerPkg) {
        return res.status(402).json({
          success: false,
          message: "Your free listing has been used. Subscribe to a seller plan to list more vehicles.",
          code: "FREE_VEHICLE_USED",
        });
      } else {
        shouldIncrementListingCount = true;
      }
    }

    const body = {
      ...req.body,
      dealer: req.user.id,
      views: 0,
      bidsCount: 0,
      trustScore: 0,
      status: isDemoSeller ? "active" : "pending",
      isDemo: isDemoSeller,
    };
    if (isDemoSeller) {
      body.demoEditedAt = new Date();
      body.demoEditedBy = req.user.id;
    }
    if (!body.location && (body.city || body.address)) {
      body.location = {
        city: body.city || seller.location || "",
        address: body.address || "",
      };
    }
    delete body.city;
    delete body.address;

    // ── PROCESS UPLOADED IMAGES (Issue #3: non-blocking) ──────
    const cloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

    let pendingFiles = null; // Track files for background upload
    if (req.files && req.files.length > 0) {
      if (cloudinaryConfigured) {
        // Save placeholder thumbs immediately; full upload happens after response
        body.images = req.files.map((f) => ({
          url: `/uploads/${path.basename(f.path)}`,
          thumb: `/uploads/${path.basename(f.path)}`,
          public_id: null,
          _pending: true, // Flag for background processing
        }));
        pendingFiles = req.files;
      } else {
        body.images = req.files.map((f) => ({
          url: `/uploads/${path.basename(f.path)}`,
          thumb: `/uploads/${path.basename(f.path)}`,
          public_id: null,
        }));
      }
    }

    // Set coverImage: use user selection if valid, otherwise default to 0
    const totalImages = (body.images || []).length;
    const requestedCover = Number(body.coverImage);
    body.coverImage =
      !isNaN(requestedCover) && requestedCover >= 0 && requestedCover < totalImages ? requestedCover : 0;

    // ── CREATE CAR (before incrementing listing count for atomicity) ──
    const car = await Car.create(body);

    // ── INCREMENT LISTING COUNT (only after successful Car.create) ──
    if (shouldIncrementListingCount) {
      const updateOps = { $inc: { listingCount: 1 } };
      if (!isDemoSeller && isDealer && pkg?.isFree && pkg?.trialDays > 0) {
        updateOps.$inc.trialListingsUsed = 1;
      }
      if (!isDemoSeller && isSeller && !seller.firstVehicleUsed) {
        updateOps.firstVehicleUsed = true;
      }
      await User.findByIdAndUpdate(req.user.id, updateOps);
    }

    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "create_car", {
      target: car._id,
      targetModel: "Car",
      details: { title: car.title, price: car.price },
    });

    // Log vehicle creation to audit trail
    await logVehicleCreated(car, req.user, req);

    // ── DUPLICATE DETECTION (Non-blocking) ──
    setImmediate(async () => {
      try {
        const detectionData = await detectDuplicates(
          {
            vin: car.vin,
            chassisNumber: car.chassisNumber,
            registrationNumber: car.registrationNumber,
            brand: car.brand,
            model: car.model,
            year: car.year,
            price: car.price,
            mileage: car.mileage,
          },
          req.user.id,
        );

        if (detectionData.hasDuplicates) {
          await flagDuplicate(car._id, detectionData, req.user.id);
        }
      } catch (err) {
        // Duplicate detection failure should not affect listing creation
        console.warn("⚠️ Duplicate detection failed:", err.message);
      }
    });

    res.status(201).json({ success: true, data: car });

    // ── BACKGROUND: Upload images to Cloudinary after response (Issue #3) ──
    if (pendingFiles && cloudinaryConfigured) {
      setImmediate(async () => {
        try {
          const uploaded = await uploadMultiple(pendingFiles, "kayad/cars");
          await Car.findByIdAndUpdate(car._id, {
            $set: { images: uploaded },
          });
          cleanupFiles(pendingFiles);
        } catch (e) {
          console.warn("⚠️ Background image upload failed:", e.message);
          // Images remain as local placeholders — admin can re-upload
        }
      });
    }
  } catch (err) {
    console.error("❌ CREATE ERROR:", err.message);
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({
      success: false,
      message: "Failed to create car",
      ...(isDev && { error: err.message }),
    });
  }
};

// =============================
// ✏️ UPDATE CAR
// =============================
export const updateCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isDealer = DEALER_ROLES.includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;

    // Permission rules:
    //   • Owner always edits their own car
    //   • Demo dealers can edit demo cars
    //   • Staff can edit demo cars ONLY — never real dealer/broker/seller listings
    const canEdit = isOwner || (car.isDemo && (isDealer || isStaff));
    if (!canEdit) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this listing" });
    }

    // Preserve existing coverImage if caller didn't explicitly send one
    const incomingCover = req.body.coverImage;
    const hadExplicitCover = incomingCover !== undefined && incomingCover !== null && incomingCover !== "";

    // Track price change
    const newPrice = Number(req.body.price);
    if (!isNaN(newPrice) && newPrice !== car.price) {
      car.priceHistory.push({ price: car.price || 0, date: new Date() });
    }

    const allowedFields = [
      "title",
      "brand",
      "model",
      "year",
      "price",
      "location.city",
      "location.address",
      "fuel",
      "transmission",
      "mileage",
      "bodyType",
      "color",
      "condition",
      "description",
      "features",
      "images",
      "coverImage",
      "status",
      "allowBuy",
      "allowBid",
      "escrowEnabled",
      "auctionStartTime",
      "auctionEnd",
      "startingBid",
      "reservePrice",
      "reserveMode",
      "isPromoted",
      "promotionExpiresAt",
      "dealerPhone",
      "ntsaVerified",
      "dutyStatus",
      "logbookVerified",
    ];
    for (const key of Object.keys(req.body)) {
      if (allowedFields.includes(key)) {
        car.set(key, req.body[key]);
      }
    }
    if (car.isDemo && isDealer) {
      car.isDemo = true;
      car.demoEditedAt = new Date();
      car.demoEditedBy = req.user.id;
    }

    // ── SMART COVER IMAGE AUTO-SELECTION ────────────────────
    // Helper: find first index with a real URL
    const findFirstValidIdx = (images) => {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const url = typeof img === "string" ? img : img?.url;
        if (url && url.startsWith("http")) return i;
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
      car.coverImage = !isNaN(idx) && idx >= 0 && idx < totalImages ? idx : findFirstValidIdx(car.images);
    }

    await car.save();

    // Store old data for audit logging
    const oldData = car.toObject();

    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "update_car", {
      target: car._id,
      targetModel: "Car",
      details: { title: car.title, price: car.price },
    });

    // Log vehicle edit to audit trail
    await logVehicleEdited(car, oldData, req.user, req);

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

    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isDealer = DEALER_ROLES.includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;
    const isDemoMgmt = car.isDemo && (isDealer || isStaff);
    if (!isOwner && !isStaff && !isDemoMgmt) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this listing" });
    }

    await Car.softDelete(req.params.id, req.user.id);

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

    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "delete_car", {
      target: req.params.id,
      targetModel: "Car",
      details: { title: car.title },
    });

    // Log vehicle deletion to audit trail
    await logVehicleDeleted(car, req.user, req);

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
// 🖼 DELETE IMAGE FROM CAR
// =============================
export const deleteCarImage = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isDealer = DEALER_ROLES.includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;
    const isDemoMgmt = car.isDemo && (isDealer || isStaff);
    if (!isOwner && !isStaff && !isDemoMgmt) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this listing" });
    }

    const imageIndex = Number(req.params.imageIndex);
    if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= (car.images || []).length) {
      return res.status(400).json({ success: false, message: "Invalid image index" });
    }

    const removedImage = car.images[imageIndex];

    // Delete from Cloudinary if it has a public_id
    if (removedImage?.public_id) {
      await deleteImage(removedImage.public_id);
    }

    // Remove from array
    car.images.splice(imageIndex, 1);

    // Adjust coverImage if needed
    if (car.images.length === 0) {
      car.coverImage = 0;
    } else if (imageIndex < car.coverImage) {
      car.coverImage -= 1;
    } else if (imageIndex === car.coverImage) {
      car.coverImage = 0;
    }

    await car.save();
    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "delete_car_image", {
      target: car._id,
      targetModel: "Car",
      details: { imageIndex, removedPublicId: removedImage?.public_id },
    });

    res.json({ success: true, data: { images: car.images, coverImage: car.coverImage } });
  } catch (err) {
    console.error("❌ DELETE IMAGE ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete image" });
  }
};

// =============================
// 📤 ADD IMAGES TO CAR
// =============================
export const addCarImages = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isDealer = DEALER_ROLES.includes(req.user.role);
    const isOwner = car.dealer?.toString() === req.user.id;
    const isDemoMgmt = car.isDemo && (isDealer || isStaff);
    if (!isOwner && !isStaff && !isDemoMgmt) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this listing" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    const maxImages = 20;
    const currentCount = (car.images || []).length;
    if (currentCount + req.files.length > maxImages) {
      cleanupFiles(req.files);
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxImages} images allowed. You have ${currentCount}, trying to add ${req.files.length}.`,
      });
    }

    const cloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

    let newImages;
    if (cloudinaryConfigured) {
      newImages = await uploadMultiple(req.files, "kayad/cars");
      cleanupFiles(req.files);
    } else {
      newImages = req.files.map((f) => ({
        url: `/uploads/${path.basename(f.path)}`,
        thumb: `/uploads/${path.basename(f.path)}`,
        public_id: null,
      }));
    }

    car.images = [...(car.images || []), ...newImages];
    await car.save();
    await cacheDelPattern("cars:list:*");

    await logActionFromReq(req, "add_car_images", {
      target: car._id,
      targetModel: "Car",
      details: { addedCount: newImages.length, totalImages: car.images.length },
    });

    res.json({ success: true, data: { images: car.images } });
  } catch (err) {
    console.error("❌ ADD IMAGES ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to add images" });
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
    const isAdmin = req.user && STAFF_ROLES.includes(req.user.role);
    if (car.status !== "active" && car.status !== "sold" && !isOwner && !isAdmin) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    if (car.dealer?.visibility) {
      const vis = car.dealer.visibility;
      if (!vis.showPhone) {
        car.dealerPhone = undefined;
        if (car.dealer) car.dealer.phone = undefined;
      }
      if (!vis.showEmail) {
        if (car.dealer) car.dealer.email = undefined;
      }
      if (!vis.showLocation) {
        if (car.dealer) car.dealer.location = undefined;
      }
      if (!vis.chatEnabled) {
        car.chatDisabled = true;
      }
      delete car.dealer?.visibility;
    }

    // ── VIEW COUNT (Issue #5) ─────────────────────────────────
    // Use Redis atomic counter to prevent lost updates under concurrency.
    // A background flush syncs to MongoDB every 60s (see server.js viewFlush).
    // Falls back to fire-and-forget $inc when Redis is unavailable.
    try {
      const { isRedisConnected } = await import("../utils/cache.ts");
      if (isRedisConnected()) {
        const redisClient = (await import("../config/redis.ts")).default;
        await redisClient.hIncrBy("kayad:view_counts", String(car._id), 1);
      } else {
        Car.updateOne({ _id: car._id }, { $inc: { views: 1 } }).catch(() => {});
      }
    } catch {
      Car.updateOne({ _id: car._id }, { $inc: { views: 1 } }).catch(() => {});
    }

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

    await logActionFromReq(req, "place_bid", {
      target: car._id,
      targetModel: "Car",
      details: { amount: Number(amount), bidsCount: car.bidsCount },
    });

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
    if (!DEALER_ROLES.includes(req.user.role) && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only dealer or admin accounts can view demo cars" });
    }

    const cars = await Car.find({ isDemo: true })
      .populate("dealer", "name email businessName")
      .sort({ createdAt: -1 })
      .limit(100) // Cap at 100 to prevent unbounded memory (Issue #11)
      .lean();

    res.json({ success: true, data: cars });
  } catch (err) {
    console.error("❌ GET DEMO CARS ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch demo cars" });
  }
};
