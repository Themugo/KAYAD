// ============================================================
// KAYAD PLATFORM ECOSYSTEM
// DEVELOPER PORTAL DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Code,
  Key,
  Webhook,
  Box,
  Users,
  FileText,
  Download,
  ExternalLink,
  Plus,
  Settings,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  Zap,
  Database,
  Globe,
  Server,
  Layers,
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
  purple: '#8b5cf6',
};

// Sample data
const MY_APPS = [
  { name: 'Dealer CRM Pro', status: 'approved', apiCalls: 45678, webhooks: 5 },
  { name: 'Fleet Manager', status: 'pending', apiCalls: 0, webhooks: 0 },
];

const PLATFORM_EVENTS = [
  { name: 'vehicle.listed', description: 'When a vehicle is listed', subscribers: 45 },
  { name: 'vehicle.sold', description: 'When a vehicle sale completes', subscribers: 38 },
  { name: 'auction.started', description: 'When an auction begins', subscribers: 28 },
  { name: 'auction.ended', description: 'When an auction ends', subscribers: 25 },
  { name: 'inspection.completed', description: 'When inspection is done', subscribers: 32 },
  { name: 'ownership.transferred', description: 'When ownership changes', subscribers: 41 },
];

const API_SCOPES = [
  { code: 'listings.read', name: 'Read Listings', category: 'Marketplace', risk: 'low' },
  { code: 'listings.write', name: 'Create Listings', category: 'Marketplace', risk: 'medium' },
  { code: 'auctions.read', name: 'Read Auctions', category: 'Auction', risk: 'low' },
  { code: 'auctions.write', name: 'Manage Auctions', category: 'Auction', risk: 'high' },
  { code: 'dealers.read', name: 'Read Dealers', category: 'Dealers', risk: 'low' },
  { code: 'inspections.read', name: 'Read Inspections', category: 'Inspection', risk: 'low' },
  { code: 'analytics.read', name: 'Read Analytics', category: 'Analytics', risk: 'low' },
  { code: 'notifications.send', name: 'Send Notifications', category: 'Notifications', risk: 'high' },
];

const PARTNERS = [
  { name: 'Equity Bank', type: 'bank', status: 'connected' },
  { name: 'Britam Insurance', type: 'insurance', status: 'connected' },
  { name: 'AutoInspect Ltd', type: 'inspection', status: 'connected' },
  { name: 'KAA Auctions', type: 'auction', status: 'connected' },
];

const SDKS = [
  { name: 'JavaScript / TypeScript', version: '2.1.0', downloads: 15432 },
  { name: 'Python', version: '1.8.5', downloads: 8932 },
  { name: 'Java', version: '1.5.2', downloads: 5621 },
  { name: 'PHP', version: '1.3.0', downloads: 3421 },
  { name: 'C# / .NET', version: '1.2.1', downloads: 2890 },
];

const EXTENSIONS = [
  { name: 'Salesforce Connector', developer: 'TechPartner Ltd', installs: 156, rating: 4.8 },
  { name: 'QuickBooks Integration', developer: 'FinanceApps', installs: 234, rating: 4.6 },
  { name: 'Fleet Tracker Pro', developer: 'AutoTech', installs: 89, rating: 4.9 },
];

export default function DeveloperPortalDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'apps' | 'apis' | 'webhooks' | 'sdk' | 'extensions'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
    { id: 'apps', label: 'My Apps', icon: <Box size={18} /> },
    { id: 'apis', label: 'API Keys', icon: <Key size={18} /> },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={18} /> },
    { id: 'sdk', label: 'SDKs', icon: <Download size={18} /> },
    { id: 'extensions', label: 'Extensions', icon: <Layers size={18} /> },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'connected':
      case 'published':
        return KAYAD_COLORS.emerald;
      case 'pending':
        return KAYAD_COLORS.amber;
      case 'rejected':
      case 'suspended':
        return KAYAD_COLORS.red;
      default:
        return KAYAD_COLORS.softBlue;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Code size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">KAYAD Platform</h1>
                <p className="text-sm opacity-80">Developer Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                <Plus size={16} />
                Create App
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
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
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'My Apps', value: 2, icon: <Box size={20} /> },
                { label: 'API Calls', value: '45.7K', icon: <Zap size={20} /> },
                { label: 'Active Webhooks', value: 5, icon: <Webhook size={20} /> },
                { label: 'Partners', value: 12, icon: <Users size={20} /> },
              ].map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex items-center gap-2 mb-2" style={{ color: KAYAD_COLORS.softBlue }}>
                    {metric.icon}
                    <span className="text-sm">{metric.label}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{metric.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Platform Events & Partners */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                  <Zap size={20} />
                  Platform Events
                </h3>
                <div className="space-y-3">
                  {PLATFORM_EVENTS.map((event, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div>
                        <p className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{event.name}</p>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{event.description}</p>
                      </div>
                      <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{event.subscribers} subscribers</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                  <Users size={20} />
                  Connected Partners
                </h3>
                <div className="space-y-3">
                  {PARTNERS.map((partner, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                          {partner.type === 'bank' ? <Database size={20} style={{ color: KAYAD_COLORS.purple }} /> :
                           partner.type === 'insurance' ? <Shield size={20} style={{ color: KAYAD_COLORS.purple }} /> :
                           <Globe size={20} style={{ color: KAYAD_COLORS.purple }} />}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{partner.name}</p>
                          <p className="text-xs capitalize" style={{ color: KAYAD_COLORS.softBlue }}>{partner.type}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium capitalize flex items-center gap-1" style={{ backgroundColor: `${getStatusColor(partner.status)}20`, color: getStatusColor(partner.status) }}>
                        <CheckCircle size={12} />
                        {partner.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Apps Tab */}
        {activeTab === 'apps' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>My Applications</h3>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <Plus size={16} />
                  New Application
                </button>
              </div>

              <div className="space-y-4">
                {MY_APPS.map((app, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border-2" style={{ 
                    borderColor: app.status === 'approved' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber,
                    backgroundColor: KAYAD_COLORS.white
                  }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                        <Box size={24} style={{ color: KAYAD_COLORS.purple }} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{app.name}</p>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{app.apiCalls.toLocaleString()} API calls</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 rounded-full text-sm font-medium capitalize" style={{ 
                        backgroundColor: `${getStatusColor(app.status)}20`,
                        color: getStatusColor(app.status)
                      }}>
                        {app.status}
                      </span>
                      <button className="px-3 py-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                        <Settings size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'apis' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Available Scopes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {API_SCOPES.map((scope, i) => (
                  <div key={i} className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{scope.code}</code>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        scope.risk === 'low' ? 'text-green-600' : scope.risk === 'medium' ? 'text-amber-600' : 'text-red-600'
                      }`} style={{
                        backgroundColor: scope.risk === 'low' ? '#dcfce7' : scope.risk === 'medium' ? '#fef3c7' : '#fee2e2',
                      }}>
                        {scope.risk} risk
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{scope.name}</p>
                    <p className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>Category: {scope.category}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Webhook Subscriptions</h3>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <Plus size={16} />
                  Add Webhook
                </button>
              </div>

              <div className="space-y-4">
                {PLATFORM_EVENTS.slice(0, 3).map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div>
                      <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{event.name}</p>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{event.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{event.subscribers} deliveries</span>
                      <button className="px-3 py-1 rounded text-sm" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                        Configure
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SDKs Tab */}
        {activeTab === 'sdk' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Official SDKs</h3>
              <div className="space-y-4">
                {SDKS.map((sdk, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20` }}>
                        <Download size={24} style={{ color: KAYAD_COLORS.emerald }} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{sdk.name}</p>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>v{sdk.version} • {sdk.downloads.toLocaleString()} downloads</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.lightNavy, color: KAYAD_COLORS.white }}>
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Extensions Tab */}
        {activeTab === 'extensions' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Extension Marketplace</h3>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <Plus size={16} />
                  Publish Extension
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {EXTENSIONS.map((ext, i) => (
                  <div key={i} className="p-4 rounded-lg border-2" style={{ borderColor: KAYAD_COLORS.warmBeige, backgroundColor: KAYAD_COLORS.white }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                        <Layers size={20} style={{ color: KAYAD_COLORS.purple }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{ext.name}</p>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{ext.developer}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{ext.installs} installs</span>
                      <span className="text-sm font-medium" style={{ color: KAYAD_COLORS.amber }}>★ {ext.rating}</span>
                    </div>
                    <button className="mt-3 w-full py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                      View Details
                    </button>
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
