// src/components/dealer/CRMDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer CRM Dashboard
// Overview of lead counts, metrics, and recent activity
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, TrendingUp, Clock, AlertCircle } from "lucide-react";

const CRMDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, pipelineRes] = await Promise.all([
        axios.get("/api/leads/analytics/summary"),
        axios.get("/api/leads/pipeline/view"),
      ]);
      setAnalytics(analyticsRes.data.analytics);
      setPipeline(pipelineRes.data.pipeline);
      setError(null);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      new: "bg-blue-500",
      contacted: "bg-green-500",
      negotiating: "bg-yellow-500",
      test_drive: "bg-purple-500",
      escrow_started: "bg-orange-500",
      sold: "bg-emerald-500",
      lost: "bg-red-500",
    };
    return colors[stage] || "bg-gray-500";
  };

  const getStageLabel = (stage) => {
    const labels = {
      new: "New",
      contacted: "Contacted",
      negotiating: "Negotiating",
      test_drive: "Test Drive",
      escrow_started: "Escrow Started",
      sold: "Sold",
      lost: "Lost",
    };
    return labels[stage] || stage;
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
        <AlertCircle className="w-6 h-6 mr-2" />
        {error}
      </div>
    );
  }

  const totalLeads = pipeline?.reduce((sum, stage) => sum + stage.count, 0) || 0;
  const totalValue = pipeline?.reduce((sum, stage) => sum + (stage.totalValue || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
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
              <TrendingUp className="w-5 h-5 text-green-500" />
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
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div className="text-2xl font-bold">
                {analytics?.conversionMetrics?.conversionRate?.toFixed(1) || 0}%
              </div>
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
              <div className="text-2xl font-bold">
                {analytics?.responseTimeMetrics?.averageResponseTime?.toFixed(0) || 0}m
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pipeline?.map((stage) => (
              <div key={stage._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={getStageColor(stage._id)}>
                    {getStageLabel(stage._id)}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    KES {(stage.totalValue / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{stage.count}</div>
                  <div className="text-xs text-gray-500">
                    {totalLeads > 0 ? ((stage.count / totalLeads) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <span className="font-medium capitalize">{source._id.replace("_", " ")}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{source.count}</div>
                  <div className="text-xs text-gray-500">
                    KES {(source.totalValue / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMDashboard;
