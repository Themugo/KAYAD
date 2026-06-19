// src/components/admin/MarketplaceHealthDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Marketplace Health Dashboard
// Overview of platform health metrics and alerts
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Users, Car, DollarSign, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

const MarketplaceHealthDashboard = () => {
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("daily");

  useEffect(() => {
    fetchHealth();
    fetchAlerts();
  }, [period]);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/marketplace-health/summary?period=${period}`);
      setHealth(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load health data");
      console.error("Error fetching health:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get("/api/marketplace-health/alerts");
      setAlerts(response.data.data);
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.post(`/api/marketplace-health/alerts/${alertId}/resolve`);
      fetchAlerts();
    } catch (err) {
      console.error("Error resolving alert:", err);
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

  if (!health) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No health data available
      </div>
    );
  }

  const healthScoreColor = health.healthScore >= 90 ? "text-green-600" : 
                          health.healthScore >= 75 ? "text-blue-600" : 
                          health.healthScore >= 60 ? "text-yellow-600" : 
                          health.healthScore >= 40 ? "text-orange-600" : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Marketplace Health Dashboard</h2>
        <div className="flex gap-2">
          <Button
            variant={period === "hourly" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("hourly")}
          >
            Hourly
          </Button>
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
          <Button variant="outline" size="sm" onClick={fetchHealth}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Score Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Health Score</span>
            <Badge variant={health.healthScore >= 75 ? "default" : "destructive"}>
              {health.healthScore >= 90 ? "Excellent" : 
               health.healthScore >= 75 ? "Good" : 
               health.healthScore >= 60 ? "Fair" : 
               health.healthScore >= 40 ? "Poor" : "Critical"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-6xl font-bold ${healthScoreColor}`}>
            {health.healthScore}
          </div>
          <div className="text-sm text-gray-500 mt-2">out of 100</div>
        </CardContent>
      </Card>

      {/* Health Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Health Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Inventory Health</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${health.healthScoreBreakdown?.inventoryHealth || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{health.healthScoreBreakdown?.inventoryHealth || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Conversion Health</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${health.healthScoreBreakdown?.conversionHealth || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{health.healthScoreBreakdown?.conversionHealth || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">User Activity</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${health.healthScoreBreakdown?.userActivity || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{health.healthScoreBreakdown?.userActivity || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Financial Health</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${health.healthScoreBreakdown?.financialHealth || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{health.healthScoreBreakdown?.financialHealth || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Trust & Safety</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${health.healthScoreBreakdown?.trustSafety || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{health.healthScoreBreakdown?.trustSafety || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Dealers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold">{health.activeDealers}</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">+{health.newDealers} new</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold">{health.activeBuyers}</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">+{health.newBuyers} new</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Vehicles Listed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-purple-500" />
              <div className="text-2xl font-bold">{health.vehiclesListed}</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">+{health.newListings} new</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Vehicles Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-orange-500" />
              <div className="text-2xl font-bold">{health.vehiclesSold}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overall Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.overallConversionRate?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Escrow Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.escrowConversionRate?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Auction Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.auctionConversionRate?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Lead Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.leadConversionRate?.toFixed(1) || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Trust & Safety Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Fraud Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div className="text-2xl font-bold">{health.fraudIncidents}</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{health.fraudRate?.toFixed(1) || 0}% rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Disputes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div className="text-2xl font-bold">{health.disputes}</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{health.disputeRate?.toFixed(1) || 0}% rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold">
                KES {(health.revenue / 1000000).toFixed(1)}M
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Payment Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.paymentSuccessRate?.toFixed(1) || 0}%</div>
            <div className="text-xs text-gray-500 mt-1">{health.paymentFailures} failures</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              No active alerts
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.severity === "critical" ? "text-red-500" :
                      alert.severity === "high" ? "text-orange-500" :
                      alert.severity === "medium" ? "text-yellow-500" :
                      "text-blue-500"
                    }`} />
                    <div>
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(alert.triggeredAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlert(alert._id)}
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketplaceHealthDashboard;
