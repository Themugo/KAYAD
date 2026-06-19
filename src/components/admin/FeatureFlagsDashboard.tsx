// src/components/admin/FeatureFlagsDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Feature Flags Dashboard
// Enterprise feature flag management interface
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, RefreshCw, Settings, BarChart3, ToggleLeft, ToggleRight } from "lucide-react";

const FeatureFlagsDashboard = () => {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);
  const [categories, setCategories] = useState([]);

  const [newFlag, setNewFlag] = useState({
    key: "",
    name: "",
    description: "",
    type: "boolean",
    enabled: true,
    defaultValue: true,
    environments: ["development", "staging", "production"],
    roles: [],
    category: "general",
    priority: "medium",
    tags: [],
    percentage: 100,
    rolloutStrategy: "user_id_hash",
  });

  useEffect(() => {
    fetchFlags();
    fetchCategories();
  }, [selectedCategory]);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCategory !== "all") {
        params.category = selectedCategory;
      }
      const response = await axios.get("/api/feature-flags", { params });
      setFlags(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load feature flags");
      console.error("Error fetching flags:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/api/feature-flags/meta/categories");
      setCategories(response.data.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleToggle = async (key) => {
    try {
      await axios.post(`/api/feature-flags/${key}/toggle`);
      fetchFlags();
    } catch (err) {
      console.error("Error toggling flag:", err);
    }
  };

  const handleDelete = async (key) => {
    if (!confirm("Are you sure you want to delete this flag?")) return;
    
    try {
      await axios.delete(`/api/feature-flags/${key}`);
      fetchFlags();
    } catch (err) {
      console.error("Error deleting flag:", err);
    }
  };

  const handleCreate = async () => {
    try {
      await axios.post("/api/feature-flags", newFlag);
      setShowCreateDialog(false);
      setNewFlag({
        key: "",
        name: "",
        description: "",
        type: "boolean",
        enabled: true,
        defaultValue: true,
        environments: ["development", "staging", "production"],
        roles: [],
        category: "general",
        priority: "medium",
        tags: [],
        percentage: 100,
        rolloutStrategy: "user_id_hash",
      });
      fetchFlags();
    } catch (err) {
      console.error("Error creating flag:", err);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`/api/feature-flags/${editingFlag.key}`, newFlag);
      setShowEditDialog(false);
      setEditingFlag(null);
      fetchFlags();
    } catch (err) {
      console.error("Error updating flag:", err);
    }
  };

  const openEditDialog = (flag) => {
    setEditingFlag(flag);
    setNewFlag({
      key: flag.key,
      name: flag.name,
      description: flag.description,
      type: flag.type,
      enabled: flag.enabled,
      defaultValue: flag.defaultValue,
      environments: flag.environments,
      roles: flag.roles,
      category: flag.category,
      priority: flag.priority,
      tags: flag.tags,
      percentage: flag.percentage || 100,
      rolloutStrategy: flag.rolloutStrategy || "user_id_hash",
    });
    setShowEditDialog(true);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Feature Flags Dashboard</h2>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchFlags}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Flag
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Feature Flag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    value={newFlag.key}
                    onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                    placeholder="feature_name"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newFlag.name}
                    onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                    placeholder="Feature Name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newFlag.description}
                    onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                    placeholder="Feature description"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={newFlag.type} onValueChange={(value) => setNewFlag({ ...newFlag, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="percentage">Percentage Rollout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newFlag.category} onValueChange={(value) => setNewFlag({ ...newFlag, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="auctions">Auctions</SelectItem>
                      <SelectItem value="escrow">Escrow</SelectItem>
                      <SelectItem value="ntsa">NTSA</SelectItem>
                      <SelectItem value="ai_valuation">AI Valuation</SelectItem>
                      <SelectItem value="crm">CRM</SelectItem>
                      <SelectItem value="experiments">Experiments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newFlag.priority} onValueChange={(value) => setNewFlag({ ...newFlag, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newFlag.type === "percentage" && (
                  <>
                    <div>
                      <Label htmlFor="percentage">Percentage</Label>
                      <Input
                        id="percentage"
                        type="number"
                        min="0"
                        max="100"
                        value={newFlag.percentage}
                        onChange={(e) => setNewFlag({ ...newFlag, percentage: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="rolloutStrategy">Rollout Strategy</Label>
                      <Select value={newFlag.rolloutStrategy} onValueChange={(value) => setNewFlag({ ...newFlag, rolloutStrategy: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="random">Random</SelectItem>
                          <SelectItem value="user_id_hash">User ID Hash</SelectItem>
                          <SelectItem value="dealer_id_hash">Dealer ID Hash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>
                    Create Flag
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flags.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Enabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{flags.filter(f => f.enabled).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{flags.filter(f => !f.enabled).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Percentage Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{flags.filter(f => f.type === "percentage").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Flags List */}
      <div className="space-y-3">
        {flags.map((flag) => (
          <Card key={flag.key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {flag.enabled ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="font-semibold">{flag.name}</span>
                    </div>
                    <Badge variant={flag.enabled ? "default" : "secondary"}>
                      {flag.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Badge variant="outline">{flag.type}</Badge>
                    <Badge variant="outline">{flag.category}</Badge>
                    {flag.priority === "high" && <Badge variant="destructive">High Priority</Badge>}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{flag.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    Key: {flag.key} | Created: {new Date(flag.createdAt).toLocaleDateString()}
                  </div>
                  {flag.type === "percentage" && (
                    <div className="text-xs text-gray-500 mt-1">
                      Rollout: {flag.percentage}% | Strategy: {flag.rolloutStrategy}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={() => handleToggle(flag.key)}
                  />
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(flag)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(flag.key)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select value={newFlag.category} onValueChange={(value) => setNewFlag({ ...newFlag, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="auctions">Auctions</SelectItem>
                  <SelectItem value="escrow">Escrow</SelectItem>
                  <SelectItem value="ntsa">NTSA</SelectItem>
                  <SelectItem value="ai_valuation">AI Valuation</SelectItem>
                  <SelectItem value="crm">CRM</SelectItem>
                  <SelectItem value="experiments">Experiments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newFlag.type === "percentage" && (
              <>
                <div>
                  <Label htmlFor="edit-percentage">Percentage</Label>
                  <Input
                    id="edit-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={newFlag.percentage}
                    onChange={(e) => setNewFlag({ ...newFlag, percentage: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-rolloutStrategy">Rollout Strategy</Label>
                  <Select value={newFlag.rolloutStrategy} onValueChange={(value) => setNewFlag({ ...newFlag, rolloutStrategy: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="user_id_hash">User ID Hash</SelectItem>
                      <SelectItem value="dealer_id_hash">Dealer ID Hash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update Flag
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeatureFlagsDashboard;
