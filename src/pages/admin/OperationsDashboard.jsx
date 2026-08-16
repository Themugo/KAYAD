import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CreditCard,
  Shield,
  Users,
  FileText,
  Layers,
  Bell,
  TrendingUp,
  Server,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

const OperationsDashboard = () => {
  const [activeWidget, setActiveWidget] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    systemHealth: {},
    paymentFailures: {},
    escrowDisputes: {},
    dealerOnboarding: {},
    listingModeration: {},
    queueHealth: {},
    notifications: {},
    fraudAlerts: {},
  });

  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      setDashboardData({
        systemHealth: {
          uptime: "99.9%",
          apiResponseTime: { p50: 85, p95: 210, p99: 450 },
          databaseStatus: "healthy",
          redisStatus: "healthy",
          queueWorkerStatus: "healthy",
          errorRate: "0.08%",
          activeSessions: 1247,
        },
        paymentFailures: {
          totalVolume: "KES 45,230,000",
          successRate: "94.2%",
          failureRate: "5.8%",
          failedReasons: {
            insufficientFunds: 45,
            cardDeclined: 32,
            timeout: 18,
            other: 5,
          },
          pendingPayments: 23,
          refundRequests: 7,
          processingTime: "12s",
        },
        escrowDisputes: {
          activeDisputes: 12,
          resolutionTime: "36h",
          successRate: "87.5%",
          categories: {
            vehicleCondition: 5,
            delivery: 4,
            payment: 3,
          },
          pendingResolutions: 8,
          escrowBalance: "KES 8,450,000",
        },
        dealerOnboarding: {
          pendingApplications: 15,
          approvedToday: 8,
          rejectedToday: 2,
          averageOnboardingTime: "18h",
          documentVerification: "92%",
          verificationRate: "85%",
        },
        listingModeration: {
          pendingListings: 34,
          approvedToday: 45,
          rejectedToday: 8,
          flaggedListings: 12,
          moderationQueue: 34,
          averageModerationTime: "8h",
        },
        queueHealth: {
          emailQueue: { size: 156, processingRate: "245/min", failedJobs: 3 },
          notificationQueue: { size: 89, processingRate: "312/min", failedJobs: 1 },
          smsQueue: { size: 45, processingRate: "89/min", failedJobs: 0 },
          fraudQueue: { size: 23, processingRate: "156/min", failedJobs: 2 },
          imageQueue: { size: 67, processingRate: "78/min", failedJobs: 4 },
          seoQueue: { size: 12, processingRate: "23/min", failedJobs: 0 },
          workerStatus: "healthy",
          avgProcessingTime: "2.3s",
        },
        notifications: {
          emailVolume: 1245,
          smsVolume: 345,
          pushVolume: 892,
          inAppVolume: 2341,
          deliverySuccessRate: "96.8%",
          failedNotifications: 42,
          processingTime: "1.8s",
        },
        fraudAlerts: {
          alertsToday: 23,
          confirmedFraud: 8,
          falsePositiveRate: "12.5%",
          detectionRate: "94.2%",
          highRiskUsers: 5,
          blockedTransactions: 12,
        },
      });
      setLoading(false);
    }, 1000);
  }, []);

  const widgets = [
    { id: "overview", name: "Overview", icon: Activity },
    { id: "systemHealth", name: "System Health", icon: Server },
    { id: "paymentFailures", name: "Payment Failures", icon: CreditCard },
    { id: "escrowDisputes", name: "Escrow Disputes", icon: Shield },
    { id: "dealerOnboarding", name: "Dealer Onboarding", icon: Users },
    { id: "listingModeration", name: "Listing Moderation", icon: FileText },
    { id: "queueHealth", name: "Queue Health", icon: Layers },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "fraudAlerts", name: "Fraud Alerts", icon: AlertTriangle },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "critical":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="System Health"
        value={dashboardData.systemHealth.uptime}
        icon={Server}
        color="green"
        trend="+0.1%"
      />
      <MetricCard
        title="Payment Success Rate"
        value={dashboardData.paymentFailures.successRate}
        icon={CreditCard}
        color="blue"
        trend="+2.3%"
      />
      <MetricCard
        title="Active Disputes"
        value={dashboardData.escrowDisputes.activeDisputes}
        icon={Shield}
        color="orange"
        trend="-5"
      />
      <MetricCard
        title="Pending Applications"
        value={dashboardData.dealerOnboarding.pendingApplications}
        icon={Users}
        color="purple"
        trend="+3"
      />
      <MetricCard
        title="Pending Listings"
        value={dashboardData.listingModeration.pendingListings}
        icon={FileText}
        color="indigo"
        trend="+12"
      />
      <MetricCard
        title="Queue Jobs"
        value="392"
        icon={Layers}
        color="cyan"
        trend="-45"
      />
      <MetricCard
        title="Failed Notifications"
        value={dashboardData.notifications.failedNotifications}
        icon={Bell}
        color="yellow"
        trend="-8"
      />
      <MetricCard
        title="Fraud Alerts"
        value={dashboardData.fraudAlerts.alertsToday}
        icon={AlertTriangle}
        color="red"
        trend="+5"
      />
    </div>
  );

  const renderSystemHealth = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HealthCard
          title="Database"
          status={dashboardData.systemHealth.databaseStatus}
          details="Connection: Active | Latency: 12ms"
        />
        <HealthCard
          title="Redis Cache"
          status={dashboardData.systemHealth.redisStatus}
          details="Connection: Active | Memory: 45%"
        />
        <HealthCard
          title="Queue Workers"
          status={dashboardData.systemHealth.queueWorkerStatus}
          details="Active: 8 | Idle: 2"
        />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">API Response Times</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {dashboardData.systemHealth.apiResponseTime.p50}ms
            </div>
            <div className="text-sm text-gray-500">P50</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {dashboardData.systemHealth.apiResponseTime.p95}ms
            </div>
            <div className="text-sm text-gray-500">P95</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {dashboardData.systemHealth.apiResponseTime.p99}ms
            </div>
            <div className="text-sm text-gray-500">P99</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
        <div className="text-4xl font-bold text-blue-600">
          {dashboardData.systemHealth.activeSessions.toLocaleString()}
        </div>
      </div>
    </div>
  );

  const renderPaymentFailures = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Volume"
          value={dashboardData.paymentFailures.totalVolume}
          icon={CreditCard}
          color="green"
        />
        <MetricCard
          title="Success Rate"
          value={dashboardData.paymentFailures.successRate}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Failure Rate"
          value={dashboardData.paymentFailures.failureRate}
          icon={XCircle}
          color="red"
        />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Failed Payment Reasons</h3>
        <div className="space-y-3">
          {Object.entries(dashboardData.paymentFailures.failedReasons).map(
            ([reason, count]) => (
              <div key={reason} className="flex justify-between items-center">
                <span className="capitalize">{reason.replace(/([A-Z])/g, " $1")}</span>
                <span className="font-semibold">{count}</span>
              </div>
            )
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <MetricCard
          title="Pending Payments"
          value={dashboardData.paymentFailures.pendingPayments}
          icon={Clock}
          color="yellow"
        />
        <MetricCard
          title="Refund Requests"
          value={dashboardData.paymentFailures.refundRequests}
          icon={AlertCircle}
          color="orange"
        />
      </div>
    </div>
  );

  const renderEscrowDisputes = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Active Disputes"
          value={dashboardData.escrowDisputes.activeDisputes}
          icon={AlertTriangle}
          color="orange"
        />
        <MetricCard
          title="Resolution Time"
          value={dashboardData.escrowDisputes.resolutionTime}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Success Rate"
          value={dashboardData.escrowDisputes.successRate}
          icon={CheckCircle}
          color="green"
        />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Dispute Categories</h3>
        <div className="space-y-3">
          {Object.entries(dashboardData.escrowDisputes.categories).map(
            ([category, count]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="capitalize">{category}</span>
                <span className="font-semibold">{count}</span>
              </div>
            )
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <MetricCard
          title="Pending Resolutions"
          value={dashboardData.escrowDisputes.pendingResolutions}
          icon={Clock}
          color="yellow"
        />
        <MetricCard
          title="Escrow Balance"
          value={dashboardData.escrowDisputes.escrowBalance}
          icon={CreditCard}
          color="green"
        />
      </div>
    </div>
  );

  const renderDealerOnboarding = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Pending Applications"
          value={dashboardData.dealerOnboarding.pendingApplications}
          icon={Users}
          color="orange"
        />
        <MetricCard
          title="Approved Today"
          value={dashboardData.dealerOnboarding.approvedToday}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Rejected Today"
          value={dashboardData.dealerOnboarding.rejectedToday}
          icon={XCircle}
          color="red"
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <MetricCard
          title="Average Onboarding Time"
          value={dashboardData.dealerOnboarding.averageOnboardingTime}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Document Verification"
          value={dashboardData.dealerOnboarding.documentVerification}
          icon={Shield}
          color="green"
        />
      </div>
      <MetricCard
        title="Verification Rate"
        value={dashboardData.dealerOnboarding.verificationRate}
        icon={TrendingUp}
        color="purple"
      />
    </div>
  );

  const renderListingModeration = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Pending Listings"
          value={dashboardData.listingModeration.pendingListings}
          icon={FileText}
          color="orange"
        />
        <MetricCard
          title="Approved Today"
          value={dashboardData.listingModeration.approvedToday}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Rejected Today"
          value={dashboardData.listingModeration.rejectedToday}
          icon={XCircle}
          color="red"
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <MetricCard
          title="Flagged Listings"
          value={dashboardData.listingModeration.flaggedListings}
          icon={AlertTriangle}
          color="yellow"
        />
        <MetricCard
          title="Moderation Queue"
          value={dashboardData.listingModeration.moderationQueue}
          icon={Layers}
          color="blue"
        />
      </div>
      <MetricCard
        title="Average Moderation Time"
        value={dashboardData.listingModeration.averageModerationTime}
        icon={Clock}
        color="purple"
      />
    </div>
  );

  const renderQueueHealth = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(dashboardData.queueHealth).map(([queueName, data]) => {
          if (typeof data === "object" && data.size !== undefined) {
            return (
              <div key={queueName} className="bg-white rounded-lg shadow p-4">
                <h4 className="font-semibold capitalize mb-2">
                  {queueName.replace(/([A-Z])/g, " $1")}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Size:</span>
                    <span className="font-semibold">{data.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Rate:</span>
                    <span className="font-semibold">{data.processingRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Failed:</span>
                    <span className={`font-semibold ${data.failedJobs > 0 ? "text-red-600" : "text-green-600"}`}>
                      {data.failedJobs}
                    </span>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <HealthCard
          title="Worker Status"
          status={dashboardData.queueHealth.workerStatus}
          details="All workers operational"
        />
        <MetricCard
          title="Avg Processing Time"
          value={dashboardData.queueHealth.avgProcessingTime}
          icon={Clock}
          color="blue"
        />
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Email Volume"
          value={dashboardData.notifications.emailVolume}
          icon={Bell}
          color="blue"
        />
        <MetricCard
          title="SMS Volume"
          value={dashboardData.notifications.smsVolume}
          icon={Bell}
          color="green"
        />
        <MetricCard
          title="Push Volume"
          value={dashboardData.notifications.pushVolume}
          icon={Bell}
          color="purple"
        />
        <MetricCard
          title="In-App Volume"
          value={dashboardData.notifications.inAppVolume}
          icon={Bell}
          color="orange"
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <MetricCard
          title="Delivery Success Rate"
          value={dashboardData.notifications.deliverySuccessRate}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Failed Notifications"
          value={dashboardData.notifications.failedNotifications}
          icon={XCircle}
          color="red"
        />
      </div>
      <MetricCard
        title="Processing Time"
        value={dashboardData.notifications.processingTime}
        icon={Clock}
        color="blue"
      />
    </div>
  );

  const renderFraudAlerts = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Alerts Today"
          value={dashboardData.fraudAlerts.alertsToday}
          icon={AlertTriangle}
          color="orange"
        />
        <MetricCard
          title="Confirmed Fraud"
          value={dashboardData.fraudAlerts.confirmedFraud}
          icon={Shield}
          color="red"
        />
        <MetricCard
          title="Detection Rate"
          value={dashboardData.fraudAlerts.detectionRate}
          icon={TrendingUp}
          color="green"
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <MetricCard
          title="High-Risk Users"
          value={dashboardData.fraudAlerts.highRiskUsers}
          icon={Users}
          color="yellow"
        />
        <MetricCard
          title="Blocked Transactions"
          value={dashboardData.fraudAlerts.blockedTransactions}
          icon={XCircle}
          color="red"
        />
      </div>
      <MetricCard
        title="False Positive Rate"
        value={dashboardData.fraudAlerts.falsePositiveRate}
        icon={AlertCircle}
        color="blue"
      />
    </div>
  );

  const renderWidget = () => {
    switch (activeWidget) {
      case "overview":
        return renderOverview();
      case "systemHealth":
        return renderSystemHealth();
      case "paymentFailures":
        return renderPaymentFailures();
      case "escrowDisputes":
        return renderEscrowDisputes();
      case "dealerOnboarding":
        return renderDealerOnboarding();
      case "listingModeration":
        return renderListingModeration();
      case "queueHealth":
        return renderQueueHealth();
      case "notifications":
        return renderNotifications();
      case "fraudAlerts":
        return renderFraudAlerts();
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800">Operations Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Platform Management</p>
          </div>
          <nav className="mt-6">
            {widgets.map((widget) => {
              const Icon = widget.icon;
              return (
                <button
                  key={widget.id}
                  onClick={() => setActiveWidget(widget.id)}
                  className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                    activeWidget === widget.id
                      ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {widget.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800">
              {widgets.find((w) => w.id === activeWidget)?.name}
            </h2>
            <p className="text-gray-500 mt-1">
              Real-time monitoring and management
            </p>
          </div>
          {renderWidget()}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
    cyan: "bg-cyan-50 text-cyan-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <Icon className={`w-5 h-5 ${colorClasses[color]?.split(" ")[1] || "text-gray-600"}`} />
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
      {trend && (
        <div className={`mt-2 text-sm ${trend.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
          {trend}
        </div>
      )}
    </div>
  );
};

const HealthCard = ({ title, status, details }) => {
  const statusColors = {
    healthy: "bg-green-100 text-green-600",
    warning: "bg-yellow-100 text-yellow-600",
    critical: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
          {status}
        </span>
      </div>
      <p className="text-sm text-gray-500">{details}</p>
    </div>
  );
};

export default OperationsDashboard;
