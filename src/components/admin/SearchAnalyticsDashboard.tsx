// src/components/admin/SearchAnalyticsDashboard.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Admin Search Analytics Dashboard
// Overview of search behavior and insights
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, AlertTriangle, MapPin, DollarSign, Car, RefreshCw } from "lucide-react";

const SearchAnalyticsDashboard = () => {
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(7);

  useEffect(() => {
    fetchInsights();
    fetchSummary();
  }, [period]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/search-analytics/insights?period=${period}`);
      setInsights(response.data.data);
      setError(null);
    } catch (err) {
      setError("Failed to load search insights");
      console.error("Error fetching insights:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`/api/search-analytics/summary?period=${period}`);
      setSummary(response.data.data);
    } catch (err) {
      console.error("Error fetching summary:", err);
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
        No search data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Search Analytics Dashboard</h2>
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

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Searches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" />
                <div className="text-2xl font-bold">{summary.totalSearches}</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{summary.uniqueSearches} unique</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">No-Result Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div className="text-2xl font-bold">{summary.noResultRate.toFixed(1)}%</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{summary.noResultCount} searches</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-green-500" />
                <div className="text-2xl font-bold">{summary.avgResultCount.toFixed(0)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{period} Days</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trending Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trending Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.trending.map((search, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{search.searchTerm || "No search term"}</div>
                  <div className="text-sm text-gray-500">
                    {search.filters.brand && `Brand: ${search.filters.brand}`}
                    {search.filters.model && ` | Model: ${search.filters.model}`}
                    {search.filters.county && ` | County: ${search.filters.county}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{search.searchCount}</div>
                  <div className="text-xs text-gray-500">searches</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* No-Result Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Searches with No Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.noResults.map((search, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{search.searchTerm || "No search term"}</div>
                  <div className="text-sm text-gray-500">
                    {search.filters.brand && `Brand: ${search.filters.brand}`}
                    {search.filters.model && ` | Model: ${search.filters.model}`}
                    {search.filters.price && ` | Price: ${search.filters.price.min || 0}-${search.filters.price.max || "unlimited"}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{search.searchCount}</div>
                  <div className="text-xs text-gray-500">searches</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Popular Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Brands</h4>
              <div className="space-y-2">
                {Object.entries(insights.popularFilters.brand || {}).slice(0, 5).map(([brand, count]) => (
                  <div key={brand} className="flex items-center justify-between">
                    <span className="text-sm">{brand}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Body Types</h4>
              <div className="space-y-2">
                {Object.entries(insights.popularFilters.bodyType || {}).slice(0, 5).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">{type}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* County Search Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            County Search Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.countyStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{stat.county}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{stat.searchCount}</div>
                  <div className="text-xs text-gray-500">{stat.successRate.toFixed(1)}% success</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Price Range Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Price Range Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.priceRangeStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{stat.priceRange}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{stat.searchCount}</div>
                  <div className="text-xs text-gray-500">{stat.successRate.toFixed(1)}% success</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Brand/Model Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Brand & Model Demand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.brandModelStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{stat.brand} {stat.model}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{stat.searchCount}</div>
                  <div className="text-xs text-gray-500">{stat.successRate.toFixed(1)}% success</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchAnalyticsDashboard;
