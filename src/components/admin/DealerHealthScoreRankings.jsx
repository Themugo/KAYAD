// src/components/admin/DealerHealthScoreRankings.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Dashboard Widget: Dealer Health Score Rankings
// Displays top and bottom dealers by health score
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

const DealerHealthScoreRankings = () => {
  const [topDealers, setTopDealers] = useState([]);
  const [bottomDealers, setBottomDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    fetchRankings();
  }, [category]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const [topResponse, bottomResponse] = await Promise.all([
        axios.get(`/api/dealer-health-score/ranking/list?limit=10&category=${category || ""}`),
        axios.get(`/api/dealer-health-score/ranking/list?limit=10&category=${category || ""}&sort=asc`),
      ]);
      
      setTopDealers(topResponse.data.ranking);
      setBottomDealers(bottomResponse.data.ranking);
      setError(null);
    } catch (err) {
      setError("Failed to load rankings");
      console.error("Error fetching rankings:", err);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Dealer Health Score Rankings
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
            <Trophy className="w-5 h-5" />
            Dealer Health Score Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Dealer Health Score Rankings
          </div>
          <Button variant="outline" size="sm" onClick={fetchRankings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={category === null ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(null)}
          >
            All
          </Button>
          <Button
            variant={category === "platinum" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory("platinum")}
          >
            Platinum
          </Button>
          <Button
            variant={category === "gold" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory("gold")}
          >
            Gold
          </Button>
          <Button
            variant={category === "silver" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory("silver")}
          >
            Silver
          </Button>
        </div>

        {/* Top Dealers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <div className="font-medium">Top Performing Dealers</div>
          </div>
          <div className="space-y-2">
            {topDealers.slice(0, 5).map((dealer, index) => (
              <div
                key={dealer._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="font-bold text-lg">#{index + 1}</div>
                  <div>
                    <div className="font-medium">{dealer.dealer?.businessName || dealer.dealer?.name}</div>
                    <div className="text-sm text-gray-500">{dealer.dealer?.location}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{dealer.healthScore}</div>
                  <Badge className={getCategoryColor(dealer.scoreCategory)}>
                    {getCategoryLabel(dealer.scoreCategory)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Dealers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <div className="font-medium">Dealers Requiring Attention</div>
          </div>
          <div className="space-y-2">
            {bottomDealers.slice(0, 5).map((dealer, index) => (
              <div
                key={dealer._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="font-bold text-lg text-red-500">#{index + 1}</div>
                  <div>
                    <div className="font-medium">{dealer.dealer?.businessName || dealer.dealer?.name}</div>
                    <div className="text-sm text-gray-500">{dealer.dealer?.location}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-500">{dealer.healthScore}</div>
                  <Badge className={getCategoryColor(dealer.scoreCategory)}>
                    {getCategoryLabel(dealer.scoreCategory)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DealerHealthScoreRankings;
