// src/components/admin/ListingQualityDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Listing Quality Dashboard
// Platform-wide quality monitoring and analytics
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, AlertTriangle, TrendingUp, RefreshCw, BarChart3, CheckCircle, XCircle } from "lucide-react";

const AdminListingQualityDashboard = () => {
  const [platformStats, setPlatformStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [lowQualityListings, setLowQualityListings] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchPlatformStats();
    fetchTrends();
    fetchLowQualityListings();
    fetchBenchmarks();
  }, [period]);

  const fetchPlatformStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/listing-quality/platform/stats");
      setPlatformStats(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load platform stats");
      console.error("Error fetching platform stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await axios.get(`/api/listing-quality/platform/trends?period=${period}`);
      setTrends(response.data.data);
    } catch (err) {
      console.error("Error fetching trends:", err);
    }
  };

  const fetchLowQualityListings = async () => {
    try {
      const response = await axios.get("/api/listing-quality/platform/low-quality?threshold=50&limit=20");
      setLowQualityListings(response.data.data);
    } catch (err) {
      console.error("Error fetching low quality listings:", err);
    }
  };

  const fetchBenchmarks = async () => {
    try {
      const response = await axios.get("/api/listing-quality/platform/benchmarks");
      setBenchmarks(response.data.data);
    } catch (err) {
      console.error("Error fetching benchmarks:", err);
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

  if (!platformStats) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No quality data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin Listing Quality Dashboard</h2>
        <div className="flex gap-2">
          <Button
            variant={period === 7 ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(7)}
          >
            7 Days
          </Button>
          <Button
            variant={period === 30 ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(30)}
          >
            30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPlatformStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.totalListings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <div className="text-2xl font-bold">{platformStats.averageScore.toFixed(1)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Median Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats.medianScore.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Min Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{platformStats.minScore}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Max Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{platformStats.maxScore}</div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Platform Rating Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {platformStats.ratingDistribution && platformStats.ratingDistribution.map((dist) => (
              <div key={dist._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {dist._id === "Excellent" && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {dist._id === "Good" && <Star className="w-5 h-5 text-blue-500" />}
                  {dist._id === "Average" && <AlertTriangle className="w-5 h-5 text-orange-500" />}
                  {dist._id === "Poor" && <XCircle className="w-5 h-5 text-red-500" />}
                  <span className="font-medium">{dist._id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">{dist.count}</div>
                  <div className="text-sm text-gray-500">avg: {dist.avgScore.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quality Benchmarks */}
      {benchmarks && (
        <Card>
          <CardHeader>
            <CardTitle>Quality Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-3">Score Thresholds</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Excellent</span>
                    <Badge variant="default">≥ {benchmarks.excellentThreshold}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Good</span>
                    <Badge variant="secondary">≥ {benchmarks.goodThreshold}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Average</span>
                    <Badge variant="outline">≥ {benchmarks.averageThreshold}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Poor</span>
                    <Badge variant="destructive">&lt; {benchmarks.averageThreshold}</Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Platform Averages</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Platform Average</span>
                    <span className="font-bold">{benchmarks.platformAverage.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Median</span>
                    <span className="font-bold">{benchmarks.platformMedian.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Quality Listings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Low Quality Listings Needing Improvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lowQualityListings && lowQualityListings.length > 0 ? (
              lowQualityListings.map((listing, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{listing.carTitle}</div>
                    <div className="text-sm text-gray-500">
                      Score: {listing.overallScore} | Rating: {listing.rating}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">{listing.recommendations.length} recommendations</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                No low quality listings found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quality Trends */}
      {trends && trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Quality Trends ({period} Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trends.slice(0, 10).map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{trend._id.date}</div>
                    <div className="text-sm text-gray-500">{trend._id.rating}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{trend.count}</div>
                    <div className="text-xs text-gray-500">avg: {trend.avgScore.toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminListingQualityDashboard;
