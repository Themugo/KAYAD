import Car from "../models/Car.ts";

// =============================
// 🤖 AI LISTING ASSISTANT
// =============================

export const analyzeListingQuality = async (carId) => {
  try {
    const car = await Car.findById(carId);
    if (!car) return null;

    const issues = [];
    const warnings = [];
    const suggestions = [];

    // =============================
    // 🖼️ IMAGE QUALITY CHECK
    // =============================
    if (!car.images || car.images.length === 0) {
      issues.push({
        type: "missing_images",
        severity: "critical",
        message: "No images uploaded",
        suggestion: "Add at least 5 high-quality images of the vehicle",
      });
    } else if (car.images.length < 5) {
      warnings.push({
        type: "insufficient_images",
        severity: "medium",
        message: `Only ${car.images.length} image(s) uploaded`,
        suggestion: "Add more images to increase buyer confidence",
      });
    }

    // =============================
    // 📝 MISSING FIELDS CHECK
    // =============================
    const requiredFields = [
      { field: "title", label: "Vehicle Title" },
      { field: "description", label: "Description" },
      { field: "price", label: "Price" },
      { field: "year", label: "Year" },
      { field: "make", label: "Make" },
      { field: "model", label: "Model" },
      { field: "mileage", label: "Mileage" },
      { field: "fuelType", label: "Fuel Type" },
      { field: "transmission", label: "Transmission" },
      { field: "location", label: "Location" },
    ];

    const missingFields = requiredFields.filter((f) => !car[f.field] || car[f.field] === "" || car[f.field] === 0);

    if (missingFields.length > 0) {
      issues.push({
        type: "missing_fields",
        severity: "critical",
        message: `${missingFields.length} required field(s) missing`,
        missingFields: missingFields.map((f) => f.label),
        suggestion: "Complete all required fields to improve listing quality",
      });
    }

    // =============================
    // 💰 PRICE OUTLIER CHECK
    // =============================
    if (car.price && car.price > 0) {
      const similarCars = await Car.find({
        make: car.make,
        model: car.model,
        year: { $gte: car.year - 2, $lte: car.year + 2 },
        status: "active",
        price: { $gt: 0 },
      });

      if (similarCars.length >= 3) {
        const prices = similarCars.map((c) => c.price);
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length);

        // Check if price is more than 2 standard deviations from mean
        const zScore = (car.price - avgPrice) / stdDev;

        if (zScore > 2) {
          warnings.push({
            type: "price_outlier",
            severity: "medium",
            message: "Price is significantly above market average",
            currentPrice: car.price,
            marketAverage: Math.round(avgPrice),
            deviation: zScore.toFixed(2) + " standard deviations",
            suggestion: "Consider adjusting price to be more competitive",
          });
        } else if (zScore < -2) {
          warnings.push({
            type: "price_outlier",
            severity: "low",
            message: "Price is significantly below market average",
            currentPrice: car.price,
            marketAverage: Math.round(avgPrice),
            deviation: zScore.toFixed(2) + " standard deviations",
            suggestion: "Ensure price reflects vehicle condition accurately",
          });
        }
      }
    }

    // =============================
    // 📄 DESCRIPTION QUALITY CHECK
    // =============================
    if (car.description) {
      const descLength = car.description.length;

      if (descLength < 50) {
        issues.push({
          type: "weak_description",
          severity: "critical",
          message: "Description is too short",
          currentLength: descLength,
          suggestion: "Add more details about the vehicle's condition, history, and features",
        });
      } else if (descLength < 200) {
        warnings.push({
          type: "weak_description",
          severity: "medium",
          message: "Description could be more detailed",
          currentLength: descLength,
          suggestion: "Expand description with more vehicle information",
        });
      }

      // Check for common description issues
      const descriptionIssues = [];

      if (!car.description.toLowerCase().includes("condition")) {
        descriptionIssues.push("vehicle condition");
      }
      if (!car.description.toLowerCase().includes("history")) {
        descriptionIssues.push("service history");
      }
      if (!car.description.toLowerCase().includes("feature")) {
        descriptionIssues.push("key features");
      }

      if (descriptionIssues.length > 0) {
        suggestions.push({
          type: "description_improvement",
          message: "Consider adding these details to your description",
          suggestions: descriptionIssues,
        });
      }
    }

    // =============================
    // 📊 OVERALL QUALITY SCORE
    // =============================
    let qualityScore = 100;

    // Deduct points for issues
    qualityScore -= issues.length * 20; // 20 points per critical issue
    qualityScore -= warnings.length * 10; // 10 points per warning

    // Add points for good practices
    if (car.images && car.images.length >= 10) qualityScore += 5;
    if (car.description && car.description.length >= 500) qualityScore += 5;
    if (car.vin) qualityScore += 5;
    if (car.condition) qualityScore += 5;

    qualityScore = Math.max(0, Math.min(100, qualityScore));

    // =============================
    // 🎯 QUALITY TIER
    // =============================
    let qualityTier = "needs_improvement";
    if (qualityScore >= 90) qualityTier = "excellent";
    else if (qualityScore >= 75) qualityTier = "good";
    else if (qualityScore >= 50) qualityTier = "fair";

    return {
      carId,
      qualityScore,
      qualityTier,
      issues,
      warnings,
      suggestions,
      readyToPublish: issues.length === 0,
    };
  } catch (error) {
    console.error("Error analyzing listing quality:", error);
    return null;
  }
};

// =============================
// 🔄 BATCH ANALYZE LISTINGS
// =============================

export const batchAnalyzeListings = async (carIds) => {
  const results = [];

  for (const carId of carIds) {
    try {
      const analysis = await analyzeListingQuality(carId);
      if (analysis) {
        results.push(analysis);
      }
    } catch (error) {
      console.error(`Error analyzing car ${carId}:`, error);
    }
  }

  return results;
};

// =============================
// 📊 GET LISTING QUALITY STATS
// =============================

export const getListingQualityStats = async (dealerId) => {
  try {
    const cars = await Car.find({ dealer: dealerId });
    const analyses = await batchAnalyzeListings(cars.map((c) => c._id));

    const excellent = analyses.filter((a) => a.qualityTier === "excellent").length;
    const good = analyses.filter((a) => a.qualityTier === "good").length;
    const fair = analyses.filter((a) => a.qualityTier === "fair").length;
    const needsImprovement = analyses.filter((a) => a.qualityTier === "needs_improvement").length;

    const avgQualityScore =
      analyses.length > 0 ? analyses.reduce((sum, a) => sum + a.qualityScore, 0) / analyses.length : 0;

    return {
      totalListings: analyses.length,
      excellent,
      good,
      fair,
      needsImprovement,
      averageQualityScore: Math.round(avgQualityScore),
    };
  } catch (error) {
    console.error("Error getting listing quality stats:", error);
    return null;
  }
};
