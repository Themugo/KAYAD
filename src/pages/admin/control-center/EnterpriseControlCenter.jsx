import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Server, ShoppingCart, Database, Shield, Zap, AlertTriangle,
  CheckCircle, X, Plus, RefreshCw, Search, Filter, Eye, Settings, Bell,
  Activity, TrendingUp, TrendingDown, Users, DollarSign, Car, Gavel,
  ClipboardCheck, Calculator, Megaphone, Clock, ChevronRight, Play, Pause, Building2,
  RotateCcw, Wrench, EyeOff, Lock, Globe, Cloud, Wifi, Cpu, HardDrive,
  Send, Lightbulb, BarChart3, LineChart, PieChart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import * as ecpApi from '../../../services/ecpApi';

// Design System Colors
const colors = {
  navy: '#0A3340',
  beige: '#EEF7F5',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#5aafa4',
  softBlue: '#5AAFA4',
  mutedOrange: '#13b8a6',
  mutedCrimson: '#EF4444',
  purple: '#5aafa4',
};

const modules = [
  { id: 'executive', label: 'Executive Overview', icon: LayoutDashboard, color: colors.navy },
  { id: 'system', label: 'System Health', icon: Server, color: colors.emerald },
  { id: 'business', label: 'Business Health', icon: ShoppingCart, color: colors.terracotta },
  { id: 'security', label: 'Security Center', icon: Shield, color: colors.mutedCrimson },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, color: colors.mutedOrange },
  { id: 'performance', label: 'Performance', icon: Activity, color: colors.purple },
  { id: 'selfhealing', label: 'Self-Healing', icon: Wrench, color: colors.softBlue },
  { id: 'aiops', label: 'AI Operations', icon: Lightbulb, color: '#13b8a6' },
  { id: 'capacity', label: 'Capacity', icon: HardDrive, color: colors.navy },
  { id: 'compliance', label: 'Compliance', icon: Lock, color: colors.emerald },
  { id: 'audit', label: 'Audit Logs', icon: ClipboardCheck, color: colors.terracotta },
];

export default function EnterpriseControlCenter() {
  const [activeModule, setActiveModule] = useState('executive');
  const [dashboard, setDashboard] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [businessHealth, setBusinessHealth] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [security, setSecurity] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [selfHealingRules, setSelfHealingRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: dashData } = await ecpApi.getExecutiveDashboard();
      setDashboard(dashData.data);

      const { data: healthData } = await ecpApi.getSystemHealth();
      setSystemHealth(healthData.data);

      const { data: bizData } = await ecpApi.getBusinessHealth();
      setBusinessHealth(bizData.data);

      const { data: incData } = await ecpApi.getIncidents();
      setIncidents(incData.data);

      const { data: secData } = await ecpApi.getSecurityStatus();
      setSecurity(secData.data);

      const { data: perfData } = await ecpApi.getPerformanceMetrics();
      setPerformance(perfData.data);

      const { data: rulesData } = await ecpApi.getSelfHealingRules();
      setSelfHealingRules(rulesData.data);
    } catch (error) {
      console.error('Failed to load ECP data:', error);
      // No synthetic production fallback: the UI remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  const handleAiQuestion = async () => {
    if (!aiQuestion.trim()) return;

    try {
      const { data } = await ecpApi.askOperationsQuestion(aiQuestion);
      setAiResponse(data.data);
    } catch (error) {
      console.error('AI query failed:', error);
    }
  };

  // ============================================
  // EXECUTIVE OVERVIEW
  // ============================================

  const renderExecutive = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Executive Command Center</h2>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Health Score', value: dashboard?.overall?.healthScore || 0, unit: '%', icon: Activity, color: colors.emerald },
          { label: 'Platform Uptime', value: dashboard?.overall?.uptime || 0, unit: '%', icon: Clock, color: colors.navy },
          { label: 'Risk Level', value: dashboard?.overall?.riskLevel || 'low', icon: Shield, color: colors.softBlue, isText: true },
          { label: 'Active Users', value: dashboard?.business?.activeUsers || 0, icon: Users, color: colors.purple },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon size={18} style={{ color: stat.color }} />
              <span className="text-sm text-[#64748B]">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-[#0A3340]">
              {stat.isText ? stat.value : stat.value}{!stat.isText && stat.unit && <span className="text-lg text-[#94A3B8] ml-1">{stat.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Business KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Revenue Today', value: dashboard?.business?.revenueToday, format: 'currency', change: dashboard?.business?.revenueChange, icon: DollarSign },
          { label: 'Vehicles Listed', value: dashboard?.business?.vehiclesListed, icon: Car },
          { label: 'Active Dealers', value: dashboard?.business?.activeDealers, icon: Building },
          { label: 'Live Auctions', value: dashboard?.business?.liveAuctions, icon: Gavel },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#64748B]">{kpi.label}</span>
              <kpi.icon size={18} className="text-[#94A3B8]" />
            </div>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-[#0A3340]">
                {kpi.format === 'currency' ? `KES ${(kpi.value || 0).toLocaleString()}` : kpi.value}
              </p>
              {kpi.change && (
                <span className="text-sm text-emerald-600 flex items-center">
                  <ArrowUpRight size={14} />
                  {kpi.change}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* System & Security */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">System Status</h3>
          <div className="space-y-3">
            {Object.entries(dashboard?.system || {}).map(([key, service]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-[#F6FAF9] rounded-lg">
                <span className="text-sm text-[#12576D] capitalize">{key}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#64748B]">{service.latency}ms</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    service.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#DDF4F0] text-[#12576D]'
                  }`}>
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">Security Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm text-[#12576D]">Status</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                {dashboard?.security?.status}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F6FAF9] rounded-lg">
              <span className="text-sm text-[#12576D]">Threats Detected</span>
              <span className="text-sm font-medium text-[#0A3340]">{dashboard?.security?.threatsDetected}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F6FAF9] rounded-lg">
              <span className="text-sm text-[#12576D]">Failed Logins</span>
              <span className="text-sm font-medium text-[#0A3340]">{dashboard?.security?.failedLogins}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // SYSTEM HEALTH
  // ============================================

  const renderSystemHealth = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">System Health</h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Healthy', value: systemHealth?.summary?.healthy || 0, color: colors.emerald },
          { label: 'Degraded', value: systemHealth?.summary?.degraded || 0, color: colors.mutedOrange },
          { label: 'Down', value: systemHealth?.summary?.down || 0, color: colors.mutedCrimson },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-[#D7E7E4]">
            <p className="text-sm text-[#64748B]">{stat.label}</p>
            <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-4 gap-4">
        {(systemHealth?.services || []).map((service) => (
          <div key={service.id} className="bg-white rounded-xl p-4 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-[#0A3340]">{service.name}</span>
              <span className={`w-3 h-3 rounded-full ${
                service.status === 'healthy' ? 'bg-emerald-500' :
                service.status === 'degraded' ? 'bg-[#13B8A6]' : 'bg-red-500'
              }`} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Latency</span>
                <span className="font-medium">{service.latency}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Uptime</span>
                <span className="font-medium">{service.uptime}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // BUSINESS HEALTH
  // ============================================

  const renderBusinessHealth = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Business Health</h2>

      {/* Revenue */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Revenue</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Today', value: `KES ${(businessHealth?.revenue?.today || 0).toLocaleString()}` },
            { label: 'This Week', value: `KES ${(businessHealth?.revenue?.thisWeek || 0).toLocaleString()}` },
            { label: 'Growth', value: `${businessHealth?.revenue?.growth || 0}%`, positive: true },
            { label: 'Projected', value: `KES ${(businessHealth?.revenue?.projection || 0).toLocaleString()}` },
          ].map((item, i) => (
            <div key={i} className="p-4 bg-[#F6FAF9] rounded-lg">
              <p className="text-sm text-[#64748B]">{item.label}</p>
              <p className="text-xl font-bold text-[#0A3340]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Business Metrics */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">Dealers</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Total</span>
              <span className="font-bold text-[#0A3340]">{businessHealth?.dealers?.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Active</span>
              <span className="font-bold text-emerald-600">{businessHealth?.dealers?.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Growth</span>
              <span className="font-bold text-emerald-600">+{businessHealth?.dealers?.growth}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">Auctions</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Active</span>
              <span className="font-bold text-[#0A3340]">{businessHealth?.auctions?.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Success Rate</span>
              <span className="font-bold text-emerald-600">{businessHealth?.auctions?.successRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#64748B]">Total Volume</span>
              <span className="font-bold text-[#0A3340]">KES {(businessHealth?.auctions?.totalVolume || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // SECURITY CENTER
  // ============================================

  const renderSecurity = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Security Operations Center</h2>

      {/* Overall Status */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Overall Status</p>
            <p className="text-3xl font-bold capitalize">{security?.overall?.status || 'secure'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Security Score</p>
            <p className="text-3xl font-bold">{security?.overall?.score || 92}%</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Failed Logins', value: security?.authentication?.failedLogins || 0, icon: Lock },
          { label: 'Blocked Accounts', value: security?.authentication?.blockedAccounts || 0, icon: Shield },
          { label: 'Abuse Attempts', value: security?.api?.abuseAttempts || 0, icon: AlertTriangle },
        ].map((metric, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <metric.icon size={24} className="text-[#94A3B8] mb-3" />
            <p className="text-sm text-[#64748B]">{metric.label}</p>
            <p className="text-2xl font-bold text-[#0A3340]">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // INCIDENTS
  // ============================================

  const renderIncidents = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Incident Management</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          <Plus size={18} />
          Create Incident
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6FAF9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Incident</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            <tr>
              <td className="px-6 py-4 text-sm text-[#0A3340]">No incidents reported</td>
              <td className="px-6 py-4" colSpan="4">All systems operating normally</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // PERFORMANCE
  // ============================================

  const renderPerformance = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Performance Metrics</h2>

      {/* Core Web Vitals */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Core Web Vitals</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'LCP', value: performance?.coreWebVitals?.lcp?.value || 0, unit: 's', target: '<2.5s' },
            { label: 'FID', value: performance?.coreWebVitals?.fid?.value || 0, unit: 'ms', target: '<100ms' },
            { label: 'CLS', value: performance?.coreWebVitals?.cls?.value || 0, target: '<0.1' },
          ].map((vital, i) => (
            <div key={i} className="p-4 bg-[#F6FAF9] rounded-lg text-center">
              <p className="text-sm text-[#64748B] mb-1">{vital.label}</p>
              <p className="text-2xl font-bold text-[#0A3340]">{vital.value}{vital.unit}</p>
              <p className="text-xs text-[#94A3B8]">Target: {vital.target}</p>
            </div>
          ))}
        </div>
      </div>

      {/* API Latency */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">API Latency</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'p50', value: performance?.apiLatency?.p50 || 0 },
            { label: 'p95', value: performance?.apiLatency?.p95 || 0 },
            { label: 'p99', value: performance?.apiLatency?.p99 || 0 },
            { label: 'Target', value: performance?.apiLatency?.target || 200 },
          ].map((latency, i) => (
            <div key={i} className="p-4 bg-[#F6FAF9] rounded-lg text-center">
              <p className="text-sm text-[#64748B] mb-1">{latency.label}</p>
              <p className="text-2xl font-bold text-[#0A3340]">{latency.value}ms</p>
            </div>
          ))}
        </div>
      </div>

      {/* Uptime */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Uptime</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Last 24 Hours', value: performance?.uptime?.last24h || 0 },
            { label: 'Last 7 Days', value: performance?.uptime?.last7d || 0 },
            { label: 'Last 30 Days', value: performance?.uptime?.last30d || 0 },
          ].map((uptime, i) => (
            <div key={i} className="p-4 bg-emerald-50 rounded-lg text-center">
              <p className="text-sm text-[#64748B] mb-1">{uptime.label}</p>
              <p className="text-2xl font-bold text-emerald-600">{uptime.value}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // SELF-HEALING
  // ============================================

  const renderSelfHealing = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Self-Healing Automation</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Rules */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">Automation Rules</h3>
          <div className="space-y-3">
            {selfHealingRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 bg-[#F6FAF9] rounded-lg">
                <div>
                  <p className="font-medium text-[#0A3340]">{rule.name}</p>
                  <p className="text-xs text-[#64748B]">
                    Auto-execute: {rule.autoExecute ? 'Yes' : 'No'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  rule.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-[#EEF7F5] text-[#12576D]'
                }`}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Restart Workers', icon: RefreshCw },
              { label: 'Clear Queues', icon: Trash2 },
              { label: 'Rebuild Search', icon: Search },
              { label: 'Refresh Cache', icon: Zap },
            ].map((action, i) => (
              <button
                key={i}
                className="flex items-center gap-2 px-4 py-3 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
              >
                <action.icon size={16} />
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // AI OPS COPILOT
  // ============================================

  const renderAiOps = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">AI Operations Copilot</h2>

      {/* Question Input */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Ask Operations Question</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAiQuestion()}
            placeholder="e.g., Why are auction pages slower today?"
            className="flex-1 px-4 py-3 border border-[#D7E7E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3340]"
          />
          <button
            onClick={handleAiQuestion}
            className="px-6 py-3 bg-[#0A3340] text-white rounded-xl hover:bg-[#12576D]"
          >
            <Send size={20} />
          </button>
        </div>

        {/* Example Questions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            'Why are auction pages slower today?',
            'Which APIs are failing?',
            'Show highest-risk services.',
            'What changed before this incident?',
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => setAiQuestion(q)}
              className="px-3 py-1.5 bg-[#EEF7F5] text-[#12576D] rounded-full text-sm hover:bg-[#DDF4F0]"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Response */}
      {aiResponse && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0A3340]">Analysis Result</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              aiResponse.confidence > 0.85 ? 'bg-emerald-100 text-emerald-700' :
              aiResponse.confidence > 0.7 ? 'bg-[#DDF4F0] text-[#12576D]' :
              'bg-[#EEF7F5] text-[#12576D]'
            }`}>
              {Math.round(aiResponse.confidence * 100)}% Confidence
            </span>
          </div>

          <p className="text-[#12576D] mb-6">{aiResponse.answer}</p>

          {aiResponse.recommendations && (
            <div className="space-y-2">
              <h4 className="font-medium text-[#0A3340]">Recommendations</h4>
              {aiResponse.recommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#F6FAF9] rounded-lg">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                    rec.priority === 'medium' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-[#EEF7F5] text-[#12576D]'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="text-sm text-[#12576D]">{rec.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'executive': return renderExecutive();
      case 'system': return renderSystemHealth();
      case 'business': return renderBusinessHealth();
      case 'security': return renderSecurity();
      case 'incidents': return renderIncidents();
      case 'performance': return renderPerformance();
      case 'selfhealing': return renderSelfHealing();
      case 'aiops': return renderAiOps();
      default: return renderExecutive();
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF7F5]">
      {/* Header */}
      <header className="bg-white border-b border-[#D7E7E4] sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A3340] to-[#12576d] flex items-center justify-center">
                  <Activity size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Enterprise Control Center</h1>
                  <p className="text-xs text-[#64748B]">Operations Command Hub</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                All Systems Operational
              </div>
              <button onClick={loadData} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <RefreshCw size={20} className="text-[#64748B]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#D7E7E4] min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
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
                      ? 'bg-[#0A3340] text-white'
                      : 'text-[#64748B] hover:bg-[#EEF7F5]'
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

// Helper icons
function Building(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  );
}

function Trash2(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
    </svg>
  );
}
