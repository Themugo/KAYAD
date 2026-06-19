import {
  analyzeListingQuality,
  batchAnalyzeListings,
  getListingQualityStats,
} from "../services/listingAssistantService.ts";

// =============================
// 🤖 ANALYZE LISTING QUALITY
// =============================

export const analyzeListing = async (req, res) => {
  try {
    const { carId } = req.params;

    const analysis = await analyzeListingQuality(carId);

    if (!analysis) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    res.json({ success: true, analysis });
  } catch (error) {
    console.error("Error analyzing listing:", error);
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
    console.error("Error batch analyzing listings:", error);
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
    console.error("Error getting dealer quality stats:", error);
    res.status(500).json({ success: false, message: "Failed to get dealer quality stats" });
  }
};
