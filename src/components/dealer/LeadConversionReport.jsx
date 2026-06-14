// src/components/dealer/LeadConversionReport.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Lead Conversion Report
// Detailed conversion funnel and win/loss analysis
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CheckCircle, XCircle, Clock } from "lucide-react";

const LeadConversionReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30"); // days

  useEffect(() => {
    fetchReport();
  }, [timeRange]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000);
      const endDate = new Date();
      const response = await axios.get("/api/leads/conversion/report", {
        params: { startDate, endDate },
      });
      setReport(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load conversion report");
      console.error("Error fetching conversion report:", err);
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

  const conversionMetrics = report?.conversionMetrics || {};
  const responseTimeMetrics = report?.responseTimeMetrics || {};
  const conversionRate = conversionMetrics.conversionRate || 0;
  const totalLeads = conversionMetrics.totalLeads || 0;
  const soldLeads = conversionMetrics.soldLeads || 0;
  const lostLeads = totalLeads - soldLeads;
  const winRate = totalLeads > 0 ? (soldLeads / totalLeads) * 100 : 0;
  const avgResponseTime = responseTimeMetrics.averageResponseTime || 0;

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

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium">Total Leads</div>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div className="bg-blue-500 h-4 rounded-full" style={{ width: "100%" }}></div>
              </div>
              <div className="w-20 text-right font-bold">{totalLeads}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium">Sold</div>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div className="bg-green-500 h-4 rounded-full" style={{ width: `${conversionRate}%` }}></div>
              </div>
              <div className="w-20 text-right font-bold">{soldLeads}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium">Lost</div>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div className="bg-red-500 h-4 rounded-full" style={{ width: `${100 - conversionRate}%` }}></div>
              </div>
              <div className="w-20 text-right font-bold">{lostLeads}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="text-xs text-gray-500 mt-1">
              Industry avg: 25%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {soldLeads} won / {totalLeads} total
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
            <div className="text-xs text-gray-500 mt-1">
              Industry avg: 15m
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {conversionRate >= 25 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>Conversion Rate vs Industry</span>
              </div>
              <Badge className={conversionRate >= 25 ? "bg-green-500" : "bg-red-500"}>
                {conversionRate >= 25 ? "Above Average" : "Below Average"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {avgResponseTime <= 15 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>Response Time vs Industry</span>
              </div>
              <Badge className={avgResponseTime <= 15 ? "bg-green-500" : "bg-red-500"}>
                {avgResponseTime <= 15 ? "Above Average" : "Below Average"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {conversionRate < 20 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-yellow-800 mb-1">Improve Conversion Rate</div>
                <div className="text-sm text-yellow-700">
                  Focus on following up with leads in the "contacted" and "negotiating" stages.
                </div>
              </div>
            )}
            {avgResponseTime > 30 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="font-medium text-orange-800 mb-1">Reduce Response Time</div>
                <div className="text-sm text-orange-700">
                  Aim to respond to new leads within 15 minutes to improve conversion rates.
                </div>
              </div>
            )}
            {conversionRate >= 25 && avgResponseTime <= 15 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800 mb-1">Excellent Performance</div>
                <div className="text-sm text-green-700">
                  Your conversion rate and response time are above industry averages. Keep up the great work!
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadConversionReport;
