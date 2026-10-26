import {
  analyzeListingQuality,
  batchAnalyzeListings,
  getListingQualityStats,
} from "../services/listingAssistantService.js";
import { logError } from "../infrastructure/logging/index.js";
import { findById } from "../db/index.js";
import { canManageAnyListing } from "../config/roles.js";

// =============================
// 🤖 ANALYZE LISTING QUALITY
// =============================

export const analyzeListing = async (req, res) => {
  try {
    const { carId } = req.params;

    // Phase 13I: the quality analysis is a seller tool. It answered for ANY car id (including hidden, pending and draft listings) to
    // any signed-in user. Now: the listing's owner or listing-management staff only; everyone else gets the same 404 as a missing id.
    const owned = await findById("cars", carId, "id,dealer");
    if (!owned || (!canManageAnyListing(req.user) && String(owned.dealer ?? "") !== String(req.user?.id ?? ""))) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const analysis = await analyzeListingQuality(carId);

    if (!analysis) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    res.json({ success: true, analysis });
  } catch (error) {
    logError("Error analyzing listing:", error);
    res.status(500).json({ success: false, message: "Failed to analyze listing" });
  }
};

// =============================
// 📊 BATCH ANALYZE LISTINGS
// =============================

export const batchAnalyze = async (req, res) => {
  try {
    const { carIds } = req.body;

    if (!carIds || !Array.isArray(carIds)) {
      return res.status(400).json({ success: false, message: "carIds array is required" });
    }

    const analyses = await batchAnalyzeListings(carIds);

    res.json({ success: true, analyses });
  } catch (error) {
    logError("Error batch analyzing listings:", error);
    res.status(500).json({ success: false, message: "Failed to batch analyze listings" });
  }
};

// =============================
// 📊 GET DEALER LISTING QUALITY STATS
// =============================

export const getDealerQualityStats = async (req, res) => {
  try {
    const dealerId = req.user.id || req.user._id;

    const stats = await getListingQualityStats(dealerId);

    if (!stats) {
      return res.status(404).json({ success: false, message: "Dealer not found" });
    }

    res.json({ success: true, stats });
  } catch (error) {
    logError("Error getting dealer quality stats:", error);
    res.status(500).json({ success: false, message: "Failed to get dealer quality stats" });
  }
};
