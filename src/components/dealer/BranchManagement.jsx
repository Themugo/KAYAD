// src/components/dealer/BranchManagement.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Branch Management
// Multi-location branch management for organizations
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Building2, Settings, RefreshCw, Plus, Edit, Trash2 } from "lucide-react";

const BranchManagement = ({ organizationId }) => {
  const [branches, setBranches] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBranches();
    fetchStats();
  }, [organizationId]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/organizations/${organizationId}/branches`);
      setBranches(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load branches");
      console.error("Error fetching branches:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`/api/organizations/${organizationId}/stats`);
      setStats(response.data.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const handleCreateBranch = async () => {
    // Implement branch creation
    console.log("Create branch");
  };

  const handleEditBranch = (branchId) => {
    // Implement branch editing
    console.log("Edit branch", branchId);
  };

  const handleDeleteBranch = async (branchId) => {
    // Implement branch deletion
    console.log("Delete branch", branchId);
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

  if (!branches) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No branches available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Branch Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchBranches}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreateBranch}>
            <Plus className="w-4 h-4 mr-2" />
            New Branch
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Branches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <div className="text-2xl font-bold">{stats.stats?.totalBranches || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-500" />
                <div className="text-2xl font-bold">{stats.stats?.totalDepartments || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <div className="text-2xl font-bold">{stats.stats?.totalTeams || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branch List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            All Branches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {branches.map((branch) => (
              <div key={branch._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="font-medium">{branch.name}</div>
                    <div className="text-sm text-gray-600 capitalize">{branch.type}</div>
                    {branch.address && (
                      <div className="text-xs text-gray-500">{branch.address.city}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-bold">{branch.totalDepartments}</div>
                    <div className="text-xs text-gray-500">departments</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{branch.totalTeams}</div>
                    <div className="text-xs text-gray-500">teams</div>
                  </div>
                  <Badge variant={branch.status === "active" ? "default" : "secondary"}>
                    {branch.status}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditBranch(branch._id)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteBranch(branch._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

export default BranchManagement;
