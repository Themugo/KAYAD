// ============================================================
// KAYAD OPERATIONS COMMAND CENTER
// OPERATIONAL HEARTBEAT
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  Gavel,
  ClipboardCheck,
  MessageSquare,
  Shield,
  Server,
  Zap,
  Eye,
  Bell,
  Settings,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  amber: '#f59e0b',
  red: '#ef4444',
  orange: '#ea580c',
};

// Sample data
const PLATFORM_HEALTH = {
  status: 'healthy',
  score: 97,
  servicesOnline: 16,
  totalServices: 17,
};

const LIVE_COUNTERS = {
  usersOnline: 2456,
  vehiclesListedToday: 89,
  dealerActivity: 156,
  inspectionBookings: 23,
  activeAuctions: 8,
  vehiclesSold: 12,
  vehicleSearches: 1543,
  supportTickets: 7,
  newAccounts: 34,
  apiRequests: 45678,
};

const SERVICES = [
  { code: 'marketplace', name: 'Marketplace', status: 'healthy', latency: 45 },
  { code: 'dealer_network', name: 'Dealer Network', status: 'healthy', latency: 32 },
  { code: 'auction_network', name: 'Auction Network', status: 'healthy', latency: 67 },
  { code: 'inspection_marketplace', name: 'Inspection Marketplace', status: 'healthy', latency: 89 },
  { code: 'vehicle_passport', name: 'Vehicle Passport', status: 'healthy', latency: 23 },
  { code: 'vehicle_intelligence', name: 'Vehicle Intelligence', status: 'warning', latency: 234 },
  { code: 'communications', name: 'Communications Hub', status: 'healthy', latency: 56 },
  { code: 'partner_api', name: 'Partner APIs', status: 'healthy', latency: 78 },
  { code: 'search', name: 'Search Engine', status: 'healthy', latency: 34 },
  { code: 'payments', name: 'Payments', status: 'healthy', latency: 123 },
  { code: 'notifications', name: 'Notifications', status: 'healthy', latency: 45 },
  { code: 'authentication', name: 'Authentication', status: 'healthy', latency: 12 },
];

const ACTIVE_INCIDENTS = [
  { id: 1, code: 'KAYAD-INC-A1B2C3', severity: 'high', title: 'Elevated latency on Vehicle Intelligence API', service: 'vehicle_intelligence', status: 'investigating', affected: 23, time: '15 min ago' },
  { id: 2, code: 'KAYAD-INC-D4E5F6', severity: 'medium', title: 'Delayed notifications in Communications Hub', service: 'communications', status: 'identified', affected: 5, time: '45 min ago' },
];

const ACTIVE_ALERTS = [
  { id: 1, severity: 'high', title: 'Vehicle Intelligence API response time exceeds threshold', source: 'vehicle_intelligence', time: '15 min ago' },
  { id: 2, severity: 'warning', title: 'Search query volume 40% above normal', source: 'search', time: '1 hour ago' },
  { id: 3, severity: 'info', title: 'New dealer registration spike in Nairobi region', source: 'dealer_network', time: '2 hours ago' },
];

const KPI_METRICS = [
  { label: 'Monthly Revenue', value: 'KES 245M', change: 12.5, positive: true },
  { label: 'Active Dealers', value: '1,234', change: 8.2, positive: true },
  { label: 'Vehicles Sold', value: '456', change: 15.3, positive: true },
  { label: 'Inspections', value: '789', change: 5.1, positive: true },
  { label: 'Customer Satisfaction', value: '94%', change: 2.1, positive: true },
  { label: 'Platform Uptime', value: '99.97%', change: 0.01, positive: true },
];

const SERVICE_CATEGORIES = [
  { name: 'Marketplace', services: ['marketplace', 'dealer_network'] },
  { name: 'Auctions', services: ['auction_network'] },
  { name: 'Inspection', services: ['inspection_marketplace'] },
  { name: 'Trust', services: ['vehicle_passport', 'vehicle_intelligence'] },
  { name: 'Infrastructure', services: ['search', 'authentication', 'payments', 'partner_api'] },
  { name: 'Communication', services: ['communications', 'notifications'] },
];

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'services' | 'analytics'>('overview');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={18} /> },
    { id: 'incidents', label: 'Incidents', icon: <AlertTriangle size={18} />, badge: ACTIVE_INCIDENTS.length },
    { id: 'services', label: 'Services', icon: <Server size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} /> },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle size={16} style={{ color: KAYAD_COLORS.emerald }} />;
      case 'warning': return <AlertTriangle size={16} style={{ color: KAYAD_COLORS.amber }} />;
      case 'degraded': return <AlertTriangle size={16} style={{ color: KAYAD_COLORS.orange }} />;
      case 'critical': return <XCircle size={16} style={{ color: KAYAD_COLORS.red }} />;
      default: return <Clock size={16} style={{ color: KAYAD_COLORS.softBlue }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return KAYAD_COLORS.emerald;
      case 'warning': return KAYAD_COLORS.amber;
      case 'degraded': return KAYAD_COLORS.orange;
      case 'critical': return KAYAD_COLORS.red;
      default: return KAYAD_COLORS.softBlue;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f172a' }}>
      {/* Header */}
      <header className="shadow-lg" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Activity size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Operations Command Center</h1>
                <p className="text-sm opacity-80">KAYAD Ecosystem Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: KAYAD_COLORS.emerald }} />
                <span className="text-sm text-white opacity-80">Live</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-white opacity-60">Last Update</p>
                <p className="text-sm text-white">{lastUpdate.toLocaleTimeString()}</p>
              </div>
              <button 
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                onClick={() => setLastUpdate(new Date())}
              >
                <RefreshCw size={20} color={KAYAD_COLORS.white} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id ? 'text-white' : 'text-gray-400'
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: KAYAD_COLORS.red, color: KAYAD_COLORS.white }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Platform Health Banner */}
            <div 
              className="rounded-xl p-6 flex justify-between items-center"
              style={{ backgroundColor: PLATFORM_HEALTH.status === 'healthy' ? `${KAYAD_COLORS.emerald}15` : `${KAYAD_COLORS.amber}15` }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: getStatusColor(PLATFORM_HEALTH.status) }}
                >
                  <CheckCircle size={32} color={KAYAD_COLORS.white} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: getStatusColor(PLATFORM_HEALTH.status) }}>
                    Platform {PLATFORM_HEALTH.status.charAt(0).toUpperCase() + PLATFORM_HEALTH.status.slice(1)}
                  </h2>
                  <p className="text-gray-400">
                    {PLATFORM_HEALTH.servicesOnline}/{PLATFORM_HEALTH.totalServices} services operational • Health Score: {PLATFORM_HEALTH.score}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold" style={{ color: getStatusColor(PLATFORM_HEALTH.status) }}>
                  {PLATFORM_HEALTH.score}%
                </p>
                <p className="text-sm text-gray-400">Health Score</p>
              </div>
            </div>

            {/* Live Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: 'Users Online', value: LIVE_COUNTERS.usersOnline.toLocaleString(), icon: <Users size={20} />, color: KAYAD_COLORS.emerald },
                { label: 'Vehicles Listed', value: LIVE_COUNTERS.vehiclesListedToday, icon: <Car size={20} />, color: KAYAD_COLORS.softBlue },
                { label: 'Dealer Activity', value: LIVE_COUNTERS.dealerActivity, icon: <Activity size={20} />, color: KAYAD_COLORS.softBlue },
                { label: 'Active Auctions', value: LIVE_COUNTERS.activeAuctions, icon: <Gavel size={20} />, color: KAYAD_COLORS.amber },
                { label: 'Vehicles Sold', value: LIVE_COUNTERS.vehiclesSold, icon: <CheckCircle size={20} />, color: KAYAD_COLORS.emerald },
                { label: 'API Requests', value: `${(LIVE_COUNTERS.apiRequests / 1000).toFixed(1)}K`, icon: <Zap size={20} />, color: KAYAD_COLORS.softBlue },
              ].map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: '#1e293b' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div style={{ color: metric.color }}>{metric.icon}</div>
                    <span className="text-xs text-gray-400">{metric.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{metric.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Service Health */}
              <div className="lg:col-span-2 rounded-xl p-6" style={{ backgroundColor: '#1e293b' }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-white">Service Health</h3>
                  <button className="text-sm text-gray-400 hover:text-white">View All</button>
                </div>
                <div className="space-y-3">
                  {SERVICES.slice(0, 8).map((service) => (
                    <div key={service.code} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#0f172a' }}>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(service.status)}
                        <span className="text-white">{service.name}</span>
                      </div>
                      <span className="text-sm" style={{ color: getStatusColor(service.status) }}>
                        {service.latency}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incidents & Alerts */}
              <div className="space-y-6">
                {/* Active Incidents */}
                <div className="rounded-xl p-6" style={{ backgroundColor: '#1e293b' }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <AlertTriangle size={18} style={{ color: ACTIVE_INCIDENTS.length > 0 ? KAYAD_COLORS.red : KAYAD_COLORS.emerald }} />
                      Active Incidents
                    </h3>
                    <span className="text-sm text-gray-400">{ACTIVE_INCIDENTS.length}</span>
                  </div>
                  <div className="space-y-3">
                    {ACTIVE_INCIDENTS.length === 0 ? (
                      <p className="text-center text-gray-400 py-4">No active incidents</p>
                    ) : (
                      ACTIVE_INCIDENTS.map((incident) => (
                        <div key={incident.id} className="p-3 rounded-lg" style={{ backgroundColor: '#0f172a' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span 
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: incident.severity === 'critical' ? `${KAYAD_COLORS.red}30` : `${KAYAD_COLORS.amber}30`,
                                color: incident.severity === 'critical' ? KAYAD_COLORS.red : KAYAD_COLORS.amber
                              }}
                            >
                              {incident.severity}
                            </span>
                            <span className="text-xs text-gray-500">{incident.code}</span>
                          </div>
                          <p className="text-sm text-white">{incident.title}</p>
                          <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>{incident.status}</span>
                            <span>{incident.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Active Alerts */}
                <div className="rounded-xl p-6" style={{ backgroundColor: '#1e293b' }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Bell size={18} style={{ color: KAYAD_COLORS.amber }} />
                      Active Alerts
                    </h3>
                    <span className="text-sm text-gray-400">{ACTIVE_ALERTS.length}</span>
                  </div>
                  <div className="space-y-3">
                    {ACTIVE_ALERTS.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#0f172a' }}>
                        <div 
                          className="w-2 h-2 rounded-full mt-1.5"
                          style={{ backgroundColor: alert.severity === 'high' ? KAYAD_COLORS.red : alert.severity === 'warning' ? KAYAD_COLORS.amber : KAYAD_COLORS.softBlue }}
                        />
                        <div>
                          <p className="text-sm text-white">{alert.title}</p>
                          <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>{alert.source}</span>
                            <span>{alert.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {KPI_METRICS.map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: '#1e293b' }}
                >
                  <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
                  <p className="text-xl font-bold text-white">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.positive ? (
                      <TrendingUp size={14} style={{ color: KAYAD_COLORS.emerald }} />
                    ) : (
                      <TrendingDown size={14} style={{ color: KAYAD_COLORS.red }} />
                    )}
                    <span className="text-xs" style={{ color: kpi.positive ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                      {kpi.change}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Incident Management</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: '#1e293b', color: 'white' }}>
                  <Filter size={18} />
                  Filter
                </button>
                <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.red, color: 'white' }}>
                  Create Incident
                </button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
              <table className="w-full">
                <thead style={{ backgroundColor: '#0f172a' }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Incident</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Affected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#334155' }}>
                  {ACTIVE_INCIDENTS.map((incident) => (
                    <tr key={incident.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{incident.title}</p>
                        <p className="text-sm text-gray-500">{incident.code}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                          style={{ 
                            backgroundColor: incident.severity === 'high' ? `${KAYAD_COLORS.red}30` : `${KAYAD_COLORS.amber}30`,
                            color: incident.severity === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.amber
                          }}
                        >
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: '#0f172a', color: 'white' }}>
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white">{incident.affected} users</td>
                      <td className="px-6 py-4 text-gray-400">{incident.time}</td>
                      <td className="px-6 py-4">
                        <button className="text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Service Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SERVICES.map((service) => (
                <motion.div
                  key={service.code}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-6"
                  style={{ backgroundColor: '#1e293b' }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <h3 className="font-semibold text-white">{service.name}</h3>
                    </div>
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                      style={{ 
                        backgroundColor: `${getStatusColor(service.status)}20`,
                        color: getStatusColor(service.status)
                      }}
                    >
                      {service.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Latency</p>
                      <p className="text-lg font-bold" style={{ color: service.latency < 100 ? KAYAD_COLORS.emerald : service.latency < 200 ? KAYAD_COLORS.amber : KAYAD_COLORS.red }}>
                        {service.latency}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Requests/min</p>
                      <p className="text-lg font-bold text-white">{(Math.random() * 1000).toFixed(0)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Operations Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {['Performance', 'Usage', 'Incidents', 'Reliability'].map((section) => (
                <div key={section} className="rounded-xl p-6" style={{ backgroundColor: '#1e293b' }}>
                  <h3 className="font-semibold text-white mb-4">{section}</h3>
                  <div className="h-48 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
                    <p className="text-gray-500">Charts coming soon</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
