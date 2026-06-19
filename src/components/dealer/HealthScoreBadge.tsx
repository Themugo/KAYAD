// src/components/dealer/HealthScoreBadge.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Dashboard Widget: Health Score Badge
// Displays current health score and category with visual indicator
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";

const HealthScoreBadge = ({ dealerId }) => {
  const [healthScore, setHealthScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dealerId) {
      fetchHealthScore();
    }
  }, [dealerId]);

  const fetchHealthScore = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/dealer-health-score/${dealerId}`);
      setHealthScore(response.data.healthScore);
    } catch (err) {
      console.error("Error fetching health score:", err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      platinum: "bg-purple-500",
      gold: "bg-yellow-500",
      silver: "bg-gray-400",
      warning: "bg-orange-500",
      high_risk: "bg-red-500",
    };
    return colors[category] || "bg-gray-500";
  };

  const getCategoryLabel = (category) => {
    const labels = {
      platinum: "Platinum",
      gold: "Gold",
      silver: "Silver",
      warning: "Warning",
      high_risk: "High Risk",
    };
    return labels[category] || category;
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case "down":
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      default:
        return <Minus className="w-3 h-3 text-gray-500" />;
    }
  };

  if (loading || !healthScore) {
    return (
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-gray-400" />
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
        <Shield className="w-5 h-5 text-gray-600" />
        <div className="text-2xl font-bold">{healthScore.healthScore}</div>
        <Badge className={getCategoryColor(healthScore.scoreCategory)}>
          {getCategoryLabel(healthScore.scoreCategory)}
        </Badge>
      </div>
      {healthScore.trend && (
        <div className="flex items-center gap-1 text-sm">
          {getTrendIcon(healthScore.trend)}
          <span className={healthScore.trend === "up" ? "text-green-500" : healthScore.trend === "down" ? "text-red-500" : "text-gray-500"}>
            {Math.abs(healthScore.scoreChange)} pts
          </span>
        </div>
      )}
    </div>
  );
};

export default HealthScoreBadge;
