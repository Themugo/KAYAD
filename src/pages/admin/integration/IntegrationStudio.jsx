import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Globe, Users, Key, Webhook, Puzzle, Code, Book,
  Server, Shield, Activity, FileCode, CheckCircle, X, Plus, Search,
  RefreshCw, ChevronRight, ExternalLink, Download, Copy, Eye, EyeOff,
  Zap, Package, BarChart3, Lock, Unlock, AlertTriangle, Check, Clock,
  Send, Lightbulb, BookOpen, Boxes, Layers
} from 'lucide-react';
import * as eipApi from '../../../services/eipApi';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
  mutedOrange: '#FB923C',
  mutedCrimson: '#EF4444',
  purple: '#8B5CF6',
};

const modules = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: colors.navy },
  { id: 'apis', label: 'API Marketplace', icon: Globe, color: colors.emerald },
  { id: 'partners', label: 'Partner Portal', icon: Users, color: colors.terracotta },
  { id: 'webhooks', label: 'Webhook Manager', icon: Webhook, color: colors.purple },
  { id: 'plugins', label: 'Plugin Marketplace', icon: Puzzle, color: colors.mutedOrange },
  { id: 'sdks', label: 'SDK Center', icon: Code, color: colors.softBlue },
  { id: 'analytics', label: 'API Analytics', icon: BarChart3, color: colors.navy },
  { id: 'oauth', label: 'OAuth Manager', icon: Lock, color: colors.purple },
  { id: 'gateway', label: 'API Gateway', icon: Server, color: colors.emerald },
  { id: 'sandbox', label: 'Sandbox', icon: Boxes, color: colors.mutedOrange },
  { id: 'events', label: 'Event Bus', icon: Zap, color: colors.terracotta },
  { id: 'help', label: 'AI Assistant', icon: Lightbulb, color: '#FBBF24' },
];

const apiCategories = [
  { id: 'vehicles', name: 'Vehicles', icon: Car },
  { id: 'dealers', name: 'Dealers', icon: Building },
  { id: 'auctions', name: 'Auctions', icon: Gavel },
  { id: 'finance', name: 'Finance', icon: DollarSign },
  { id: 'payments', name: 'Payments', icon: CreditCard },
  { id: 'inspections', name: 'Inspections', icon: ClipboardCheck },
  { id: 'analytics', name: 'Analytics', icon: BarChart3 },
  { id: 'search', name: 'Search', icon: Search },
];

// Helper icons
function Car(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
    </svg>
  );
}

function Building(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  );
}

function Gavel(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>
    </svg>
  );
}

function DollarSign(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}

function CreditCard(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
    </svg>
  );
}

function ClipboardCheck(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>
    </svg>
  );
}

export default function IntegrationStudio() {
  const [activeModule, setActiveModule] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [apis, setAPIs] = useState([]);
  const [partners, setPartners] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [sdks, setSDKs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAPI, setSelectedAPI] = useState(null);
  const [helpQuestion, setHelpQuestion] = useState('');
  const [helpResponse, setHelpResponse] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: dashData } = await eipApi.getIntegrationDashboard();
      setDashboard(dashData.data);
      
      const { data: apiData } = await eipApi.getAPIs();
      setAPIs(apiData.data);
      
      const { data: partnerData } = await eipApi.getPartners();
      setPartners(partnerData.data);
      
      const { data: webhookData } = await eipApi.getWebhooks();
      setWebhooks(webhookData.data);
      
      const { data: pluginData } = await eipApi.getPlugins();
      setPlugins(pluginData.data);
      
      const { data: sdkData } = await eipApi.getSDKs();
      setSDKs(sdkData.data);
      
      const { data: eventData } = await eipApi.getEvents();
      setEvents(eventData.data);
    } catch (error) {
      console.error('Failed to load EIP data:', error);
      // No synthetic production fallback: the UI remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  const handleHelpQuestion = async () => {
    if (!helpQuestion.trim()) return;
    try {
      const { data } = await eipApi.getIntegrationHelp({ question: helpQuestion });
      setHelpResponse(data.data);
    } catch (error) {
      console.error('Help query failed:', error);
    }
  };

  // ============================================
  // OVERVIEW
  // ============================================

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Integration Overview</h2>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Partners', value: dashboard?.summary?.totalPartners || 0, icon: Users, color: colors.navy },
          { label: 'Integrations', value: dashboard?.summary?.activeIntegrations || 0, icon: Zap, color: colors.emerald },
          { label: 'API Requests', value: (dashboard?.summary?.totalAPIRequests || 0).toLocaleString(), icon: Globe, color: colors.terracotta },
          { label: 'Webhooks', value: dashboard?.summary?.webhookDeliveries || 0, icon: Webhook, color: colors.purple },
          { label: 'Plugins', value: dashboard?.summary?.pluginsInstalled || 0, icon: Puzzle, color: colors.mutedOrange },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon size={18} style={{ color: stat.color }} />
              <span className="text-sm text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">System Status</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(dashboard?.systemStatus || {}).map(([key, status]) => (
            <div key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className={`w-3 h-3 rounded-full ${status === 'operational' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm font-medium text-slate-800 capitalize">{key}</p>
                <p className="text-xs text-slate-500">{status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Popular APIs</h3>
          <div className="space-y-2">
            {apis.slice(0, 5).map((api) => (
              <div key={api.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-800">{api.name}</span>
                <span className="text-xs text-slate-500">v{api.version}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Available SDKs</h3>
          <div className="space-y-2">
            {sdks.slice(0, 4).map((sdk) => (
              <div key={sdk.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-800">{sdk.name}</span>
                <span className="text-xs text-slate-500">v{sdk.version}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // API MARKETPLACE
  // ============================================

  const renderAPIs = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">API Marketplace</h2>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {apiCategories.map((cat) => (
          <button
            key={cat.id}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm whitespace-nowrap hover:bg-slate-50"
          >
            <cat.icon size={16} className="inline mr-2" />
            {cat.name}
          </button>
        ))}
      </div>

      {/* API Cards */}
      <div className="grid grid-cols-3 gap-4">
        {apis.map((api) => (
          <div key={api.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-[#17244B] cursor-pointer transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">{api.name}</h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                v{api.version}
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-4">{api.description || `${api.endpoints} endpoints available`}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{api.endpoints} endpoints</span>
              <button className="text-sm text-[#17244B] font-medium hover:underline">
                View Docs <ChevronRight size={14} className="inline" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // PARTNERS
  // ============================================

  const renderPartners = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Partner Portal</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Add Partner
        </button>
      </div>

      {/* Partner List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Partner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {partners.map((partner) => (
              <tr key={partner.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{partner.name}</td>
                <td className="px-6 py-4 capitalize text-sm text-slate-600">{partner.category}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    partner.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                    partner.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {partner.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-[#17244B] font-medium hover:underline">Manage</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // WEBHOOKS
  // ============================================

  const renderWebhooks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Webhook Manager</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Create Webhook
        </button>
      </div>

      {/* Events Available */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Available Events</h3>
        <div className="grid grid-cols-3 gap-3">
          {events.map((event) => (
            <div key={event.id} className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-800 text-sm">{event.name}</p>
              <p className="text-xs text-slate-500">{event.id}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">URL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Events</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-6 py-4 text-sm text-slate-600">No webhooks configured</td>
              <td className="px-6 py-4" colSpan="3">Create your first webhook to receive real-time notifications</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // SDK CENTER
  // ============================================

  const renderSDKs = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">SDK Center</h2>

      <div className="grid grid-cols-2 gap-4">
        {sdks.map((sdk) => (
          <div key={sdk.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">{sdk.name}</h3>
              <span className="text-xs text-slate-500">v{sdk.version}</span>
            </div>
            <p className="text-sm text-slate-600 mb-4">{sdk.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{sdk.downloads?.toLocaleString()} downloads</span>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                  <Book size={14} className="inline mr-1" /> Docs
                </button>
                <button className="px-3 py-1.5 text-sm bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
                  <Download size={14} className="inline mr-1" /> Install
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // OAUTH
  // ============================================

  const renderOAuth = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">OAuth Manager</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Available Scopes */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Available Scopes</h3>
          <div className="space-y-2">
            {[
              { name: 'read:vehicles', description: 'Read vehicle listings' },
              { name: 'write:vehicles', description: 'Create and update vehicles' },
              { name: 'read:auctions', description: 'Read auction data' },
              { name: 'write:auctions', description: 'Participate in auctions' },
              { name: 'read:dealers', description: 'Read dealer information' },
              { name: 'read:finance', description: 'Access finance data' },
            ].map((scope, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-800 text-sm">{scope.name}</p>
                <p className="text-xs text-slate-500">{scope.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Create Client */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Create OAuth Client</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg" placeholder="My App" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Redirect URIs</label>
              <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={3} placeholder="https://myapp.com/callback" />
            </div>
            <button className="w-full px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
              Create Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // SANDBOX
  // ============================================

  const renderSandbox = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Sandbox Environment</h2>

      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Boxes size={24} />
          <h3 className="text-lg font-semibold">Sandbox Available</h3>
        </div>
        <p className="opacity-90 mb-4">Test integrations against configured backend services. No synthetic production data is generated.</p>
        <button className="px-4 py-2 bg-white text-emerald-600 rounded-lg font-medium hover:bg-emerald-50">
          Open Sandbox
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Features</h3>
          <ul className="space-y-2">
            {[
              'Sample data (vehicles, dealers, users)',
              'Mock payment processing',
              'Test auction environments',
              'Simulated user behaviors',
              'No rate limits (10% of production)',
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle size={16} className="text-emerald-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Limits</h3>
          <ul className="space-y-2">
            {[
              '1,000 requests/day',
              '100MB storage',
              '30 day duration',
              'No production data access',
            ].map((limit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <Clock size={16} className="text-slate-400" />
                {limit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  // ============================================
  // EVENTS
  // ============================================

  const renderEvents = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Event Bus</h2>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Available Events</h3>
        <div className="grid grid-cols-3 gap-3">
          {events.map((event) => (
            <div key={event.id} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-[#17244B]" />
                <span className="font-medium text-slate-800 text-sm">{event.name}</span>
              </div>
              <p className="text-xs text-slate-500">{event.id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // AI ASSISTANT
  // ============================================

  const renderHelp = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">AI Integration Assistant</h2>

      {/* Question Input */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Ask a Question</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={helpQuestion}
            onChange={(e) => setHelpQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleHelpQuestion()}
            placeholder="e.g., How do I authenticate with the API?"
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
          />
          <button
            onClick={handleHelpQuestion}
            className="px-6 py-3 bg-[#17244B] text-white rounded-xl hover:bg-[#1e3054]"
          >
            <Send size={20} />
          </button>
        </div>

        {/* Example Questions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            'How do I authenticate with the API?',
            'How do I set up webhooks?',
            'Show me an SDK example',
            'What are the rate limits?',
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => setHelpQuestion(q)}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm hover:bg-slate-200"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Response */}
      {helpResponse && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <p className="text-slate-700 mb-4">{helpResponse.answer}</p>
          
          {helpResponse.examples && (
            <div className="space-y-3">
              {helpResponse.examples.map((example, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-800 mb-2">{example.type}</p>
                  <pre className="text-xs text-slate-600 overflow-x-auto">
                    <code>{example.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}

          {helpResponse.tips && (
            <div className="mt-4">
              <h4 className="font-medium text-slate-800 mb-2">Tips:</h4>
              <ul className="space-y-1">
                {helpResponse.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'overview': return renderOverview();
      case 'apis': return renderAPIs();
      case 'partners': return renderPartners();
      case 'webhooks': return renderWebhooks();
      case 'sdks': return renderSDKs();
      case 'oauth': return renderOAuth();
      case 'sandbox': return renderSandbox();
      case 'events': return renderEvents();
      case 'help': return renderHelp();
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17244B] to-[#2a3a6e] flex items-center justify-center">
                  <Globe size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Integration Studio</h1>
                  <p className="text-xs text-slate-500">Ecosystem Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                APIs Operational
              </div>
              <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg">
                <RefreshCw size={20} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#17244B] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{mod.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
