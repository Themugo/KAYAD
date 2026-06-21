// src/components/dealer/HealthScoreBreakdown.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Dashboard Widget: Health Score Breakdown
// Displays detailed breakdown of health score factors
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

const HealthScoreBreakdown = ({ dealerId }) => {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dealerId) {
      fetchBreakdown();
    }
  }, [dealerId]);

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/dealer-health-score/${dealerId}/details`);
      setBreakdown(response.data);
    } catch (err) {
      console.error("Error fetching breakdown:", err);
    } finally {
      setLoading(false);
    }
  };

  const getFactorIcon = (factor) => {
    const icons = {
      verification: <CheckCircle className="w-4 h-4" />,
      accountAge: <Shield className="w-4 h-4" />,
      transaction: <TrendingUp className="w-4 h-4" />,
      escrow: <Shield className="w-4 h-4" />,
      review: <TrendingUp className="w-4 h-4" />,
      fraud: <AlertCircle className="w-4 h-4" />,
      response: <TrendingUp className="w-4 h-4" />,
      listingQuality: <CheckCircle className="w-4 h-4" />,
      auction: <TrendingUp className="w-4 h-4" />,
    };
    return icons[factor] || <Shield className="w-4 h-4" />;
  };

  const getFactorLabel = (factor) => {
    const labels = {
      verification: "Verification Completeness",
      accountAge: "Account Age",
      transaction: "Transaction Performance",
      escrow: "Escrow Completion",
      review: "Customer Reviews",
      fraud: "Fraud Flags",
      response: "Response Speed",
      listingQuality: "Listing Quality",
      auction: "Auction Performance",
    };
    return labels[factor] || factor;
  };

  const getScoreColor = (score, factor) => {
    if (factor === "fraud") {
      return score >= -20 ? "bg-green-500" : score >= -50 ? "bg-yellow-500" : "bg-red-500";
    }
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading || !breakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const factors = [
    { key: "verification", ...breakdown.breakdown.verification },
    { key: "accountAge", ...breakdown.breakdown.accountAge },
    { key: "transaction", ...breakdown.breakdown.transaction },
    { key: "escrow", ...breakdown.breakdown.escrow },
    { key: "review", ...breakdown.breakdown.review },
    { key: "fraud", ...breakdown.breakdown.fraud },
    { key: "response", ...breakdown.breakdown.response },
    { key: "listingQuality", ...breakdown.breakdown.listingQuality },
    { key: "auction", ...breakdown.breakdown.auction },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-500 mb-4">
          Overall Score: <span className="font-bold text-lg">{breakdown.healthScore.healthScore}</span>
        </div>
        
        {factors.map((factor) => (
          <div key={factor.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getFactorIcon(factor.key)}
                <span className="font-medium">{getFactorLabel(factor.key)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{factor.score.toFixed(0)}</span>
                <span className="text-xs text-gray-500">{factor.weight}</span>
              </div>
            </div>
            <Progress value={Math.abs(factor.score)} className="h-2" />
            <div className="text-xs text-gray-500">
              {factor.key === "fraud" && factor.details?.totalFlags > 0 && (
                <span className="text-red-500">
                  {factor.details.totalFlags} flag(s) detected
                </span>
              )}
              {factor.key === "verification" && (
                <span>Completeness: {factor.details?.completeness || 0}%</span>
              )}
              {factor.key === "review" && (
                <span>
                  {factor.details?.totalReviews || 0} reviews, avg rating: {factor.details?.averageRating?.toFixed(1) || 0}
                </span>
              )}
              {factor.key === "transaction" && (
                <span>
                  {factor.details?.totalTransactions || 0} transactions, {factor.details?.successRate?.toFixed(1) || 0}% success rate
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default HealthScoreBreakdown;
