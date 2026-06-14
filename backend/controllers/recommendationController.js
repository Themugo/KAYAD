import { getPersonalizedRecommendations } from "../services/recommendationService.js";

// =============================
// 🎯 GET PERSONALIZED RECOMMENDATIONS
// =============================

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const recommendations = await getPersonalizedRecommendations(userId);

    if (!recommendations) {
      return res.status(404).json({ success: false, message: "Unable to generate recommendations" });
    }

    res.json({ success: true, recommendations });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({ success: false, message: "Failed to get recommendations" });
  }
};
