import React, { useState } from 'react';
import {
  Gavel,
  Clock,
  Shield,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MapPin,
  Calendar,
  CalendarDays,
  User,
  Users,
  FileText,
  Download,
  Phone,
  Mail,
  Eye,
  Heart,
  ClipboardCheck,
  CreditCard,
  Car,
  Settings,
  Home,
  Search,
  Bell,
  BellOff,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileBarChart,
  Truck,
  AlertTriangle,
  X,
  Check,
  Edit,
  Plus,
  Filter,
  RefreshCw,
  ArrowRight,
  Info,
  Wallet,
  Landmark,
  PieChart,
  Activity,
  Server,
  Database,
  Zap,
  Globe,
  Lock,
  ShieldAlert,
  EyeOff,
  MessageCircle,
  AlertOctagon,
  CheckSquare,
  DollarSign,
  Target,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { FC } from 'react';

// Types
type AlertSeverity = 'critical' | 'high' | 'medium' | 'info';
type AlertSource = 'marketplace' | 'dealer' | 'auction' | 'escrow' | 'inspection' | 'compliance' | 'risk' | 'support';
type AlertStatus = 'open' | 'acknowledged' | 'resolved';

interface Alert {
  id: string;
  source: AlertSource;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  status: AlertStatus;
  assignedTo?: string;
}

interface LiveActivity {
  id: string;
  type: 'listing' | 'registration' | 'inspection' | 'escrow' | 'support' | 'finance';
  title: string;
  timestamp: string;
}

interface ExecutiveMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface Task {
  id: string;
  type: string;
  title: string;
  priority: 'urgent' | 'high' | 'normal';
  assignedTo?: string;
  dueDate?: string;
}

// Mock Data
const MOCK_ALERTS: Alert[] = [
  { id: 'a1', source: 'escrow', severity: 'critical', title: 'Escrow Dispute - Vehicle Damage Claim', description: 'Buyer claims vehicle has undisclosed damage', timestamp: '2026-01-15T10:30:00', status: 'open' },
  { id: 'a2', source: 'risk', severity: 'high', title: 'Suspicious Bidding Pattern', description: 'Multiple accounts bidding from same IP', timestamp: '2026-01-15T09:15:00', status: 'open' },
  { id: 'a3', source: 'compliance', severity: 'high', title: 'Document Expiry Warning', description: '3 dealers have documents expiring in 7 days', timestamp: '2026-01-15T08:00:00', status: 'acknowledged', assignedTo: 'James K.' },
  { id: 'a4', source: 'support', severity: 'medium', title: 'Support Ticket Backlog', description: '12 tickets pending > 4 hours', timestamp: '2026-01-15T07:45:00', status: 'open' },
  { id: 'a5', source: 'marketplace', severity: 'info', title: 'New Mechanic Marketplace Integration', description: 'AutoInspect Kenya API connected', timestamp: '2026-01-14T16:00:00', status: 'resolved' },
];

const MOCK_ACTIVITIES: LiveActivity[] = [
  { id: '1', type: 'listing', title: 'New listing: TOYOTA Land Cruiser (Nairobi)', timestamp: '2026-01-15T10:45:00' },
  { id: '2', type: 'registration', title: 'Bidder registered for AUC-2026-001', timestamp: '2026-01-15T10:42:00' },
  { id: '3', type: 'inspection', title: 'Inspection completed: PORSCHE Cayenne', timestamp: '2026-01-15T10:38:00' },
  { id: '4', type: 'escrow', title: 'Escrow released: Vehicle transfer completed', timestamp: '2026-01-15T10:30:00' },
  { id: '5', type: 'listing', title: 'Featured listing purchased: Premium Auto', timestamp: '2026-01-15T10:25:00' },
  { id: '6', type: 'support', title: 'Support ticket escalated: Payment dispute', timestamp: '2026-01-15T10:20:00' },
];

const MOCK_METRICS: ExecutiveMetric[] = [
  { label: 'Vehicles Listed', value: 127, change: '+12', trend: 'up' },
  { label: 'Vehicles Sold', value: 34, change: '+8', trend: 'up' },
  { label: 'Live Auctions', value: 8, trend: 'neutral' },
  { label: 'Active Dealers', value: 156, change: '+3', trend: 'up' },
  { label: 'Escrow Volume', value: 'Ksh 45.2M', change: '+15%', trend: 'up' },
  { label: 'Support Tickets', value: 23, change: '-5', trend: 'down' },
  { label: 'Compliance Alerts', value: 4, trend: 'neutral' },
  { label: 'Revenue Today', value: 'Ksh 2.1M', change: '+22%', trend: 'up' },
];

// Helper Functions
const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
  });
};

const severityColors: Record<AlertSeverity, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  info: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

const sourceLabels: Record<AlertSource, string> = {
  marketplace: 'Marketplace',
  dealer: 'Dealer',
  auction: 'Auction',
  escrow: 'Escrow',
  inspection: 'Inspection',
  compliance: 'Compliance',
  risk: 'Risk',
  support: 'Support',
};

// Nav Item Component
const NavItem: FC<{ id: string; label: string; icon: React.ReactNode; active: boolean; badge?: number }> = ({ 
  id, label, icon, active, badge 
}) => (
  <button
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
      active
        ? 'bg-[#1E3063] text-white'
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
        active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

// Metric Card
const MetricCard: FC<{ metric: ExecutiveMetric; icon: React.ReactNode; color?: string }> = ({ 
  metric, 
  icon,
  color = '#1E3063' 
}) => (
  <Card className="p-4">
    <div className="flex items-start justify-between mb-2">
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: color + '15', color }}
      >
        {icon}
      </div>
      {metric.change && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          metric.trend === 'up' ? 'text-emerald-600' : 
          metric.trend === 'down' ? 'text-red-600' : 
          'text-slate-500'
        }`}>
          {metric.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
           metric.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          {metric.change}
        </div>
      )}
    </div>
    <p className="text-2xl font-black text-[#1E3063]">{metric.value}</p>
    <p className="text-xs text-slate-500">{metric.label}</p>
  </Card>
);

// Live Activity Item
const LiveActivityItem: FC<{ activity: LiveActivity }> = ({ activity }) => {
  const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    listing: { icon: <Car className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
    registration: { icon: <User className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' },
    inspection: { icon: <ClipboardCheck className="w-4 h-4" />, color: 'bg-purple-100 text-purple-600' },
    escrow: { icon: <Wallet className="w-4 h-4" />, color: 'bg-amber-100 text-amber-600' },
    support: { icon: <MessageCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-600' },
    finance: { icon: <DollarSign className="w-4 h-4" />, color: 'bg-teal-100 text-teal-600' },
  };
  const config = typeConfig[activity.type] || typeConfig.listing;

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800">{activity.title}</p>
        <p className="text-xs text-slate-500">{formatTime(activity.timestamp)}</p>
      </div>
    </div>
  );
};

// Alert Card
const AlertCard: FC<{ alert: Alert }> = ({ alert }) => {
  const colors = severityColors[alert.severity];

  return (
    <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {alert.severity === 'critical' && <AlertOctagon className="w-4 h-4 text-red-600" />}
          {alert.severity === 'high' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
          {alert.severity === 'medium' && <AlertCircle className="w-4 h-4 text-blue-600" />}
          {alert.severity === 'info' && <Info className="w-4 h-4 text-slate-600" />}
          <Badge size="sm" className={`${colors.bg} ${colors.text} border-0`}>
            {alert.severity}
          </Badge>
        </div>
        <span className="text-xs text-slate-500">{formatTime(alert.timestamp)}</span>
      </div>
      <h4 className="font-bold text-slate-800 mb-1">{alert.title}</h4>
      <p className="text-sm text-slate-600 mb-2">{alert.description}</p>
      <div className="flex items-center justify-between">
        <Badge size="sm" className="bg-slate-200 text-slate-600 border-0">
          {sourceLabels[alert.source]}
        </Badge>
        {alert.status === 'open' ? (
          <Button variant="primary" size="sm" className="bg-[#1E3063]">
            Acknowledge
          </Button>
        ) : alert.assignedTo ? (
          <span className="text-xs text-slate-500">Assigned to {alert.assignedTo}</span>
        ) : null}
      </div>
    </div>
  );
};

// Module Card
const ModuleCard: FC<{ 
  title: string; 
  icon: React.ReactNode; 
  description: string;
  stats: { label: string; value: string | number }[];
  onClick: () => void;
  color?: string;
}> = ({ title, icon, description, stats, onClick, color = '#1E3063' }) => (
  <Card className="p-5 hover:shadow-lg transition-all cursor-pointer group">
    <div className="flex items-start gap-4 mb-4">
      <div 
        className="w-14 h-14 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color + '15', color }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-[#1E3063] group-hover:text-[#C85A32] transition-colors">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400" />
    </div>
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-black text-[#1E3063]">{stat.value}</p>
          <p className="text-[10px] text-slate-500">{stat.label}</p>
        </div>
      ))}
    </div>
  </Card>
);

// Executive Dashboard
const ExecutiveDashboard: FC = () => (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-black text-[#1E3063]">Operations Dashboard</h1>
        <p className="text-slate-500">Real-time marketplace overview</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-full">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">System Online</span>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>

    {/* System Status */}
    <div className="flex items-center gap-6 p-4 bg-white rounded-xl border border-slate-200 overflow-x-auto">
      {[
        { label: 'API', status: 'healthy' },
        { label: 'Database', status: 'healthy' },
        { label: 'Payments', status: 'healthy' },
        { label: 'Search', status: 'healthy' },
        { label: 'Notifications', status: 'degraded' },
      ].map((sys, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sys.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-xs font-medium text-slate-600">{sys.label}</span>
        </div>
      ))}
    </div>

    {/* Metrics Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {MOCK_METRICS.map((metric, i) => (
        <MetricCard 
          key={i} 
          metric={metric} 
          icon={<Activity className="w-5 h-5" />}
          color={['#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6'][i]}
        />
      ))}
    </div>

    {/* Main Grid */}
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-[#1E3063] flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Live Activity
          </h3>
          <Badge className="bg-emerald-100 text-emerald-700 border-0">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse" />
            Real-time
          </Badge>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {MOCK_ACTIVITIES.map(activity => (
            <LiveActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-[#1E3063]">Active Alerts</h3>
        </div>
        <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
          {MOCK_ALERTS.filter(a => a.status === 'open').slice(0, 4).map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      </Card>
    </div>

    {/* Operations Modules */}
    <div>
      <h2 className="text-lg font-bold text-[#1E3063] mb-4">Operations Modules</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ModuleCard
          title="Marketplace Operations"
          icon={<Globe className="w-6 h-6" />}
          description="Listings, categories, and inventory"
          stats={[
            { label: 'Total', value: '1,247' },
            { label: 'Featured', value: '23' },
            { label: 'Pending', value: '8' },
          ]}
          onClick={() => {}}
          color="#3B82F6"
        />
        <ModuleCard
          title="Dealer Operations"
          icon={<Building2 className="w-6 h-6" />}
          description="Verified dealers and performance"
          stats={[
            { label: 'Verified', value: '156' },
            { label: 'Pending', value: '4' },
            { label: 'Active', value: '89%' },
          ]}
          onClick={() => {}}
          color="#10B981"
        />
        <ModuleCard
          title="Auction Operations"
          icon={<Gavel className="w-6 h-6" />}
          description="Live auctions and organizer management"
          stats={[
            { label: 'Live', value: '8' },
            { label: 'Today', value: '12' },
            { label: 'Volume', value: 'Ksh 156M' },
          ]}
          onClick={() => {}}
          color="#EF4444"
        />
        <ModuleCard
          title="Inspection Marketplace"
          icon={<ClipboardCheck className="w-6 h-6" />}
          description="Mechanics, bookings, and reports"
          stats={[
            { label: 'Mechanics', value: '45' },
            { label: 'Reports', value: '234' },
            { label: 'Avg Time', value: '4.2h' },
          ]}
          onClick={() => {}}
          color="#8B5CF6"
        />
        <ModuleCard
          title="Escrow Operations"
          icon={<Wallet className="w-6 h-6" />}
          description="Private seller transactions only"
          stats={[
            { label: 'Open', value: '23' },
            { label: 'Volume', value: 'Ksh 45M' },
            { label: 'Disputes', value: '2' },
          ]}
          onClick={() => {}}
          color="#F59E0B"
        />
        <ModuleCard
          title="Support Operations"
          icon={<MessageCircle className="w-6 h-6" />}
          description="Tickets, disputes, and satisfaction"
          stats={[
            { label: 'Open', value: '23' },
            { label: 'Urgent', value: '3' },
            { label: 'Satisfaction', value: '94%' },
          ]}
          onClick={() => {}}
          color="#EC4899"
        />
        <ModuleCard
          title="Compliance Center"
          icon={<ShieldCheck className="w-6 h-6" />}
          description="Policies, audits, and reviews"
          stats={[
            { label: 'Alerts', value: '4' },
            { label: 'Reviews', value: '12' },
            { label: 'Approved', value: '98%' },
          ]}
          onClick={() => {}}
          color="#6366F1"
        />
        <ModuleCard
          title="Risk Center"
          icon={<ShieldAlert className="w-6 h-6" />}
          description="Fraud detection and alerts"
          stats={[
            { label: 'High', value: '1' },
            { label: 'Medium', value: '5' },
            { label: 'Blocked', value: '12' },
          ]}
          onClick={() => {}}
          color="#EF4444"
        />
        <ModuleCard
          title="Revenue Center"
          icon={<DollarSign className="w-6 h-6" />}
          description="Subscriptions, fees, and commissions"
          stats={[
            { label: 'Today', value: 'Ksh 2.1M' },
            { label: 'MTD', value: 'Ksh 45M' },
            { label: 'Growth', value: '+18%' },
          ]}
          onClick={() => {}}
          color="#14B8A6"
        />
      </div>
    </div>
  </div>
);

// Alert Center
const AlertCenter: FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const filteredAlerts = severityFilter === 'all' ? MOCK_ALERTS : MOCK_ALERTS.filter(a => a.severity === severityFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#1E3063]">Alert Center</h1>
        <p className="text-slate-500">All operational alerts aggregated</p>
      </div>

      <div className="flex gap-2">
        {(['all', 'critical', 'high', 'medium', 'info'] as const).map(sev => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              severityFilter === sev ? 'bg-[#1E3063] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {sev.charAt(0).toUpperCase() + sev.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filteredAlerts.map(alert => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
};

// System Health
const SystemHealth: FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black text-[#1E3063]">System Health</h1>
      <p className="text-slate-500">Platform infrastructure monitoring</p>
    </div>

    <div className="grid md:grid-cols-4 gap-4">
      {[
        { label: 'API Status', status: 'healthy', uptime: '99.9%' },
        { label: 'Database', status: 'healthy', uptime: '99.99%' },
        { label: 'Payments', status: 'healthy', uptime: '99.95%' },
        { label: 'Search', status: 'degraded', uptime: '98.5%' },
        { label: 'Notifications', status: 'degraded', uptime: '97.2%' },
        { label: 'Image Storage', status: 'healthy', uptime: '99.99%' },
        { label: 'Email Service', status: 'healthy', uptime: '99.8%' },
        { label: 'SMS Service', status: 'healthy', uptime: '99.7%' },
      ].map((sys, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-800">{sys.label}</span>
            <div className={`w-3 h-3 rounded-full ${sys.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${sys.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: sys.uptime }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600">{sys.uptime}</span>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// Reports
const Reports: FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black text-[#1E3063]">Report Center</h1>
      <p className="text-slate-500">Generate and export operational reports</p>
    </div>

    <div className="grid md:grid-cols-3 gap-4">
      {[
        'Marketplace Report',
        'Dealer Performance',
        'Auction Analytics',
        'Escrow Transactions',
        'Inspection Reports',
        'Finance Applications',
        'Revenue Summary',
        'Compliance Report',
        'Support Metrics',
        'Risk Analysis',
      ].map((report, i) => (
        <Card key={i} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileBarChart className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-700">{report}</span>
            </div>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>

    <Card>
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-bold text-[#1E3063]">Export Options</h3>
      </div>
      <div className="p-4 flex gap-3">
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline">
          <FileBarChart className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
        <Button variant="outline">
          <Database className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </Card>
  </div>
);

// Revenue Center
const RevenueCenter: FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black text-[#1E3063]">Revenue Center</h1>
      <p className="text-slate-500">Subscriptions, fees, and commission tracking</p>
    </div>

    <div className="grid md:grid-cols-4 gap-4">
      {[
        { label: 'Today', value: 'Ksh 2.1M', icon: <DollarSign className="w-6 h-6" />, color: '#10B981' },
        { label: 'This Month', value: 'Ksh 45M', icon: <Calendar className="w-6 h-6" />, color: '#3B82F6' },
        { label: 'Subscriptions', value: '156', icon: <Users className="w-6 h-6" />, color: '#8B5CF6' },
        { label: 'Growth', value: '+18%', icon: <TrendingUp className="w-6 h-6" />, color: '#F59E0B' },
      ].map((stat, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.color + '15', color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-[#1E3063]">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>

    <Card>
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-bold text-[#1E3063]">Revenue Breakdown</h3>
      </div>
      <div className="p-4 space-y-4">
        {[
          { label: 'Dealer Subscriptions', value: '45%', amount: 'Ksh 20.3M', color: '#3B82F6' },
          { label: 'Listing Fees', value: '25%', amount: 'Ksh 11.3M', color: '#10B981' },
          { label: 'Auction Commissions', value: '20%', amount: 'Ksh 9.0M', color: '#F59E0B' },
          { label: 'Featured Listings', value: '10%', amount: 'Ksh 4.5M', color: '#8B5CF6' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-32 font-medium text-slate-700">{item.label}</div>
            <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: item.value, backgroundColor: item.color }} />
            </div>
            <div className="w-32 text-right">
              <span className="font-bold text-slate-800">{item.amount}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

// Escrow Operations
const EscrowOperations: FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black text-[#1E3063]">Escrow Operations</h1>
      <p className="text-slate-500">Private seller transactions only</p>
    </div>

    <Card className="p-4 bg-amber-50 border-amber-200">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800">Scope Notice</p>
          <p className="text-sm text-amber-700">
            Escrow operations apply ONLY to private seller transactions. 
            Dealer sales and auction payments are handled directly between parties.
          </p>
        </div>
      </div>
    </Card>

    <div className="grid md:grid-cols-4 gap-4">
      {[
        { label: 'Open Escrows', value: '23', icon: <Wallet className="w-6 h-6" />, color: '#F59E0B' },
        { label: 'Volume', value: 'Ksh 45M', icon: <DollarSign className="w-6 h-6" />, color: '#10B981' },
        { label: 'Disputes', value: '2', icon: <AlertTriangle className="w-6 h-6" />, color: '#EF4444' },
        { label: 'Completed', value: '156', icon: <CheckCircle2 className="w-6 h-6" />, color: '#3B82F6' },
      ].map((stat, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.color + '15', color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-[#1E3063]">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// Main Component
export const MarketplaceOperationsHub: FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const openAlerts = MOCK_ALERTS.filter(a => a.status === 'open').length;

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <ExecutiveDashboard />;
      case 'alerts':
        return <AlertCenter />;
      case 'system':
        return <SystemHealth />;
      case 'reports':
        return <Reports />;
      case 'revenue':
        return <RevenueCenter />;
      case 'escrow':
        return <EscrowOperations />;
      default:
        return <ExecutiveDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3063] flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#1E3063]">KAYAD</p>
              <p className="text-xs text-slate-500">Operations Hub</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1E3063] flex items-center justify-center text-white font-bold">
              JK
            </div>
            <div>
              <p className="font-bold text-[#1E3063] text-sm">James K.</p>
              <p className="text-xs text-slate-500">Platform Admin</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">
            Overview
          </div>
          <NavItem id="dashboard" label="Dashboard" icon={<Home className="w-5 h-5" />} active={activeSection === 'dashboard'} />
          <NavItem id="alerts" label="Alert Center" icon={<Bell className="w-5 h-5" />} active={activeSection === 'alerts'} badge={openAlerts} />

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mt-4 mb-2">
            Operations
          </div>
          <NavItem id="marketplace" label="Marketplace" icon={<Globe className="w-5 h-5" />} active={activeSection === 'marketplace'} />
          <NavItem id="dealers" label="Dealers" icon={<Building2 className="w-5 h-5" />} active={activeSection === 'dealers'} />
          <NavItem id="auctions" label="Auctions" icon={<Gavel className="w-5 h-5" />} active={activeSection === 'auctions'} />
          <NavItem id="escrow" label="Escrow" icon={<Wallet className="w-5 h-5" />} active={activeSection === 'escrow'} />
          <NavItem id="compliance" label="Compliance" icon={<ShieldCheck className="w-5 h-5" />} active={activeSection === 'compliance'} />
          <NavItem id="risk" label="Risk" icon={<ShieldAlert className="w-5 h-5" />} active={activeSection === 'risk'} />

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mt-4 mb-2">
            Finance
          </div>
          <NavItem id="revenue" label="Revenue" icon={<DollarSign className="w-5 h-5" />} active={activeSection === 'revenue'} />
          <NavItem id="reports" label="Reports" icon={<FileBarChart className="w-5 h-5" />} active={activeSection === 'reports'} />

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mt-4 mb-2">
            Infrastructure
          </div>
          <NavItem id="system" label="System Health" icon={<Server className="w-5 h-5" />} active={activeSection === 'system'} />
        </nav>

        <div className="p-3 border-t border-slate-200">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default MarketplaceOperationsHub;
