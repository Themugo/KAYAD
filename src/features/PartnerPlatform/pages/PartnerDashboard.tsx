// ============================================================
// KAYAD ENTERPRISE PARTNER PLATFORM
// PARTNER DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Key,
  Webhook,
  BarChart3,
  Shield,
  FileText,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Code,
  Book,
  Ticket,
  Activity,
  TrendingUp,
  Zap,
  Lock,
  Globe,
  ChevronRight,
  ChevronDown,
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
};

// Sample partner data
const SAMPLE_PARTNER = {
  organizationCode: 'KAYAD-PART-A1B2C3',
  organizationName: 'Kenya Commercial Bank',
  partnerType: 'bank',
  status: 'approved',
  country: 'Kenya',
  applications: 2,
};

const SAMPLE_APPLICATION = {
  id: 'app1',
  name: 'KCB Vehicle Finance API',
  status: 'approved',
  environment: 'production',
  credentials: [
    { type: 'api_key', key: 'kayad_production_a1b2c3d4e5f6...', environment: 'production', status: 'active' },
    { type: 'api_key', key: 'kayad_sandbox_g7h8i9j0k1l2...', environment: 'sandbox', status: 'active' },
  ],
  webhooks: [
    { id: 'wh1', name: 'Finance Events', events: ['finance_approved', 'ownership_changed'], status: 'active' },
  ],
};

const SAMPLE_ANALYTICS = {
  totalRequests: 45678,
  requestsToday: 1234,
  successRate: 99.2,
  avgResponseTime: 145,
  failedRequests: 23,
};

const API_ENDPOINTS = [
  { code: 'listings', name: 'Vehicle Listings', path: '/api/v1/listings', methods: ['GET'] },
  { code: 'passport', name: 'Vehicle Passport', path: '/api/v1/passport', methods: ['GET'] },
  { code: 'inspection', name: 'Inspection Reports', path: '/api/v1/inspection', methods: ['GET', 'POST'] },
  { code: 'auction', name: 'Auction Events', path: '/api/v1/auction', methods: ['GET'] },
  { code: 'valuation', name: 'Vehicle Valuation', path: '/api/v1/valuation', methods: ['GET'] },
  { code: 'trust', name: 'Trust Verification', path: '/api/v1/trust', methods: ['GET'] },
];

const WEBHOOK_EVENTS = [
  { code: 'vehicle_listed', name: 'Vehicle Listed', description: 'A new vehicle is listed' },
  { code: 'vehicle_sold', name: 'Vehicle Sold', description: 'A vehicle sale is completed' },
  { code: 'auction_started', name: 'Auction Started', description: 'An auction begins' },
  { code: 'auction_closed', name: 'Auction Closed', description: 'An auction ends' },
  { code: 'inspection_complete', name: 'Inspection Complete', description: 'Inspection report is ready' },
  { code: 'passport_updated', name: 'Passport Updated', description: 'Vehicle passport is updated' },
  { code: 'ownership_changed', name: 'Ownership Changed', description: 'Vehicle ownership transfers' },
  { code: 'finance_approved', name: 'Finance Approved', description: 'Finance application approved' },
];

const RECENT_REQUESTS = [
  { method: 'GET', endpoint: '/api/v1/passport/JTMCVREV0LD123456', status: 200, time: '45ms', timestamp: '2 min ago' },
  { method: 'GET', endpoint: '/api/v1/listings?make=Toyota', status: 200, time: '89ms', timestamp: '5 min ago' },
  { method: 'POST', endpoint: '/api/v1/inspection', status: 201, time: '123ms', timestamp: '12 min ago' },
  { method: 'GET', endpoint: '/api/v1/valuation/JTMCVREV0LD123456', status: 200, time: '67ms', timestamp: '18 min ago' },
  { method: 'GET', endpoint: '/api/v1/trust/dealer/premium-motors', status: 404, time: '23ms', timestamp: '25 min ago' },
];

export default function PartnerDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'webhooks' | 'analytics' | 'docs' | 'support'>('overview');
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={18} /> },
    { id: 'credentials', label: 'API Keys', icon: <Key size={18} /> },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'docs', label: 'Documentation', icon: <Book size={18} /> },
    { id: 'support', label: 'Support', icon: <Ticket size={18} /> },
  ];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Building2 size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Partner Dashboard</h1>
                <p className="text-sm opacity-80">{SAMPLE_PARTNER.organizationName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <CheckCircle size={16} />
                Production Active
              </span>
              <button className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Settings size={20} color={KAYAD_COLORS.white} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                color: activeTab === tab.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickStatCard icon={<Activity size={24} />} label="API Requests" value={SAMPLE_ANALYTICS.totalRequests.toLocaleString()} subValue={`${SAMPLE_ANALYTICS.requestsToday} today`} />
              <QuickStatCard icon={<CheckCircle size={24} />} label="Success Rate" value={`${SAMPLE_ANALYTICS.successRate}%`} subValue="Last 24h" />
              <QuickStatCard icon={<Zap size={24} />} label="Avg Response" value={`${SAMPLE_ANALYTICS.avgResponseTime}ms`} subValue="Latency" />
              <QuickStatCard icon={<AlertCircle size={24} />} label="Failed Requests" value={SAMPLE_ANALYTICS.failedRequests.toString()} subValue="Last 24h" alert />
            </div>

            {/* Application Status */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Active Application</h3>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{SAMPLE_APPLICATION.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                      <CheckCircle size={12} />
                      Approved
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                      {SAMPLE_APPLICATION.environment}
                    </span>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                  View Details
                </button>
              </div>
            </div>

            {/* Platform Status */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Platform Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'API Gateway', status: 'operational' },
                  { name: 'Webhooks', status: 'operational' },
                  { name: 'Authentication', status: 'operational' },
                  { name: 'Rate Limiting', status: 'operational' },
                ].map((service) => (
                  <div key={service.name} className="p-3 rounded-lg text-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: KAYAD_COLORS.emerald }} />
                    <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{service.name}</p>
                    <p className="text-xs" style={{ color: KAYAD_COLORS.emerald }}>{service.status}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Requests */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Requests</h3>
              <div className="space-y-2">
                {RECENT_REQUESTS.map((request, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-medium" style={{ backgroundColor: request.method === 'GET' ? `${KAYAD_COLORS.emerald}30` : `${KAYAD_COLORS.amber}30`, color: request.method === 'GET' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber }}>
                        {request.method}
                      </span>
                      <span className="text-sm font-mono" style={{ color: KAYAD_COLORS.lightNavy }}>{request.endpoint}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm" style={{ color: request.status >= 200 && request.status < 300 ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                        {request.status}
                      </span>
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{request.time}</span>
                      <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{request.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Credentials Tab */}
        {activeTab === 'credentials' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>API Credentials</h2>
              <button className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                <Plus size={18} />
                Generate New Key
              </button>
            </div>

            <div className="space-y-4">
              {SAMPLE_APPLICATION.credentials.map((cred, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl p-6 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Key size={20} style={{ color: KAYAD_COLORS.lightNavy }} />
                        <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                          {cred.environment.charAt(0).toUpperCase() + cred.environment.slice(1)} Environment
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          cred.status === 'active' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                        }`}>
                          {cred.status}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        Use this key to authenticate API requests
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <RefreshCw size={18} style={{ color: KAYAD_COLORS.lightNavy }} />
                      </button>
                      <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <Settings size={18} style={{ color: KAYAD_COLORS.lightNavy }} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono" style={{ color: KAYAD_COLORS.lightNavy }}>
                          {showSecret[`${cred.environment}-key`] ? cred.key : cred.key}
                        </code>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(cred.key, `${cred.environment}-key`)}
                          className="px-3 py-1 rounded text-sm font-medium flex items-center gap-1"
                          style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}
                        >
                          {copiedKey === `${cred.environment}-key` ? <CheckCircle size={14} /> : <Copy size={14} />}
                          {copiedKey === `${cred.environment}-key` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* API Secret Warning */}
            <div className="rounded-xl p-4 border-2 flex items-start gap-3" style={{ borderColor: KAYAD_COLORS.amber, backgroundColor: `${KAYAD_COLORS.amber}08` }}>
              <AlertCircle size={20} style={{ color: KAYAD_COLORS.amber, marginTop: 2 }} />
              <div>
                <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>Keep your API keys secure</p>
                <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                  Never share your API keys in public repositories or client-side code. Use environment variables.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Webhook Configurations</h2>
              <button className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                <Plus size={18} />
                Add Webhook
              </button>
            </div>

            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{SAMPLE_APPLICATION.webhooks[0].name}</h3>
                  <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                    URL: https://api.kcb.co.ke/webhooks/kayad
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                  <CheckCircle size={12} />
                  Active
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_APPLICATION.webhooks[0].events.map(event => (
                  <span key={event} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}15`, color: KAYAD_COLORS.softBlue }}>
                    {event}
                  </span>
                ))}
              </div>
            </div>

            {/* Available Events */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Available Webhook Events</h3>
              <div className="space-y-3">
                {WEBHOOK_EVENTS.map(event => (
                  <div key={event.code} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div>
                      <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{event.name}</p>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{event.description}</p>
                    </div>
                    <button className="px-3 py-1 rounded text-sm" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                      Subscribe
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>API Analytics</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-4 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Total Requests</p>
                <p className="text-3xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{SAMPLE_ANALYTICS.totalRequests.toLocaleString()}</p>
                <p className="text-xs flex items-center gap-1" style={{ color: KAYAD_COLORS.emerald }}>
                  <TrendingUp size={12} /> +12% this month
                </p>
              </div>
              <div className="rounded-xl p-4 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Success Rate</p>
                <p className="text-3xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>{SAMPLE_ANALYTICS.successRate}%</p>
              </div>
              <div className="rounded-xl p-4 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Avg Response Time</p>
                <p className="text-3xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{SAMPLE_ANALYTICS.avgResponseTime}ms</p>
              </div>
              <div className="rounded-xl p-4 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Rate Limit</p>
                <p className="text-3xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>60/min</p>
              </div>
            </div>
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>API Documentation</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[
                { icon: <Lock size={24} />, title: 'Authentication', desc: 'Learn how to authenticate API requests' },
                { icon: <Code size={24} />, title: 'Endpoints', desc: 'Explore available API endpoints' },
                { icon: <Webhook size={24} />, title: 'Webhooks', desc: 'Configure webhook integrations' },
                { icon: <Book size={24} />, title: 'SDKs', desc: 'Download official SDKs' },
                { icon: <FileText size={24} />, title: 'Code Samples', desc: 'View integration examples' },
                { icon: <AlertCircle size={24} />, title: 'Error Codes', desc: 'Understand error responses' },
              ].map((doc, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-6 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="p-3 rounded-lg w-fit mb-4" style={{ backgroundColor: `${KAYAD_COLORS.lightNavy}15` }}>
                    {doc.icon}
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>{doc.title}</h3>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{doc.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Support Center</h2>
              <button className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                <Plus size={18} />
                New Ticket
              </button>
            </div>

            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Quick Support</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Technical Issue', icon: <Code size={20} /> },
                  { label: 'Permission Request', icon: <Shield size={20} /> },
                  { label: 'Bug Report', icon: <AlertCircle size={20} /> },
                  { label: 'Feature Request', icon: <Plus size={20} /> },
                ].map((item, i) => (
                  <button
                    key={i}
                    className="p-4 rounded-lg text-center hover:shadow-md transition-shadow"
                    style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
                  >
                    <div className="mx-auto mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>{item.icon}</div>
                    <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{item.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Page */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>System Status</h3>
              <div className="space-y-3">
                {[
                  { name: 'API Services', status: 'operational' },
                  { name: 'Authentication Service', status: 'operational' },
                  { name: 'Webhook Delivery', status: 'operational' },
                  { name: 'Documentation', status: 'operational' },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <span style={{ color: KAYAD_COLORS.lightNavy }}>{service.name}</span>
                    <span className="flex items-center gap-1 text-sm" style={{ color: KAYAD_COLORS.emerald }}>
                      <CheckCircle size={14} /> {service.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-components
function QuickStatCard({ icon, label, value, subValue, alert }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  alert?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: alert ? `${KAYAD_COLORS.amber}20` : `${KAYAD_COLORS.softBlue}15` }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
        {subValue && (
          <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{subValue}</span>
        )}
      </div>
    </motion.div>
  );
}
