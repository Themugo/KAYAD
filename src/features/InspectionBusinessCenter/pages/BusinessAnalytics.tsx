// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - BUSINESS ANALYTICS
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Star,
  CheckCircle,
  Car,
  MapPin,
  Calendar,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
};

// Sample data
const ANALYTICS_DATA = {
  overview: {
    totalJobs: 245,
    completedJobs: 228,
    cancelledJobs: 12,
    grossRevenue: 8950000,
    netRevenue: 7607500,
    avgJobValue: 36531,
    jobGrowth: 12,
    revenueGrowth: 18,
  },
  jobs: {
    byType: [
      { type: 'Pre-Purchase', count: 156, revenue: 6240000, color: '#3b82f6' },
      { type: 'Dealer', count: 45, revenue: 1350000, color: '#10b981' },
      { type: 'Fleet', count: 15, revenue: 900000, color: '#f59e0b' },
      { type: 'Auction', count: 12, revenue: 360000, color: '#8b5cf6' },
    ],
    byCounty: [
      { county: 'Nairobi', count: 145, revenue: 5800000 },
      { county: 'Kiambu', count: 35, revenue: 1225000 },
      { county: 'Mombasa', count: 28, revenue: 980000 },
      { county: 'Kisumu', count: 20, revenue: 700000 },
      { county: 'Nakuru', count: 17, revenue: 245000 },
    ],
    avgInspectionTime: 75,
    completionRate: 93,
  },
  engineers: {
    totalEngineers: 8,
    utilizationRate: 78,
    topPerformers: [
      { name: 'David Maina', inspections: 78, rating: 4.8, quality: 98 },
      { name: 'Grace Wambui', inspections: 65, rating: 4.9, quality: 99 },
      { name: 'Faith Njeri', inspections: 58, rating: 4.7, quality: 96 },
    ],
  },
  customers: {
    newCustomers: 42,
    repeatCustomers: 38,
    avgRating: 4.7,
    byType: [
      { type: 'Private Buyers', count: 156, percentage: 64 },
      { type: 'Dealers', count: 45, percentage: 18 },
      { type: 'Fleet', count: 25, percentage: 10 },
      { type: 'Corporate', count: 19, percentage: 8 },
    ],
  },
  quality: {
    avgScore: 85,
    approvalRate: 94,
    reportsApproved: 215,
    reportsRejected: 13,
  },
  trend: [
    { month: 'Aug', jobs: 45, revenue: 1650000 },
    { month: 'Sep', jobs: 52, revenue: 1890000 },
    { month: 'Oct', jobs: 48, revenue: 1720000 },
    { month: 'Nov', jobs: 58, revenue: 2150000 },
    { month: 'Dec', jobs: 42, revenue: 1540000 },
    { month: 'Jan', jobs: 65, revenue: 2450000 },
  ],
};

export default function BusinessAnalytics({ providerId }: { providerId: string }) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(0)}K`;
    return `KES ${amount}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            Business Analytics
          </h1>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            Performance insights and growth metrics
          </p>
        </div>
        
        <div className="flex rounded-lg overflow-hidden">
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-4 py-2 text-sm font-medium capitalize"
              style={{
                backgroundColor: period === p ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                color: period === p ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Total Jobs"
          value={ANALYTICS_DATA.overview.totalJobs}
          trend={ANALYTICS_DATA.overview.jobGrowth}
          icon={<Car size={20} />}
        />
        <AnalyticsCard
          title="Gross Revenue"
          value={formatCurrency(ANALYTICS_DATA.overview.grossRevenue)}
          trend={ANALYTICS_DATA.overview.revenueGrowth}
          icon={<DollarSign size={20} />}
        />
        <AnalyticsCard
          title="Net Revenue"
          value={formatCurrency(ANALYTICS_DATA.overview.netRevenue)}
          icon={<TrendingUp size={20} />}
          color={KAYAD_COLORS.emerald}
        />
        <AnalyticsCard
          title="Completion Rate"
          value={`${ANALYTICS_DATA.jobs.completionRate}%`}
          icon={<CheckCircle size={20} />}
          color={KAYAD_COLORS.emerald}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Revenue Trend</h2>
          <div className="space-y-3">
            {ANALYTICS_DATA.trend.map((item, index) => {
              const maxRevenue = Math.max(...ANALYTICS_DATA.trend.map(t => t.revenue));
              const width = (item.revenue / maxRevenue) * 100;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-12 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{item.month}</span>
                  <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ delay: index * 0.1 }}
                      className="h-full rounded-lg flex items-center px-3"
                      style={{ backgroundColor: KAYAD_COLORS.emerald }}
                    >
                      <span className="text-xs font-medium text-white">{formatCurrency(item.revenue)}</span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jobs by Type */}
        <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Jobs by Inspection Type</h2>
          <div className="space-y-4">
            {ANALYTICS_DATA.jobs.byType.map((item, index) => {
              const total = ANALYTICS_DATA.jobs.byType.reduce((sum, i) => sum + i.count, 0);
              const percentage = (item.count / total) * 100;
              return (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{item.type}</span>
                    <span className="text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>
                      {item.count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics */}
        <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Performance Metrics</h2>
          <div className="space-y-4">
            <MetricRow label="Average Inspection Time" value={`${ANALYTICS_DATA.jobs.avgInspectionTime} min`} />
            <MetricRow label="Engineer Utilization" value={`${ANALYTICS_DATA.engineers.utilizationRate}%`} />
            <MetricRow label="Customer Satisfaction" value={`${ANALYTICS_DATA.customers.avgRating} ★`} />
            <MetricRow label="Quality Score" value={`${ANALYTICS_DATA.quality.avgScore}%`} color={KAYAD_COLORS.emerald} />
            <MetricRow label="Report Approval Rate" value={`${ANALYTICS_DATA.quality.approvalRate}%`} color={KAYAD_COLORS.emerald} />
          </div>
        </div>

        {/* Top Performers */}
        <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Top Performers</h2>
          <div className="space-y-4">
            {ANALYTICS_DATA.engineers.topPerformers.map((engineer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: KAYAD_COLORS.lightNavy, color: KAYAD_COLORS.white }}
                  >
                    {engineer.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{engineer.name}</p>
                    <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{engineer.inspections} inspections</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star size={12} fill={KAYAD_COLORS.mutedTerracotta} color={KAYAD_COLORS.mutedTerracotta} />
                    <span className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{engineer.rating}</span>
                  </div>
                  <p className="text-xs" style={{ color: KAYAD_COLORS.emerald }}>Quality: {engineer.quality}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Demand */}
        <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Geographic Demand</h2>
          <div className="space-y-3">
            {ANALYTICS_DATA.jobs.byCounty.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={14} style={{ color: KAYAD_COLORS.softBlue }} />
                  <span className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{item.county}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{item.count}</span>
                  <span className="text-xs ml-2" style={{ color: KAYAD_COLORS.softBlue }}>
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Insights */}
      <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
        <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Customer Insights</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
            <Users size={24} className="mx-auto mb-2" style={{ color: KAYAD_COLORS.lightNavy }} />
            <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{ANALYTICS_DATA.customers.newCustomers}</p>
            <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>New Customers</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
            <CheckCircle size={24} className="mx-auto mb-2" style={{ color: KAYAD_COLORS.emerald }} />
            <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>{ANALYTICS_DATA.customers.repeatCustomers}</p>
            <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Repeat Customers</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
            <Star size={24} className="mx-auto mb-2" fill={KAYAD_COLORS.mutedTerracotta} color={KAYAD_COLORS.mutedTerracotta} />
            <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{ANALYTICS_DATA.customers.avgRating}</p>
            <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Avg Rating</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
            <Clock size={24} className="mx-auto mb-2" style={{ color: KAYAD_COLORS.lightNavy }} />
            <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>4.2</p>
            <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Avg Bookings/Customer</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({ title, value, trend, icon, color }: {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color || KAYAD_COLORS.softBlue}15` }}>
          {icon}
        </div>
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold" style={{ color: color || KAYAD_COLORS.lightNavy }}>{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span className="text-sm font-medium">{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: color || KAYAD_COLORS.lightNavy }}>{value}</span>
    </div>
  );
}
