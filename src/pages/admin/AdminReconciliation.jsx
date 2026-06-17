// src/pages/admin/AdminReconciliation.jsx - Enterprise Payment Reconciliation Dashboard
// ─────────────────────────────────────────────────────────────
// Displays reconciliation status, financial integrity score, and unresolved issues
// Provides downloadable reports and issue resolution capabilities
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  RefreshCw, 
  TrendingUp,
  DollarSign,
  Shield,
  FileText,
  AlertCircle
} from "lucide-react";
import { adminAPI } from "@/api/api";

const AdminReconciliation = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [runningReconciliation, setRunningReconciliation] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchReports();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getReconciliationDashboard({ days: 30 });
      setDashboard(response.data);
    } catch (error) {
      console.error("Failed to fetch reconciliation dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await adminAPI.getReconciliationReports({ page: 1, limit: 10 });
      setReports(response.data || []);
    } catch (error) {
      console.error("Failed to fetch reconciliation reports:", error);
    }
  };

  const runReconciliation = async (reportType = "full_reconciliation") => {
    try {
      setRunningReconciliation(true);
      await adminAPI.runReconciliationReport({ reportType, days: 1 });
      await fetchDashboard();
      await fetchReports();
    } catch (error) {
      console.error("Failed to run reconciliation:", error);
    } finally {
      setRunningReconciliation(false);
    }
  };

  const exportReport = async (reportId, format = "csv") => {
    try {
      const response = await adminAPI.exportReconciliationReport(reportId, format);
      const blob = new Blob([response], { 
        type: format === "csv" ? "text/csv" : "application/json" 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reconciliation-${reportId}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 90) return "bg-green-100";
    if (score >= 70) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Reconciliation</h1>
          <p className="text-gray-600 mt-1">
            Monitor financial integrity and resolve reconciliation issues
          </p>
        </div>
        <Button 
          onClick={() => runReconciliation()}
          disabled={runningReconciliation}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${runningReconciliation ? "animate-spin" : ""}`} />
          {runningReconciliation ? "Running..." : "Run Reconciliation"}
        </Button>
      </div>

      {/* Financial Integrity Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Financial Integrity Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className={`text-6xl font-bold ${getScoreColor(dashboard?.integrityScore || 0)}`}>
              {dashboard?.integrityScore || 0}
            </div>
            <div className="flex-1">
              <Progress value={dashboard?.integrityScore || 0} className="h-3" />
              <p className="text-sm text-gray-600 mt-2">
                {dashboard?.integrityScore >= 90 ? "Excellent" : 
                 dashboard?.integrityScore >= 70 ? "Good" : 
                 dashboard?.integrityScore >= 50 ? "Fair" : "Poor"} 
                financial health
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unresolved Issues</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {dashboard?.unresolvedIssues || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ledger Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  KES {dashboard?.ledgerGateway?.ledgerTotal?.toLocaleString() || 0}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gateway Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  KES {dashboard?.ledgerGateway?.gatewayTotal?.toLocaleString() || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Escrow Balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  KES {dashboard?.escrowBalances?.heldTotal?.toLocaleString() || 0}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Mismatches */}
      {(dashboard?.ledgerGateway?.mismatch > 0 || dashboard?.escrowBalances?.mismatch > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Balance Mismatches Detected</h3>
                <div className="mt-2 space-y-1">
                  {dashboard?.ledgerGateway?.mismatch > 0 && (
                    <p className="text-sm text-orange-800">
                      Ledger vs Gateway mismatch: KES {dashboard.ledgerGateway.mismatch.toLocaleString()}
                    </p>
                  )}
                  {dashboard?.escrowBalances?.mismatch > 0 && (
                    <p className="text-sm text-orange-800">
                      Escrow balance mismatch: KES {dashboard.escrowBalances.mismatch.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unresolved Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard?.issueTypeBreakdown?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.issueTypeBreakdown.map((issue, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={getSeverityColor(issue._id)}>
                          {issue._id}
                        </Badge>
                        <span className="text-sm font-medium capitalize">
                          {issue._id.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-sm font-bold">{issue.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>No unresolved issues</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{report.reportType}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={report.status === "completed" ? "default" : "secondary"}>
                          {report.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportReport(report._id, "csv")}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3" />
                  <p>No reports available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Issue Breakdown by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(dashboard?.issueBreakdown || {}).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(dashboard.issueBreakdown || {}).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <Badge className={getSeverityColor(severity)}>
                        {severity}
                      </Badge>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>No issues to display</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReconciliation;
