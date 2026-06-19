// src/components/dealer/DealerMarketAnalytics.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Market Analytics Dashboard
// Dealer-specific market insights and performance metrics
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Car, DollarSign, Activity, Target, RefreshCw } from "lucide-react";

const DealerMarketAnalytics = ({ dealerId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dealerId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [dealerRes, marketRes] = await Promise.all([
        axios.get(`/api/analytics/market/dealer/${dealerId}`),
        axios.get("/api/analytics/market/summary?period=monthly"),
      ]);
      setAnalytics(dealerRes.data.data);
      setMarketData(marketRes.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load analytics data");
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No analytics data available
      </div>
    );
  }

  const marketAvgPrice = marketData?.averageSellingPrice || 0;
  const dealerVsMarket = analytics.averagePrice > 0 ? ((analytics.averagePrice - marketAvgPrice) / marketAvgPrice) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dealer Market Analytics</h2>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold">{analytics.listings}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold">{analytics.sales}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-500" />
              <div className="text-2xl font-bold">
                KES {(analytics.averagePrice / 1000000).toFixed(1)}M
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              <div className="text-2xl font-bold">{analytics.totalViews}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {analytics.conversionRate >= 20 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <div className="text-2xl font-bold">{analytics.conversionRate?.toFixed(1) || 0}%</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Industry avg: 25%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Days on Market</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold">{analytics.averageDaysOnMarket?.toFixed(0) || 0} days</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Market avg: {marketData?.averageDaysOnMarket?.toFixed(0) || 0} days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Price vs Market</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {dealerVsMarket >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <div className="text-2xl font-bold">{dealerVsMarket?.toFixed(1) || 0}%</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {dealerVsMarket >= 0 ? "Above market" : "Below market"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Position */}
      <Card>
        <CardHeader>
          <CardTitle>Market Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Your Average Price</span>
              <span className="font-bold">KES {(analytics.averagePrice / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Market Average Price</span>
              <span className="font-bold">KES {(marketAvgPrice / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Your Conversion Rate</span>
              <span className="font-bold">{analytics.conversionRate?.toFixed(1) || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Market Conversion Rate</span>
              <span className="font-bold">{marketData?.conversionRate?.toFixed(1) || 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dealerVsMarket > 10 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-yellow-800 mb-1">Consider Pricing Adjustment</div>
                <div className="text-sm text-yellow-700">
                  Your prices are {dealerVsMarket.toFixed(1)}% above market average. Consider adjusting to improve conversion rate.
                </div>
              </div>
            )}
            {dealerVsMarket < -10 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800 mb-1">Competitive Pricing</div>
                <div className="text-sm text-green-700">
                  Your prices are {Math.abs(dealerVsMarket).toFixed(1)}% below market average. This may help attract more buyers.
                </div>
              </div>
            )}
            {analytics.conversionRate < 15 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="font-medium text-orange-800 mb-1">Improve Conversion Rate</div>
                <div className="text-sm text-orange-700">
                  Your conversion rate is below industry average. Consider improving vehicle descriptions, adding more photos, or adjusting prices.
                </div>
              </div>
            )}
            {analytics.conversionRate >= 25 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800 mb-1">Excellent Performance</div>
                <div className="text-sm text-green-700">
                  Your conversion rate is above industry average. Keep up the great work!
                </div>
              </div>
            )}
            {dealerVsMarket >= -5 && dealerVsMarket <= 5 && analytics.conversionRate >= 20 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-800 mb-1">Optimal Market Position</div>
                <div className="text-sm text-blue-700">
                  Your pricing is competitive and conversion rate is healthy. You're well-positioned in the market.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Market Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Market Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium mb-1">Average Selling Price</div>
              <div className="text-lg font-bold">KES {(marketData?.averageSellingPrice / 1000000).toFixed(1)}M</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium mb-1">Average Listing Price</div>
              <div className="text-lg font-bold">KES {(marketData?.averageListingPrice / 1000000).toFixed(1)}M</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium mb-1">Average Days on Market</div>
              <div className="text-lg font-bold">{marketData?.averageDaysOnMarket?.toFixed(0) || 0} days</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerMarketAnalytics;
