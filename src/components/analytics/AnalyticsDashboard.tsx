import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Users,
  Gavel,
  Car,
  Banknote,
  Eye,
  Clock,
  ShieldCheck,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Target,
  Zap
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  TimeRange,
  DashboardMetrics,
  TimeSeriesData,
  MarketDemandData,
  MarketRecommendation
} from '../../utils/auctionAnalytics';
import {
  generateDashboardMetrics,
  generateTimeSeriesData,
  generateMarketDemandData,
  generateMarketRecommendations,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDuration,
  getTrendColor,
  getDateRange
} from '../../utils/auctionAnalytics';

export interface AnalyticsDashboardProps {
  userRole?: 'buyer' | 'organizer' | 'admin' | 'compliance_officer';
  organizerId?: string;
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void;
  onRefresh?: () => void;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  change?: string;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, trend, change, icon, color = '#1E3063' }) => (
  <Card className="p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color + '15', color }}
      >
        {icon}
      </div>
      {trend && (
        <div 
          className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
          style={{ backgroundColor: getTrendColor(trend) + '15', color: getTrendColor(trend) }}
        >
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {trend === 'stable' && <Minus className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
    <div className="text-2xl font-black text-[#1E3063] mb-1">{value}</div>
    <div className="text-xs text-slate-500">{title}</div>
  </Card>
);

// Simple Line Chart (SVG-based)
const SimpleLineChart: React.FC<{ data: TimeSeriesData; height?: number }> = ({ 
  data, 
  height = 200 
}) => {
  const width = 400;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const values = data.series.map(s => s.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  
  const points = data.series.map((point, i) => {
    const x = padding + (i / (data.series.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `${padding},${padding + chartHeight} ${points} ${padding + chartWidth},${padding + chartHeight}`;
  
  const color = getTrendColor(data.trend);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          y1={padding + chartHeight * ratio}
          x2={padding + chartWidth}
          y2={padding + chartHeight * ratio}
          stroke="#E2E8F0"
          strokeDasharray="4"
        />
      ))}
      
      {/* Area */}
      <polygon
        points={areaPoints}
        fill={color}
        fillOpacity={0.1}
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Points */}
      {data.series.map((point, i) => {
        const x = padding + (i / (data.series.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            fill={color}
          />
        );
      })}
    </svg>
  );
};

// Bar Chart (SVG-based)
const SimpleBarChart: React.FC<{ data: MarketDemandData[]; maxItems?: number }> = ({ 
  data, 
  maxItems = 8 
}) => {
  const sliced = data.slice(0, maxItems);
  const maxValue = Math.max(...sliced.map(d => d.count));
  const width = 400;
  const barHeight = 24;
  const gap = 8;
  const padding = { top: 20, right: 80, bottom: 20, left: 120 };
  const chartHeight = sliced.length * (barHeight + gap);

  return (
    <svg viewBox={`0 0 ${width} ${chartHeight + padding.top + padding.bottom}`} className="w-full h-auto">
      {sliced.map((item, i) => {
        const barWidth = (item.count / maxValue) * (width - padding.left - padding.right);
        const y = padding.top + i * (barHeight + gap);
        
        return (
          <g key={item.dimension}>
            {/* Label */}
            <text
              x={padding.left - 8}
              y={y + barHeight / 2 + 4}
              textAnchor="end"
              className="text-[10px] fill-slate-600"
            >
              {item.dimensionLabel}
            </text>
            
            {/* Bar */}
            <rect
              x={padding.left}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={i === 0 ? '#1E3063' : '#1E3063' + '40'}
            />
            
            {/* Value */}
            <text
              x={padding.left + barWidth + 8}
              y={y + barHeight / 2 + 4}
              className="text-[10px] fill-slate-700 font-medium"
            >
              {item.count}
            </text>
            
            {/* Percentage */}
            <text
              x={width - padding.right + 8}
              y={y + barHeight / 2 + 4}
              textAnchor="end"
              className="text-[10px] fill-slate-500"
            >
              {formatPercent(item.percentage)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// Donut Chart (SVG-based)
const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[]; size?: number }> = ({ 
  data, 
  size = 200 
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2 - 10;
  const innerRadius = radius * 0.6;
  const center = size / 2;
  
  let currentAngle = -90;
  
  const paths = data.map((item) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    
    const ix1 = center + innerRadius * Math.cos(startRad);
    const iy1 = center + innerRadius * Math.sin(startRad);
    const ix2 = center + innerRadius * Math.cos(endRad);
    const iy2 = center + innerRadius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    return {
      ...item,
      path: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`,
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-32 h-32 md:w-40 md:h-40">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.path}
            fill={p.color}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        ))}
        <text x={center} y={center - 5} textAnchor="middle" className="text-lg font-black fill-slate-800">
          {total}
        </text>
        <text x={center} y={center + 12} textAnchor="middle" className="text-[10px] fill-slate-500">
          Total
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-slate-600">{item.label}</span>
            <span className="text-xs font-bold text-slate-800">{formatPercent((item.value / total) * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Dashboard Component
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userRole = 'admin',
  organizerId,
  onExport,
  onRefresh,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate mock data
  const metrics = useMemo(() => generateDashboardMetrics(), []);
  const bidTrends = useMemo(() => generateTimeSeriesData(30, 150, 0.15), []);
  const marketDemand = useMemo(() => generateMarketDemandData(), []);
  const recommendations = useMemo(() => generateMarketRecommendations(), []);
  const dateRange = useMemo(() => getDateRange(timeRange), [timeRange]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
    onRefresh?.();
  };

  const isAdmin = userRole === 'admin' || userRole === 'compliance_officer';
  const isOrganizer = userRole === 'organizer';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1E3063]">Auction Intelligence</h2>
          <p className="text-sm text-slate-500">
            {isAdmin ? 'Platform-wide analytics and insights' : 'Your auction performance analytics'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20 bg-white"
            >
              {TIME_RANGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {onExport && (
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Date Range Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="neutral" className="bg-slate-100 text-slate-600">
          {dateRange.start} to {dateRange.end}
        </Badge>
        {isOrganizer && (
          <Badge variant="info" className="bg-blue-100 text-blue-700 border-blue-200">
            <Eye className="w-3 h-3 mr-1" />
            Your Auctions Only
          </Badge>
        )}
        {isAdmin && (
          <Badge variant="info" className="bg-purple-100 text-purple-700 border-purple-200">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Platform-wide View
          </Badge>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Active Auctions"
          value={formatNumber(metrics.activeAuctions)}
          trend="up"
          change="+12%"
          icon={<Gavel className="w-5 h-5" />}
          color="#1E3063"
        />
        <MetricCard
          title="Total Bids"
          value={formatNumber(metrics.totalBids)}
          trend="up"
          change="+8.3%"
          icon={<Activity className="w-5 h-5" />}
          color="#10B981"
        />
        <MetricCard
          title="Avg. Bidders"
          value={metrics.averageBiddersPerAuction.toFixed(1)}
          trend="up"
          change="+5.2%"
          icon={<Users className="w-5 h-5" />}
          color="#6366F1"
        />
        <MetricCard
          title="Completion Rate"
          value={formatPercent(metrics.auctionCompletionRate)}
          trend="stable"
          change="+0.3%"
          icon={<Target className="w-5 h-5" />}
          color="#F59E0B"
        />
        <MetricCard
          title="Avg. Selling Price"
          value={formatCurrency(metrics.averageSellingPrice)}
          trend="up"
          change="+6.8%"
          icon={<Banknote className="w-5 h-5" />}
          color="#C85A32"
        />
        <MetricCard
          title="Payment Rate"
          value={formatPercent(metrics.winningPaymentCompletion)}
          trend="up"
          change="+2.1%"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="#10B981"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bid Trends Chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1E3063]">Bid Activity Trends</h3>
              <p className="text-xs text-slate-500">Daily bid volume over selected period</p>
            </div>
            <Badge 
              variant={bidTrends.trend === 'up' ? 'success' : bidTrends.trend === 'down' ? 'danger' : 'neutral'}
              className={
                bidTrends.trend === 'up' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                bidTrends.trend === 'down' ? 'bg-red-100 text-red-700 border-red-200' :
                'bg-slate-100 text-slate-600 border-slate-200'
              }
            >
              {bidTrends.trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
              {bidTrends.trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
              {bidTrends.changePercent > 0 ? '+' : ''}{bidTrends.changePercent}%
            </Badge>
          </div>
          <SimpleLineChart data={bidTrends} height={200} />
        </Card>

        {/* Quick Stats */}
        <Card className="p-5">
          <h3 className="font-bold text-[#1E3063] mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">Vehicles Sold</span>
              <span className="text-lg font-black text-[#1E3063]">{formatNumber(metrics.completedAuctions)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">Reserve Success</span>
              <span className="text-lg font-black text-emerald-600">{formatPercent(metrics.reserveAchievementRate)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">Avg. Duration</span>
              <span className="text-lg font-black text-[#1E3063]">{formatDuration(metrics.averageAuctionDuration)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">Total Value</span>
              <span className="text-lg font-black text-[#C85A32]">{formatCurrency(metrics.totalValue)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Market Demand & Recommendations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Demand */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1E3063]">Market Demand by Make</h3>
              <p className="text-xs text-slate-500">Auction volume by vehicle manufacturer</p>
            </div>
          </div>
          <SimpleBarChart data={marketDemand.filter(d => !['suv', 'sedan', 'pickup', 'hybrid', 'automatic'].includes(d.dimension))} />
        </Card>

        {/* Recommendations */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1E3063]">Market Insights</h3>
              <p className="text-xs text-slate-500">Data-driven recommendations</p>
            </div>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {recommendations.slice(0, 3).map(rec => (
              <div 
                key={rec.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#1E3063]/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    rec.potentialImpact === 'high' ? 'bg-emerald-100 text-emerald-600' :
                    rec.potentialImpact === 'medium' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1E3063] mb-1">{rec.title}</p>
                    <p className="text-xs text-slate-600">{rec.insight}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{rec.data}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Body Type Distribution */}
        <Card className="p-5">
          <h3 className="font-bold text-[#1E3063] mb-4">Auction by Body Type</h3>
          <DonutChart 
            data={[
              { label: 'SUV', value: 287, color: '#1E3063' },
              { label: 'Sedan', value: 234, color: '#C85A32' },
              { label: 'Pickup', value: 189, color: '#10B981' },
              { label: 'Hatchback', value: 156, color: '#6366F1' },
              { label: 'Van', value: 89, color: '#F59E0B' },
            ]} 
          />
        </Card>

        {/* Fuel Type Distribution */}
        <Card className="p-5">
          <h3 className="font-bold text-[#1E3063] mb-4">Auction by Fuel Type</h3>
          <DonutChart 
            data={[
              { label: 'Petrol', value: 567, color: '#1E3063' },
              { label: 'Diesel', value: 423, color: '#6366F1' },
              { label: 'Hybrid', value: 89, color: '#10B981' },
              { label: 'Electric', value: 34, color: '#F59E0B' },
            ]} 
          />
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
