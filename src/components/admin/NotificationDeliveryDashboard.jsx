// src/components/admin/NotificationDeliveryDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Notification Delivery Dashboard
// Platform-wide notification delivery monitoring and analytics
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Smartphone, RefreshCw, TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

const NotificationDeliveryDashboard = () => {
  const [deliveryStats, setDeliveryStats] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(24);

  useEffect(() => {
    fetchDeliveryStats();
    fetchPlatformStats();
    fetchTrends();
  }, [period]);

  const fetchDeliveryStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/notification-analytics/delivery-stats?period=${period}`);
      setDeliveryStats(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load delivery stats");
      console.error("Error fetching delivery stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformStats = async () => {
    try {
      const response = await axios.get(`/api/notification-analytics/platform-stats?period=${period}`);
      setPlatformStats(response.data.data);
    } catch (err) {
      console.error("Error fetching platform stats:", err);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await axios.get(`/api/notification-analytics/trends?period=${period}`);
      setTrends(response.data.data);
    } catch (err) {
      console.error("Error fetching trends:", err);
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

  if (!deliveryStats) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No delivery data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notification Delivery Dashboard</h2>
        <div className="flex gap-2">
          <Button
            variant={period === 24 ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(24)}
          >
            24 Hours
          </Button>
          <Button
            variant={period === 168 ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(168)}
          >
            7 Days
          </Button>
          <Button
            variant={period === 720 ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(720)}
          >
            30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDeliveryStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform Stats */}
      {platformStats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="text-2xl font-bold text-green-600">{platformStats.delivered}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Opened</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{platformStats.opened}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Clicked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{platformStats.clicked}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div className="text-2xl font-bold text-red-600">{platformStats.failed}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Delivery Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.deliveryRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Channel Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deliveryStats.map((stat) => (
              <div key={stat.channel} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {stat.channel === "email" && <Mail className="w-5 h-5 text-blue-500" />}
                  {stat.channel === "sms" && <MessageSquare className="w-5 h-5 text-green-500" />}
                  {stat.channel === "push" && <Smartphone className="w-5 h-5 text-purple-500" />}
                  {stat.channel === "whatsapp" && <MessageSquare className="w-5 h-5 text-green-600" />}
                  {stat.channel === "in_app" && <Smartphone className="w-5 h-5 text-orange-500" />}
                  <span className="font-medium capitalize">{stat.channel}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-bold">{stat.total}</div>
                    <div className="text-xs text-gray-500">total</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{stat.deliveryRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">delivery</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{stat.openRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">open</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-600">{stat.clickRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">click</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Trends */}
      {trends && trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Delivery Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trends.slice(0, 10).map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{trend._id.date}</div>
                    <div className="text-sm text-gray-500 capitalize">{trend._id.channel}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-bold">{trend.total}</div>
                      <div className="text-xs text-gray-500">total</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{trend.delivered}</div>
                      <div className="text-xs text-gray-500">delivered</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{trend.failed}</div>
                      <div className="text-xs text-gray-500">failed</div>
                    </div>
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

export default NotificationDeliveryDashboard;
