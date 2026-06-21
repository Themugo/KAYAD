// src/components/admin/DealerHealthScoreOverview.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Dashboard Widget: Dealer Health Score Overview
// Displays overall health score statistics and distribution
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Award, Shield } from "lucide-react";

const DealerHealthScoreOverview = () => {
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDistribution();
  }, []);

  const fetchDistribution = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/dealer-health-score/admin/distribution");
      setDistribution(response.data.distribution);
      setError(null);
    } catch (err) {
      setError("Failed to load distribution data");
      console.error("Error fetching distribution:", err);
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
      platinum: "Platinum (90-100)",
      gold: "Gold (75-89)",
      silver: "Silver (60-74)",
      warning: "Warning (40-59)",
      high_risk: "High Risk (0-39)",
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Dealer Health Score Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Dealer Health Score Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-red-500">
            <AlertTriangle className="w-6 h-6 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalDealers = distribution?.reduce((sum, cat) => sum + cat.count, 0) || 0;
  const avgScore = distribution?.reduce((sum, cat) => sum + (cat.avgScore || 0) * cat.count, 0) / totalDealers || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Dealer Health Score Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Total Dealers</div>
            <div className="text-2xl font-bold">{totalDealers}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Average Score</div>
            <div className="text-2xl font-bold">{avgScore.toFixed(1)}</div>
          </div>
        </div>

        {/* Score Distribution */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Score Distribution</div>
          {distribution?.map((cat) => (
            <div key={cat._id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{getCategoryLabel(cat._id)}</span>
                <span className="font-medium">{cat.count} dealers</span>
              </div>
              <Progress value={(cat.count / totalDealers) * 100} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Avg Score: {cat.avgScore?.toFixed(1)}</span>
                <span>{((cat.count / totalDealers) * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DealerHealthScoreOverview;
