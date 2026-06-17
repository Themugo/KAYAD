// src/pages/admin/QueueMonitoring.jsx - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Queue monitoring dashboard
// Real-time monitoring of queue health, metrics, and failures
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  RefreshCw,
  Trash2,
  RotateCcw,
  TrendingUp,
  Zap,
} from "lucide-react";

const QueueMonitoring = () => {
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [statistics, setStatistics] = useState([]);
  const [circuitBreakers, setCircuitBreakers] = useState([]);
  const [dlqStats, setDlqStats] = useState(null);
  const [dlqJobs, setDlqJobs] = useState([]);
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const [metricsRes, healthRes, statsRes, cbRes, dlqStatsRes, dlqJobsRes, failuresRes] =
        await Promise.all([
          fetch("/api/admin/queue/metrics"),
          fetch("/api/admin/queue/health"),
          fetch("/api/admin/queue/statistics"),
          fetch("/api/admin/queue/circuit-breakers"),
          fetch("/api/admin/queue/dlq/statistics"),
          fetch("/api/admin/queue/dlq/jobs?limit=20"),
          fetch("/api/admin/queue/failures?limit=20"),
        ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStatistics(data.statistics);
      }

      if (cbRes.ok) {
        const data = await cbRes.json();
        setCircuitBreakers(Object.values(data.circuitBreakers));
      }

      if (dlqStatsRes.ok) {
        const data = await dlqStatsRes.json();
        setDlqStats(data.statistics);
      }

      if (dlqJobsRes.ok) {
        const data = await dlqJobsRes.json();
        setDlqJobs(data.jobs);
      }

      if (failuresRes.ok) {
        const data = await failuresRes.json();
        setFailures(data.failures);
      }
    } catch (error) {
      console.error("Failed to fetch queue data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryJob = async (jobId) => {
    try {
      await fetch(`/api/admin/queue/dlq/retry/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      fetchQueueData();
    } catch (error) {
      console.error("Failed to retry job:", error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await fetch(`/api/admin/queue/dlq/delete/${jobId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      fetchQueueData();
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getHealthBadge = (status) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500">Healthy</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case "critical":
        return <Badge className="bg-red-500">Critical</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Monitoring</h1>
          <p className="text-gray-600">Real-time queue health and performance metrics</p>
        </div>
        <Button onClick={fetchQueueData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Health Status */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Overall System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`h-3 w-3 rounded-full ${getHealthColor(health.overallHealth)}`} />
              <span className="text-2xl font-bold capitalize">{health.overallHealth}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queues">Queue Details</TabsTrigger>
          <TabsTrigger value="failures">Failures</TabsTrigger>
          <TabsTrigger value="dlq">Dead Letter Queue</TabsTrigger>
          <TabsTrigger value="circuit-breakers">Circuit Breakers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics).map(([name, data]) => (
                <Card key={name}>
                  <CardHeader>
                    <CardTitle className="text-lg">{name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Backlog</span>
                      <span className="font-semibold">{data.backlog || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active</span>
                      <span className="font-semibold">{data.active || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed (1h)</span>
                      <span className="font-semibold">{data.completedInLastHour || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Failure Rate</span>
                      <span className="font-semibold">{data.failureRate?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Processing</span>
                      <span className="font-semibold">{data.avgProcessingTime?.toFixed(0) || 0}ms</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {statistics && statistics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Queue Statistics (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Queue</TableHead>
                      <TableHead>Total Failures</TableHead>
                      <TableHead>Unresolved</TableHead>
                      <TableHead>Failure Rate</TableHead>
                      <TableHead>Avg Processing Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statistics.map((stat) => (
                      <TableRow key={stat.queueName}>
                        <TableCell className="font-medium">{stat.queueName}</TableCell>
                        <TableCell>{stat.totalFailures}</TableCell>
                        <TableCell>{stat.unresolvedFailures}</TableCell>
                        <TableCell>
                          <Badge variant={stat.failureRate > 5 ? "destructive" : "secondary"}>
                            {stat.failureRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{stat.avgProcessingTime?.toFixed(0) || 0}ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Queue Details Tab */}
        <TabsContent value="queues" className="space-y-4">
          {health && health.healthChecks && (
            <div className="grid grid-cols-1 gap-4">
              {health.healthChecks.map((check) => (
                <Card key={check.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        {check.name}
                      </span>
                      {getHealthBadge(check.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Backlog</span>
                        <span className="font-semibold">{check.metrics.backlog || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Jobs</span>
                        <span className="font-semibold">{check.metrics.active || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Failure Rate</span>
                        <span className="font-semibold">{check.metrics.failureRate?.toFixed(1) || 0}%</span>
                      </div>
                      {check.issues.length > 0 && (
                        <div className="mt-4 space-y-1">
                          <span className="text-gray-600 font-medium">Issues:</span>
                          {check.issues.map((issue, idx) => (
                            <div key={idx} className="text-sm text-red-600 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              {issue}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Failures Tab */}
        <TabsContent value="failures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Recent Job Failures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Queue</TableHead>
                    <TableHead>Error Type</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Failed At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failures.map((failure) => (
                    <TableRow key={failure._id}>
                      <TableCell className="font-mono text-xs">{failure.jobId}</TableCell>
                      <TableCell>{failure.queueName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{failure.errorType}</Badge>
                      </TableCell>
                      <TableCell>{failure.attemptsMade}/{failure.maxAttempts}</TableCell>
                      <TableCell>{new Date(failure.failedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {failure.resolvedAt ? (
                          <Badge className="bg-green-500">Resolved</Badge>
                        ) : (
                          <Badge className="bg-red-500">Unresolved</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dead Letter Queue Tab */}
        <TabsContent value="dlq" className="space-y-4">
          {dlqStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total DLQ Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dlqStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Waiting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dlqStats.waiting}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dlqStats.active}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dlqStats.failed}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Dead Letter Queue Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Original Queue</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Failed At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dlqJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">{job.id}</TableCell>
                      <TableCell>{job.data.originalQueueName}</TableCell>
                      <TableCell className="max-w-xs truncate">{job.data.error}</TableCell>
                      <TableCell>{new Date(job.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetryJob(job.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Circuit Breakers Tab */}
        <TabsContent value="circuit-breakers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {circuitBreakers.map((cb) => (
              <Card key={cb.serviceName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      {cb.serviceName}
                    </span>
                    <Badge
                      variant={
                        cb.state === "closed"
                          ? "default"
                          : cb.state === "open"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {cb.state.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failure Count</span>
                    <span className="font-semibold">{cb.failureCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Count</span>
                    <span className="font-semibold">{cb.successCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Calls</span>
                    <span className="font-semibold">{cb.metrics.totalCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed Calls</span>
                    <span className="font-semibold">{cb.metrics.failedCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rejected Calls</span>
                    <span className="font-semibold">{cb.metrics.rejectedCalls}</span>
                  </div>
                  {cb.nextAttemptTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Attempt</span>
                      <span className="font-semibold">
                        {new Date(cb.nextAttemptTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QueueMonitoring;
