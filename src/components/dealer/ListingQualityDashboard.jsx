// src/components/dealer/ListingQualityDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Listing Quality Dashboard
// Shows listing quality scores and improvement recommendations
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, AlertTriangle, TrendingUp, RefreshCw, CheckCircle, XCircle, Info } from "lucide-react";

const ListingQualityDashboard = () => {
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const dealerId = localStorage.getItem("userId"); // Assuming dealer ID is stored

  useEffect(() => {
    fetchStats();
    fetchReport();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/listing-quality/dealer/${dealerId}/stats`);
      setStats(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load quality stats");
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      const response = await axios.get(`/api/listing-quality/dealer/${dealerId}/report`);
      setReport(response.data.data);
    } catch (err) {
      console.error("Error fetching report:", err);
    }
  };

  const handleBulkRecalculate = async () => {
    try {
      await axios.post(`/api/listing-quality/dealer/${dealerId}/bulk-recalculate`);
      fetchStats();
      fetchReport();
    } catch (err) {
      console.error("Error recalculating:", err);
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

  if (!stats) {
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
        <h2 className="text-2xl font-bold">Listing Quality Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkRecalculate}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Recalculate All
          </Button>
        </div>
      </div>

      {/* Quality Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <div className="text-2xl font-bold">{stats.averageScore}</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">out of 100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalListings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Excellent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{stats.ratingDistribution?.Excellent || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Poor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div className="text-2xl font-bold text-red-600">{stats.ratingDistribution?.Poor || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Excellent (90-100)</span>
              <Badge variant="default">{stats.ratingDistribution?.Excellent || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Good (70-89)</span>
              <Badge variant="secondary">{stats.ratingDistribution?.Good || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Average (50-69)</span>
              <Badge variant="outline">{stats.ratingDistribution?.Average || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Poor (0-49)</span>
              <Badge variant="destructive">{stats.ratingDistribution?.Poor || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Recommendations */}
      {stats.topRecommendations && stats.topRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Top Improvement Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topRecommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{rec.message}</div>
                      <div className="text-sm text-gray-600 mt-1">{rec.action}</div>
                    </div>
                    <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}>
                      {rec.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Quality Report */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Quality Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">Improvement Areas</h4>
                <div className="space-y-2">
                  {report.improvementAreas.map((area, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{area.category}</span>
                        <Badge>{area.count} listings</Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {area.recommendations.slice(0, 2).map((rec, i) => (
                          <div key={i}>• {rec}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Quality Improvement Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-800 mb-2">Images</div>
              <p className="text-sm text-blue-700">
                Upload 10+ high-quality images showing exterior, interior, engine, and key features. Good lighting and multiple angles significantly improve quality score.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-800 mb-2">Description</div>
              <p className="text-sm text-green-700">
                Write detailed descriptions (100+ words) including vehicle condition, service history, unique features, and maintenance records.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="font-semibold text-purple-800 mb-2">Attributes</div>
              <p className="text-sm text-purple-700">
                Complete all required fields: brand, model, year, price, mileage, fuel type, transmission, body type, color, and condition.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="font-semibold text-orange-800 mb-2">Inspection</div>
              <p className="text-sm text-orange-700">
                Get a professional vehicle inspection to increase buyer confidence and improve your quality score.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ListingQualityDashboard;
