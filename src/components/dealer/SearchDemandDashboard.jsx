// src/components/dealer/SearchDemandDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Search Demand Dashboard
// Shows search demand and inventory recommendations
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, DollarSign, Car, RefreshCw, ArrowUp, ArrowDown, Minus } from "lucide-react";

const SearchDemandDashboard = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetchInsights();
  }, [period]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/search-analytics/dealer/demand?period=${period}`);
      setInsights(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load demand insights");
      console.error("Error fetching insights:", err);
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

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No demand data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Search Demand Dashboard</h2>
        <div className="flex gap-2">
          <Button
            variant={period === 7 ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(7)}
          >
            7 Days
          </Button>
          <Button
            variant={period === 30 ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(30)}
          >
            30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={fetchInsights}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Demand Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Demand vs Inventory Gaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.demandGaps.map((gap, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{gap.brand} {gap.model}</div>
                  <div className="text-sm text-gray-500">
                    Demand: {gap.demandScore} | Inventory: {gap.inventoryCount}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`font-bold ${gap.gap > 0 ? "text-green-600" : gap.gap < -10 ? "text-red-600" : "text-gray-600"}`}>
                      {gap.gap > 0 ? "+" : ""}{gap.gap}
                    </div>
                    <div className="text-xs text-gray-500">gap</div>
                  </div>
                  <Badge variant={gap.gap > 0 ? "default" : gap.gap < -10 ? "destructive" : "secondary"}>
                    {gap.recommendation}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Price Range Demand */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Price Range Demand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.priceRangeDemand.map((range, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{range.priceRange}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{range.searchCount}</div>
                  <div className="text-xs text-gray-500">searches</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Missing Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Missing Inventory Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.missingInventory.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.searchTerm || "Custom search"}</div>
                  <div className="text-sm text-gray-500">
                    {item.filters.brand && `Brand: ${item.filters.brand}`}
                    {item.filters.model && ` | Model: ${item.filters.model}`}
                    {item.filters.price && ` | Price: ${item.filters.price.min || 0}-${item.filters.price.max || "unlimited"}`}
                    {item.filters.county && ` | County: ${item.filters.county}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-orange-600">{item.demandScore}</div>
                  <div className="text-xs text-gray-500">demand score</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Increase Inventory</span>
              </div>
              <p className="text-sm text-green-700">
                Focus on brands and models with high demand gaps. These are the most searched vehicles with low inventory.
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDown className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-800">Reduce Inventory</span>
              </div>
              <p className="text-sm text-red-700">
                Consider reducing inventory for brands with significant negative demand gaps to optimize capital allocation.
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Minus className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Maintain Inventory</span>
              </div>
              <p className="text-sm text-blue-700">
                Current inventory levels appear balanced with demand. Continue monitoring trends for changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchDemandDashboard;
