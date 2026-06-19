// src/components/admin/OrganizationDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Organization Dashboard
// Platform-wide organization management and analytics
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, MapPin, Settings, TrendingUp, RefreshCw, Plus } from "lucide-react";

const OrganizationDashboard = () => {
  const [organizations, setOrganizations] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrganizations();
    fetchStats();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/organizations");
      setOrganizations(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load organizations");
      console.error("Error fetching organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get("/api/organizations/platform-stats");
      setStats(response.data.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
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

  if (!organizations) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No organizations available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Organization Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrganizations}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Branches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                <div className="text-2xl font-bold">{stats.byType?.reduce((sum, item) => sum + item.totalBranches, 0) || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <div className="text-2xl font-bold">{stats.byType?.reduce((sum, item) => sum + item.totalUsers, 0) || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <div className="text-2xl font-bold">{stats.byType?.reduce((sum, item) => sum + item.totalListings, 0) || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organization by Type */}
      {stats && stats.byType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organizations by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byType.map((stat) => (
                <div key={stat._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-500" />
                    <span className="font-medium capitalize">{stat._id}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="font-bold">{stat.count}</div>
                      <div className="text-xs text-gray-500">organizations</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{stat.totalBranches}</div>
                      <div className="text-xs text-gray-500">branches</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{stat.totalUsers}</div>
                      <div className="text-xs text-gray-500">users</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Stats */}
      {stats && stats.bySubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Subscription Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.bySubscription.map((stat) => (
                <div key={stat._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-purple-500" />
                    <span className="font-medium capitalize">{stat._id}</span>
                  </div>
                  <Badge variant="outline">{stat.count} organizations</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organization List */}
      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {organizations.map((org) => (
              <div key={org._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-gray-600 capitalize">{org.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-bold">{org.totalBranches}</div>
                    <div className="text-xs text-gray-500">branches</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{org.totalUsers}</div>
                    <div className="text-xs text-gray-500">users</div>
                  </div>
                  <Badge variant={org.subscription.status === "active" ? "default" : "secondary"}>
                    {org.subscription.plan}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationDashboard;
