// src/components/admin/MarketAnalyticsDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Market Analytics Dashboard
// Overview of market trends, prices, and vehicle performance
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Car, DollarSign, Activity, MapPin, RefreshCw } from "lucide-react";

const MarketAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("monthly");

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/analytics/market/summary?period=${period}`);
      setAnalytics(response.data.data);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Market Analytics Dashboard</h2>
        <div className="flex gap-2">
          <Button
            variant={period === "daily" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("daily")}
          >
            Daily
          </Button>
          <Button
            variant={period === "weekly" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("weekly")}
          >
            Weekly
          </Button>
          <Button
            variant={period === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Selling Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold">
                KES {(analytics.averageSellingPrice / 1000000).toFixed(1)}M
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Listing Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold">
                KES {(analytics.averageListingPrice / 1000000).toFixed(1)}M
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-purple-500" />
              <div className="text-2xl font-bold">{analytics.totalListings}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              <div className="text-2xl font-bold">{analytics.conversionRate?.toFixed(1) || 0}%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Days on Market</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageDaysOnMarket?.toFixed(0) || 0} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Median Days on Market</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.medianDaysOnMarket?.toFixed(0) || 0} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Fastest Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.fastestSaleDays || 0} days</div>
          </CardContent>
        </Card>
      </div>

      {/* Price Range */}
      <Card>
        <CardHeader>
          <CardTitle>Price Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Minimum</div>
              <div className="text-lg font-bold">KES {(analytics.priceRange?.min / 1000000).toFixed(1)}M</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Median</div>
              <div className="text-lg font-bold">KES {(analytics.priceRange?.median / 1000000).toFixed(1)}M</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Maximum</div>
              <div className="text-lg font-bold">KES {(analytics.priceRange?.max / 1000000).toFixed(1)}M</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.brandTrends?.slice(0, 5).map((brand) => (
              <div key={brand.brand} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Car className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{brand.brand}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">KES {(brand.averagePrice / 1000000).toFixed(1)}M</div>
                  <div className="text-xs text-gray-500">{brand.volume} listings</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* County Trends */}
      <Card>
        <CardHeader>
          <CardTitle>County Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.countyTrends?.slice(0, 5).map((county) => (
              <div key={county.county} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{county.county}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">KES {(county.averagePrice / 1000000).toFixed(1)}M</div>
                  <div className="text-xs text-gray-500">{county.volume} listings</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Most Viewed Vehicles */}
      <Card>
        <CardHeader>
          <CardTitle>Most Viewed Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.mostViewed?.slice(0, 5).map((vehicle) => (
              <div key={vehicle.carId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{vehicle.title}</div>
                  <div className="text-sm text-gray-500">{vehicle.views} views</div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  KES {(vehicle.price / 1000000).toFixed(1)}M
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fastest Selling Vehicles */}
      <Card>
        <CardHeader>
          <CardTitle>Fastest Selling Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.fastestSelling?.slice(0, 5).map((vehicle) => (
              <div key={vehicle.carId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{vehicle.title}</div>
                  <div className="text-sm text-gray-500">{vehicle.daysOnMarket} days on market</div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  KES {(vehicle.sellingPrice / 1000000).toFixed(1)}M
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketAnalyticsDashboard;
