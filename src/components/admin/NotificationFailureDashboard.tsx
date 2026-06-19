// src/components/admin/NotificationFailureDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Notification Failure Dashboard
// Failure analysis and retry management
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, RotateCcw, Clock, XCircle, Mail, MessageSquare, Smartphone } from "lucide-react";

const NotificationFailureDashboard = () => {
  const [failureAnalysis, setFailureAnalysis] = useState(null);
  const [retryStats, setRetryStats] = useState(null);
  const [retryQueue, setRetryQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(24);

  useEffect(() => {
    fetchFailureAnalysis();
    fetchRetryStats();
    fetchRetryQueue();
  }, [period]);

  const fetchFailureAnalysis = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/notification-analytics/failure-analysis?period=${period}`);
      setFailureAnalysis(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load failure analysis");
      console.error("Error fetching failure analysis:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRetryStats = async () => {
    try {
      const response = await axios.get(`/api/notification-analytics/retry-stats?period=${period}`);
      setRetryStats(response.data.data);
    } catch (err) {
      console.error("Error fetching retry stats:", err);
    }
  };

  const fetchRetryQueue = async () => {
    try {
      const response = await axios.get("/api/notification-analytics/retry-queue");
      setRetryQueue(response.data.data);
    } catch (err) {
      console.error("Error fetching retry queue:", err);
    }
  };

  const handleProcessRetryQueue = async () => {
    try {
      await axios.post("/api/notification-analytics/process-retry-queue");
      fetchRetryQueue();
      fetchRetryStats();
    } catch (err) {
      console.error("Error processing retry queue:", err);
    }
  };

  const handleBulkRetry = async () => {
    try {
      await axios.post("/api/notification-analytics/bulk-retry", { period });
      fetchFailureAnalysis();
      fetchRetryStats();
    } catch (err) {
      console.error("Error bulk retrying:", err);
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

  if (!failureAnalysis) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No failure data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notification Failure Dashboard</h2>
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
          <Button variant="outline" size="sm" onClick={fetchFailureAnalysis}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Retry Stats */}
      {retryStats && retryStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {retryStats.map((stat) => (
            <Card key={stat.channel}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 capitalize">{stat.channel} Retries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Retried</span>
                    <span className="font-bold">{stat.totalRetried}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Successful</span>
                    <span className="font-bold text-green-600">{stat.successfulRetries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-bold">{stat.retrySuccessRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Retries</span>
                    <span className="font-bold">{stat.avgRetries.toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Failure Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Failure Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {failureAnalysis.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {item.channel === "email" && <Mail className="w-5 h-5 text-blue-500" />}
                  {item.channel === "sms" && <MessageSquare className="w-5 h-5 text-green-500" />}
                  {item.channel === "push" && <Smartphone className="w-5 h-5 text-purple-500" />}
                  {item.channel === "whatsapp" && <MessageSquare className="w-5 h-5 text-green-600" />}
                  {item.channel === "in_app" && <Smartphone className="w-5 h-5 text-orange-500" />}
                  <div className="flex-1">
                    <div className="font-medium capitalize">{item.channel}</div>
                    <div className="text-sm text-gray-600">{item.failureReason || "Unknown"}</div>
                    <div className="text-xs text-gray-500">{item.failureCode || "No code"}</div>
                  </div>
                </div>
                <Badge variant="destructive">{item.count} failures</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Retry Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Retry Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {retryQueue && retryQueue.length > 0 ? (
              retryQueue.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.channel === "email" && <Mail className="w-5 h-5 text-blue-500" />}
                    {item.channel === "sms" && <MessageSquare className="w-5 h-5 text-green-500" />}
                    {item.channel === "push" && <Smartphone className="w-5 h-5 text-purple-500" />}
                    {item.channel === "whatsapp" && <MessageSquare className="w-5 h-5 text-green-600" />}
                    {item.channel === "in_app" && <Smartphone className="w-5 h-5 text-orange-500" />}
                    <div className="flex-1">
                      <div className="font-medium capitalize">{item.channel}</div>
                      <div className="text-sm text-gray-600">Retry {item.retryCount} of {item.maxRetries}</div>
                      <div className="text-xs text-gray-500">
                        Next retry: {item.nextRetryAt ? new Date(item.nextRetryAt).toLocaleString() : "Pending"}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{item.failureReason || "Failed"}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                No notifications pending retry
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleProcessRetryQueue}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Process Retry Queue
            </Button>
            <Button variant="outline" onClick={handleBulkRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Bulk Retry Failed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Failure Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Failure Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {failureAnalysis.slice(0, 5).map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{item.channel}</span>
                  <Badge variant="destructive">{item.count}</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Reason: {item.failureReason || "Unknown"}</div>
                  <div>Code: {item.failureCode || "No code"}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationFailureDashboard;
