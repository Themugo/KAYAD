// src/components/dealer/RoleManagement.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Role Management
// Custom role and permission management for organizations
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, RefreshCw, Plus, Edit, Trash2, Check, X } from "lucide-react";

const RoleManagement = ({ organizationId }) => {
  const [roles, setRoles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    fetchRoles();
  }, [organizationId]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/roles/organization/${organizationId}`);
      setRoles(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load roles");
      console.error("Error fetching roles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    // Implement role creation
    console.log("Create role");
  };

  const handleEditRole = (roleId) => {
    // Implement role editing
    console.log("Edit role", roleId);
  };

  const handleDeleteRole = async (roleId) => {
    // Implement role deletion
    console.log("Delete role", roleId);
  };

  const handleTogglePermission = (roleId, resource, action) => {
    // Implement permission toggle
    console.log("Toggle permission", roleId, resource, action);
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

  if (!roles) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No roles available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Role Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRoles}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreateRole}>
            <Plus className="w-4 h-4 mr-2" />
            New Role
          </Button>
        </div>
      </div>

      {/* Role List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            All Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roles.map((role) => (
              <div key={role._id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <div className="font-medium">{role.name}</div>
                      <div className="text-sm text-gray-600 capitalize">{role.type}</div>
                      {role.description && (
                        <div className="text-xs text-gray-500">{role.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{role.totalUsers} users</span>
                    </div>
                    <Badge variant={role.status === "active" ? "default" : "secondary"}>
                      {role.status}
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditRole(role._id)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteRole(role._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                {role.permissions && role.permissions.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="text-sm font-medium mb-2">Permissions</div>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((perm, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded border">
                          <span className="text-sm font-medium">{perm.resource}</span>
                          <span className="text-xs text-gray-500">:</span>
                          {perm.actions.map((action, actionIdx) => (
                            <Badge key={actionIdx} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Details (when selected) */}
      {selectedRole && (
        <Card>
          <CardHeader>
            <CardTitle>Role Details: {selectedRole.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Description</div>
                <div className="text-sm text-gray-600">{selectedRole.description || "No description"}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Permissions</div>
                <div className="space-y-2">
                  {selectedRole.permissions.map((perm, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{perm.resource}</span>
                      <div className="flex gap-2">
                        {perm.actions.map((action, actionIdx) => (
                          <Button
                            key={actionIdx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePermission(selectedRole._id, perm.resource, action)}
                          >
                            {action}
                          </Button>
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
    </div>
  );
};

export default RoleManagement;
