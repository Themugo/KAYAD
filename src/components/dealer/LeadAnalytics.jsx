// src/components/dealer/LeadAnalytics.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Lead Analytics
// Charts and metrics for lead performance analysis
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Clock, Users, DollarSign } from "lucide-react";

const LeadAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30"); // days

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);
      const endDate = new Date();
      const response = await axios.get("/api/leads/analytics/summary", {
        params: { startDate, endDate },
      });
      setAnalytics(response.data.analytics);
      setError(null);
    } catch (err) {
      setError("Failed to load analytics");
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

  const conversionRate = analytics?.conversionMetrics?.conversionRate || 0;
  const avgResponseTime = analytics?.responseTimeMetrics?.averageResponseTime || 0;
  const totalLeads = analytics?.leadsBySource?.reduce((sum, s) => sum + s.count, 0) || 0;
  const totalValue = analytics?.leadsBySource?.reduce((sum, s) => sum + (s.totalValue || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        <Button
          variant={timeRange === "7" ? "default" : "outline"}
          size="sm"
          onClick={() => setTimeRange("7")}
        >
          7 Days
        </Button>
        <Button
          variant={timeRange === "30" ? "default" : "outline"}
          size="sm"
          onClick={() => setTimeRange("30")}
        >
          30 Days
        </Button>
        <Button
          variant={timeRange === "90" ? "default" : "outline"}
          size="sm"
          onClick={() => setTimeRange("90")}
        >
          90 Days
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold">{totalLeads}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold">KES {(totalValue / 1000000).toFixed(1)}M</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {conversionRate >= 20 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}m</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.leadsBySource?.map((source) => (
              <div key={source._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium capitalize">{source._id.replace("_", " ")}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{source.count}</div>
                  <div className="text-xs text-gray-500">
                    {totalLeads > 0 ? ((source.count / totalLeads) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.leadsByStage?.map((stage) => (
              <div key={stage._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className="bg-gray-500">{stage._id}</Badge>
                  <span className="font-medium capitalize">{stage._id.replace("_", " ")}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{stage.count}</div>
                  <div className="text-xs text-gray-500">
                    KES {(stage.totalValue / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hot Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Hot Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-500">
            {analytics?.hotLeadsCount || 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            High priority leads requiring attention
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadAnalytics;
