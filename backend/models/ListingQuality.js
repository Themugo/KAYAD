// backend/models/ListingQuality.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Listing Quality model
// Tracks and calculates listing quality scores
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const listingQualitySchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 LINKED LISTING
    // =============================
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      unique: true,
      index: true,
    },

    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // =============================
    // 📊 QUALITY SCORE
    // =============================
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      index: true,
    },

    rating: {
      type: String,
      enum: ["Excellent", "Good", "Average", "Poor"],
      index: true,
    },

    // =============================
    // 📈 SCORE BREAKDOWN
    // =============================
    scoreBreakdown: {
      imageCount: {
        score: Number,
        weight: 0.25,
        details: {
          imageCount: Number,
          recommendedCount: Number,
        },
      },

      imageQuality: {
        score: Number,
        weight: 0.15,
        details: {
          resolution: String,
          variety: Number,
          clarity: Number,
        },
      },

      descriptionQuality: {
        score: Number,
        weight: 0.20,
        details: {
          wordCount: Number,
          recommendedMin: Number,
          completeness: Number,
        },
      },

      missingAttributes: {
        score: Number,
        weight: 0.15,
        details: {
          missingFields: [String],
          requiredFields: [String],
          providedFields: [String],
        },
      },

      inspectionReport: {
        score: Number,
        weight: 0.15,
        details: {
          hasInspection: Boolean,
          inspectionScore: Number,
          conditionRating: String,
        },
      },

      verificationStatus: {
        score: Number,
        weight: 0.10,
        details: {
          isVerified: Boolean,
          verificationStatus: String,
        },
      },
    },

    // =============================
    // 💡 RECOMMENDATIONS
    // =============================
    recommendations: [
      {
        category: {
          type: String,
          enum: ["images", "description", "attributes", "inspection", "verification"],
        },
        priority: {
          type: String,
          enum: ["high", "medium", "low"],
        },
        message: String,
        action: String,
      },
    ],

    // =============================
    // 📋 METADATA
    // =============================
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },

    calculationVersion: {
      type: String,
      default: "1.0.0",
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
listingQualitySchema.index({ car: 1, dealer: 1 });
listingQualitySchema.index({ overallScore: -1 });
listingQualitySchema.index({ rating: 1 });
listingQualitySchema.index({ lastCalculatedAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Calculate overall quality score
listingQualitySchema.methods.calculateScore = async function () {
  const car = await this.populate("car").populate("dealer").execPopulate();
  if (!car) return 0;

  const breakdown = this.scoreBreakdown || {};

  // Calculate individual scores
  breakdown.imageCount = this.calculateImageCountScore(car.car);
  breakdown.imageQuality = this.calculateImageQualityScore(car.car);
  breakdown.descriptionQuality = this.calculateDescriptionQualityScore(car.car);
  breakdown.missingAttributes = this.calculateMissingAttributesScore(car.car);
  breakdown.inspectionReport = await this.calculateInspectionReportScore(car.car);
  breakdown.verificationStatus = await this.calculateVerificationStatusScore(car.dealer);

  // Calculate weighted overall score
  const overallScore =
    breakdown.imageCount.score * breakdown.imageCount.weight +
    breakdown.imageQuality.score * breakdown.imageQuality.weight +
    breakdown.descriptionQuality.score * breakdown.descriptionQuality.weight +
    breakdown.missingAttributes.score * breakdown.missingAttributes.weight +
    breakdown.inspectionReport.score * breakdown.inspectionReport.weight +
    breakdown.verificationStatus.score * breakdown.verificationStatus.weight;

  this.overallScore = Math.round(overallScore);
  this.rating = this.getRating(this.overallScore);
  this.scoreBreakdown = breakdown;
  this.lastCalculatedAt = new Date();

  // Generate recommendations
  this.recommendations = this.generateRecommendations(car.car, car.dealer);

  return this.save();
};

// Calculate image count score
listingQualitySchema.methods.calculateImageCountScore = function (car) {
  const imageCount = car.images ? car.images.length : 0;
  const recommendedCount = 10;

  let score;
  if (imageCount === 0) score = 0;
  else if (imageCount <= 3) score = 25;
  else if (imageCount <= 6) score = 50;
  else if (imageCount <= 9) score = 75;
  else score = 100;

  return {
    score,
    weight: 0.25,
    details: {
      imageCount,
      recommendedCount,
    },
  };
};

// Calculate image quality score
listingQualitySchema.methods.calculateImageQualityScore = function (car) {
  const images = car.images || [];
  if (images.length === 0) {
    return {
      score: 0,
      weight: 0.15,
      details: {
        resolution: "No images",
        variety: 0,
        clarity: 0,
      },
    };
  }

  // Simple quality assessment (in production, use image analysis)
  const resolution = images.length > 5 ? "High" : images.length > 2 ? "Medium" : "Low";
  const variety = Math.min(images.length / 10, 1) * 100;
  const clarity = 80; // Default assumption

  const score = (variety + clarity) / 2;

  return {
    score: Math.round(score),
    weight: 0.15,
    details: {
      resolution,
      variety: Math.round(variety),
      clarity,
    },
  };
};

// Calculate description quality score
listingQualitySchema.methods.calculateDescriptionQualityScore = function (car) {
  const description = car.description || "";
  const wordCount = description.split(/\s+/).filter(word => word.length > 0).length;
  const recommendedMin = 50;

  let score;
  if (wordCount === 0) score = 0;
  else if (wordCount <= 50) score = 50;
  else if (wordCount <= 100) score = 75;
  else score = 100;

  // Check for completeness (basic keywords)
  const keywords = ["condition", "history", "features", "maintenance", "service"];
  const completeness = keywords.filter(keyword => 
    description.toLowerCase().includes(keyword)
  ).length / keywords.length * 100;

  const finalScore = (score + completeness) / 2;

  return {
    score: Math.round(finalScore),
    weight: 0.20,
    details: {
      wordCount,
      recommendedMin,
      completeness: Math.round(completeness),
    },
  };
};

// Calculate missing attributes score
listingQualitySchema.methods.calculateMissingAttributesScore = function (car) {
  const requiredFields = ["brand", "model", "year", "price", "mileage", "fuel", "transmission", "bodyType", "color", "condition"];
  const providedFields = [];
  const missingFields = [];

  requiredFields.forEach(field => {
    if (car[field] && car[field] !== "") {
      providedFields.push(field);
    } else {
      missingFields.push(field);
    }
  });

  const score = (providedFields.length / requiredFields.length) * 100;

  return {
    score: Math.round(score),
    weight: 0.15,
    details: {
      missingFields,
      requiredFields,
      providedFields,
    },
  };
};

// Calculate inspection report score
listingQualitySchema.methods.calculateInspectionReportScore = async function (car) {
  const InspectionOrder = mongoose.model("InspectionOrder");
  const inspection = await InspectionOrder.findOne({ car: car._id, status: "completed" });

  if (!inspection) {
    return {
      score: 50, // Neutral score if no inspection
      weight: 0.15,
      details: {
        hasInspection: false,
        inspectionScore: null,
        conditionRating: null,
      },
    };
  }

  let score;
  const conditionRating = inspection.conditionRating;

  if (conditionRating === "excellent") score = 100;
  else if (conditionRating === "good") score = 75;
  else if (conditionRating === "fair") score = 50;
  else score = 25;

  return {
    score,
    weight: 0.15,
    details: {
      hasInspection: true,
      inspectionScore: inspection.overallScore,
      conditionRating,
    },
  };
};

// Calculate verification status score
listingQualitySchema.methods.calculateVerificationStatusScore = async function (dealer) {
  if (!dealer) {
    return {
      score: 50,
      weight: 0.10,
      details: {
        isVerified: false,
        verificationStatus: "No dealer",
      },
    };
  }

  const DealerVerification = mongoose.model("DealerVerification");
  const verification = await DealerVerification.findOne({ user: dealer._id });

  if (!verification) {
    return {
      score: 50,
      weight: 0.10,
      details: {
        isVerified: false,
        verificationStatus: "Not verified",
      },
    };
  }

  let score;
  const status = verification.verificationStatus;

  if (status === "approved") score = 100;
  else if (status === "pending" || status === "under_review") score = 50;
  else score = 0;

  return {
    score,
    weight: 0.10,
    details: {
      isVerified: status === "approved",
      verificationStatus: status,
    },
  };
};

// Generate recommendations
listingQualitySchema.methods.generateRecommendations = function (car, dealer) {
  const recommendations = [];
  const breakdown = this.scoreBreakdown || {};

  // Image recommendations
  if (breakdown.imageCount?.details?.imageCount < 5) {
    recommendations.push({
      category: "images",
      priority: "high",
      message: `Add more images. You have ${breakdown.imageCount.details.imageCount} images, recommended is 10+`,
      action: "Upload at least 5 more high-quality images showing exterior, interior, and engine",
    });
  }

  if (breakdown.imageQuality?.score < 70) {
    recommendations.push({
      category: "images",
      priority: "medium",
      message: "Improve image quality",
      action: "Upload higher resolution images with better lighting and multiple angles",
    });
  }

  // Description recommendations
  if (breakdown.descriptionQuality?.details?.wordCount < 50) {
    recommendations.push({
      category: "description",
      priority: "high",
      message: "Expand your description",
      action: "Add more details about the vehicle's condition, history, features, and maintenance",
    });
  }

  if (breakdown.descriptionQuality?.details?.completeness < 70) {
    recommendations.push({
      category: "description",
      priority: "medium",
      message: "Add more details to description",
      action: "Include information about condition, service history, and key features",
    });
  }

  // Attribute recommendations
  if (breakdown.missingAttributes?.details?.missingFields?.length > 0) {
    recommendations.push({
      category: "attributes",
      priority: "high",
      message: "Fill in missing vehicle details",
      action: `Complete these fields: ${breakdown.missingAttributes.details.missingFields.join(", ")}`,
    });
  }

  // Inspection recommendations
  if (!breakdown.inspectionReport?.details?.hasInspection) {
    recommendations.push({
      category: "inspection",
      priority: "medium",
      message: "Get a vehicle inspection",
      action: "Schedule a professional inspection to increase buyer confidence",
    });
  }

  // Verification recommendations
  if (!breakdown.verificationStatus?.details?.isVerified) {
    recommendations.push({
      category: "verification",
      priority: "low",
      message: "Complete dealer verification",
      action: "Submit verification documents to increase trust and visibility",
    });
  }

  return recommendations;
};

// Get quality rating based on score
listingQualitySchema.methods.getRating = function (score) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  return "Poor";
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Calculate quality score for a car
listingQualitySchema.statics.calculateForCar = async function (carId) {
  const Car = mongoose.model("Car");
  const car = await Car.findById(carId);
  if (!car) throw new Error("Car not found");

  let quality = await this.findOne({ car: carId });
  if (!quality) {
    quality = await this.create({
      car: carId,
      dealer: car.dealer,
    });
  }

  await quality.calculateScore();
  return quality;
};

// Get quality score for a car
listingQualitySchema.statics.getByCar = async function (carId) {
  return this.findOne({ car: carId }).populate("car");
};

// Get quality scores for a dealer
listingQualitySchema.statics.getByDealer = async function (dealerId) {
  return this.find({ dealer: dealerId }).populate("car");
};

// Get low quality listings
listingQualitySchema.statics.getLowQuality = async function (threshold = 50) {
  return this.find({ overallScore: { $lt: threshold } }).populate("car");
};

// Get quality distribution
listingQualitySchema.statics.getQualityDistribution = async function () {
  const distribution = await this.aggregate([
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
        avgScore: { $avg: "$overallScore" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return distribution;
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const ListingQuality = mongoose.models.ListingQuality || mongoose.model("ListingQuality", listingQualitySchema);

export default ListingQuality;
