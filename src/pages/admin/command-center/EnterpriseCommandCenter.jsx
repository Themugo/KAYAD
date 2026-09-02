import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, BarChart3, Users, Car, Gavel, DollarSign, Shield,
  Server, Bot, Bell, Target, Search, Zap, CheckCircle, AlertTriangle,
  Clock, TrendingUp, TrendingDown, Eye, Settings, ChevronRight,
  Play, Pause, Wifi, WifiOff, ArrowUp, ArrowDown, X, Filter,
  Command, AlertCircle, Truck, Building, CreditCard, Clipboard,
  MessageSquare, Radio, EyeOff, Maximize2, Download, RefreshCw,
  Check, XCircle, ArrowRight, Keyboard
} from 'lucide-react';
import * as cmdApi from '../../../services/commandCenterApi';

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
  { id: 'mission', label: 'Mission Control', icon: Activity, color: colors.navy },
  { id: 'marketplace', label: 'Marketplace', icon: Car, color: colors.emerald },
  { id: 'dealers', label: 'Dealer Ops', icon: Building, color: colors.terracotta },
  { id: 'auctions', label: 'Auctions', icon: Gavel, color: colors.purple },
  { id: 'finance', label: 'Finance', icon: DollarSign, color: colors.softBlue },
  { id: 'inspections', label: 'Inspections', icon: Clipboard, color: colors.mutedOrange },
  { id: 'support', label: 'Support', icon: MessageSquare, color: colors.navy },
  { id: 'security', label: 'Security', icon: Shield, color: colors.mutedCrimson },
  { id: 'infrastructure', label: 'Infra', icon: Server, color: colors.navy },
  { id: 'ai', label: 'AI Ops', icon: Bot, color: '#FBBF24' },
];

function formatCurrency(value) {
  if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value?.toLocaleString() || '0';
}

export default function EnterpriseCommandCenter() {
  const [activeModule, setActiveModule] = useState('mission');
  const [missionControl, setMissionControl] = useState(null);
  const [liveActivity, setLiveActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingActions, setPendingActions] = useState(null);
  const [commands, setCommands] = useState([]);
  const [briefing, setBriefing] = useState(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [warRoomMode, setWarRoomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadAllData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowBriefing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const { data: missionData } = await cmdApi.getMissionControl();
      setMissionControl(missionData.data);
      
      const { data: activityData } = await cmdApi.getLiveActivity();
      setLiveActivity(activityData.data);
      
      const { data: notifData } = await cmdApi.getNotifications();
      setNotifications(notifData.data);
      
      const { data: actionsData } = await cmdApi.getPendingActions();
      setPendingActions(actionsData.data);
      
      const { data: cmdData } = await cmdApi.getCommands();
      setCommands(cmdData.data);
      
      const { data: briefData } = await cmdApi.getExecutiveBriefing();
      setBriefing(briefData.data);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load command center data:', error);
      // No synthetic production fallback: the UI remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  const handleCommandExecute = async (command) => {
    try {
      await cmdApi.executeCommand({ commandId: command.id });
      setShowCommandPalette(false);
      // Navigate based on command
    } catch (error) {
      console.error('Command failed:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const { data } = await cmdApi.enterpriseSearch({ query: searchQuery });
      setSearchResults(data.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // ============================================
  // MISSION CONTROL
  // ============================================

  const renderMissionControl = () => (
    <div className="space-y-4">
      {/* Executive KPIs */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Revenue Today', kpi: missionControl?.liveMetrics?.revenueToday, format: 'currency' },
          { label: 'Vehicles Listed', kpi: missionControl?.liveMetrics?.vehiclesListed, format: 'number' },
          { label: 'Vehicles Sold', kpi: missionControl?.liveMetrics?.vehiclesSold, format: 'number' },
          { label: 'Active Dealers', kpi: missionControl?.liveMetrics?.activeDealers, format: 'number' },
          { label: 'Live Auctions', kpi: missionControl?.liveMetrics?.liveAuctions, format: 'number' },
          { label: 'System Uptime', kpi: { value: 99.98, change: 0.01 }, format: 'percent' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p className="text-xl font-bold text-slate-800">
              {item.format === 'currency' ? formatCurrency(item.kpi?.value) :
               item.format === 'percent' ? item.kpi?.value?.toFixed(2) + '%' :
               item.kpi?.value?.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {item.kpi?.change > 0 ? (
                <ArrowUp size={12} className="text-emerald-500" />
              ) : (
                <ArrowDown size={12} className="text-red-500" />
              )}
              <span className={`text-xs ${item.kpi?.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {Math.abs(item.kpi?.change || 0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Live Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 col-span-2">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Live Activity</h3>
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-2">
            {liveActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === 'vehicle_sold' ? 'bg-emerald-100' :
                  activity.type === 'vehicle_listed' ? 'bg-blue-100' :
                  activity.type === 'auction_started' ? 'bg-purple-100' :
                  'bg-slate-100'
                }`}>
                  {activity.type === 'vehicle_sold' && <CheckCircle size={16} className="text-emerald-600" />}
                  {activity.type === 'vehicle_listed' && <Car size={16} className="text-blue-600" />}
                  {activity.type === 'auction_started' && <Gavel size={16} className="text-purple-600" />}
                  {!['vehicle_sold', 'vehicle_listed', 'auction_started'].includes(activity.type) && <Activity size={16} className="text-slate-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                  <p className="text-xs text-slate-500">{activity.description}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(activity.time).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Health */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Department Health</h3>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(missionControl?.departmentHealth || {}).map(([dept, status]) => (
              <div key={dept} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                <span className="text-sm text-slate-700 capitalize">{dept}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  status === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
                  status === 'warning' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Pending Actions</h3>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            {(missionControl?.pendingActions?.dealerApprovals || 0) + 
             (missionControl?.pendingActions?.auctionReviews || 0)} items
          </span>
        </div>
        <div className="p-4 grid grid-cols-4 gap-3">
          <button className="p-3 bg-blue-50 rounded-lg text-left hover:bg-blue-100 transition-colors">
            <p className="text-2xl font-bold text-blue-700">{missionControl?.pendingActions?.dealerApprovals || 0}</p>
            <p className="text-xs text-blue-600">Dealer Approvals</p>
          </button>
          <button className="p-3 bg-purple-50 rounded-lg text-left hover:bg-purple-100 transition-colors">
            <p className="text-2xl font-bold text-purple-700">{missionControl?.pendingActions?.auctionReviews || 0}</p>
            <p className="text-xs text-purple-600">Auction Reviews</p>
          </button>
          <button className="p-3 bg-emerald-50 rounded-lg text-left hover:bg-emerald-100 transition-colors">
            <p className="text-2xl font-bold text-emerald-700">{missionControl?.pendingActions?.inspectionReviews || 0}</p>
            <p className="text-xs text-emerald-600">Inspection Reviews</p>
          </button>
          <button className="p-3 bg-amber-50 rounded-lg text-left hover:bg-amber-100 transition-colors">
            <p className="text-2xl font-bold text-amber-700">{missionControl?.pendingActions?.financeApplications || 0}</p>
            <p className="text-xs text-amber-600">Finance Apps</p>
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // MARKETPLACE MODULE
  // ============================================

  const renderMarketplace = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Active Listings</p>
          <p className="text-3xl font-bold text-slate-800">12,456</p>
          <p className="text-xs text-emerald-600 mt-2">↑ 15.2%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Views Today</p>
          <p className="text-3xl font-bold text-slate-800">45,678</p>
          <p className="text-xs text-emerald-600 mt-2">↑ 23.4%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Inquiries</p>
          <p className="text-3xl font-bold text-slate-800">1,234</p>
          <p className="text-xs text-emerald-600 mt-2">↑ 8.1%</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Conversions</p>
          <p className="text-3xl font-bold text-slate-800">89</p>
          <p className="text-xs text-emerald-600 mt-2">↑ 5.8%</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Top Performers</h3>
        <div className="space-y-3">
          {[
            { name: 'Toyota Corolla', views: 4567, inquiries: 234 },
            { name: 'Toyota Landcruiser', views: 3890, inquiries: 189 },
            { name: 'Nissan X-Trail', views: 2345, inquiries: 123 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500">{item.views.toLocaleString()} views</p>
              </div>
              <span className="text-sm text-emerald-600">{item.inquiries} inquiries</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // DEALER MODULE
  // ============================================

  const renderDealers = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Total Dealers</p>
          <p className="text-3xl font-bold text-slate-800">456</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Active Today</p>
          <p className="text-3xl font-bold text-slate-800">234</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Pending Approval</p>
          <p className="text-3xl font-bold text-amber-600">5</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">At Risk</p>
          <p className="text-3xl font-bold text-red-600">8</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Top Performers</h3>
        <div className="space-y-2">
          {[
            { name: 'Auto Kenya Ltd', sales: 234, rating: 4.8 },
            { name: 'Prime Motors', sales: 198, rating: 4.7 },
            { name: 'Nairobi Auto Gallery', sales: 167, rating: 4.6 },
          ].map((dealer, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-[#17244B] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="font-medium text-slate-800">{dealer.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">{dealer.sales} sales</span>
                <span className="text-amber-500">★ {dealer.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // AUCTION MODULE
  // ============================================

  const renderAuctions = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Active Auctions</p>
          <p className="text-3xl font-bold text-slate-800">45</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Total Bidders</p>
          <p className="text-3xl font-bold text-slate-800">2,345</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Auction Revenue</p>
          <p className="text-3xl font-bold text-slate-800">12.3M</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Success Rate</p>
          <p className="text-3xl font-bold text-emerald-600">78.5%</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Live Auctions</h3>
        <div className="space-y-3">
          {[
            { vehicle: 'Mercedes GLE 2023', bids: 24, price: '8.9M', ends: '2h 30m' },
            { vehicle: 'BMW X5 2022', bids: 18, price: '7.8M', ends: '5h 15m' },
            { vehicle: 'Range Rover 2023', bids: 31, price: '14.5M', ends: '1h 45m' },
          ].map((auction, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-800">{auction.vehicle}</p>
                <p className="text-xs text-slate-500">{auction.bids} bids</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">KES {auction.price}</p>
                <p className="text-xs text-slate-500">Ends in {auction.ends}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // COMMAND PALETTE
  // ============================================

  const renderCommandPalette = () => (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50" onClick={() => setShowCommandPalette(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Command size={20} className="text-slate-400" />
            <input
              type="text"
              placeholder="Type a command or search..."
              className="flex-1 outline-none text-lg"
              autoFocus
            />
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">ESC</span>
          </div>
        </div>
        <div className="p-2 max-h-96 overflow-y-auto">
          {commands.map((command) => (
            <button
              key={command.id}
              onClick={() => handleCommandExecute(command)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 text-left"
            >
              <span className="text-xl">{command.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{command.name}</p>
                <p className="text-xs text-slate-500 capitalize">{command.category}</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {command.shortcut}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // BRIEFING MODAL
  // ============================================

  const renderBriefing = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8" onClick={() => setShowBriefing(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#17244B] to-[#2a3a6e] text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Morning Briefing</h2>
              <p className="text-sm opacity-80">
                Generated {new Date().toLocaleDateString()} at 7:00 AM
              </p>
            </div>
            <button onClick={() => setShowBriefing(false)} className="p-2 hover:bg-white/10 rounded-lg">
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Revenue Today', ...briefing?.summary?.revenueToday },
              { label: 'Vehicles Sold', ...briefing?.summary?.vehiclesSold },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(item.value)} / {formatCurrency(item.target)}
                </p>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${item.achievement}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">{item.achievement}% achieved</p>
              </div>
            ))}
          </div>

          {/* Risks */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">Active Risks</h3>
            <div className="space-y-2">
              {briefing?.risks?.map((risk) => (
                <div key={risk.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle size={20} className="text-red-600" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{risk.title}</p>
                    <p className="text-xs text-slate-500">{risk.description}</p>
                  </div>
                  <span className="text-xs text-red-600 capitalize">{risk.severity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">AI Recommendations</h3>
            <div className="space-y-2">
              {briefing?.recommendations?.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Bot size={20} className="text-blue-600 mt-0.5" />
                  <p className="text-sm text-slate-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'mission': return renderMissionControl();
      case 'marketplace': return renderMarketplace();
      case 'dealers': return renderDealers();
      case 'auctions': return renderAuctions();
      default: return renderMissionControl();
    }
  };

  return (
    <div className={`min-h-screen ${warRoomMode ? 'bg-black text-white' : 'bg-[#F6F1E8]'}`}>
      {/* Header */}
      <header className={`${warRoomMode ? 'bg-gray-900 border-b border-gray-700' : 'bg-white border-b border-slate-200'} sticky top-0 z-40`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17244B] to-[#2a3a6e] flex items-center justify-center">
                  <Activity size={20} className="text-white" />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${warRoomMode ? 'text-white' : 'text-slate-800'}`}>
                    Enterprise Command Center
                  </h1>
                  <p className={`text-xs ${warRoomMode ? 'text-gray-400' : 'text-slate-500'}`}>
                    Digital Headquarters
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  warRoomMode 
                    ? 'border-gray-600 bg-gray-800 text-gray-300' 
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <Search size={16} />
                <span className="text-sm">Search...</span>
                <kbd className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">⌘K</kbd>
              </button>

              {/* Briefing */}
              <button
                onClick={() => setShowBriefing(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  warRoomMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <BarChart3 size={16} />
                <span className="text-sm">Briefing</span>
              </button>

              {/* War Room */}
              <button
                onClick={() => setWarRoomMode(!warRoomMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  warRoomMode 
                    ? 'bg-red-900 text-red-300' 
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {warRoomMode ? <EyeOff size={16} /> : <Maximize2 size={16} />}
                <span className="text-sm">{warRoomMode ? 'Exit War Room' : 'War Room'}</span>
              </button>

              {/* Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                warRoomMode ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${warRoomMode ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
                <span className="text-sm font-medium">Live</span>
              </div>

              {/* Refresh */}
              <button
                onClick={loadAllData}
                className={`p-2 rounded-lg ${warRoomMode ? 'hover:bg-gray-800' : 'hover:bg-slate-100'}`}
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>

              {/* Notifications */}
              <button className={`relative p-2 rounded-lg ${warRoomMode ? 'hover:bg-gray-800' : 'hover:bg-slate-100'}`}>
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`w-20 ${warRoomMode ? 'bg-gray-900 border-r border-gray-700' : 'bg-white border-r border-slate-200'} min-h-[calc(100vh-60px)] sticky top-[60px] overflow-y-auto`}>
          <nav className="p-2 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                    isActive
                      ? warRoomMode
                        ? 'bg-emerald-900 text-emerald-300'
                        : 'bg-[#17244B] text-white'
                      : warRoomMode
                        ? 'text-gray-400 hover:bg-gray-800'
                        : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={mod.label}
                >
                  <Icon size={20} />
                  <span className="text-xs">{mod.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-auto">
          {renderModuleContent()}
        </main>
      </div>

      {/* Command Palette */}
      {showCommandPalette && renderCommandPalette()}

      {/* Briefing Modal */}
      {showBriefing && briefing && renderBriefing()}

      {/* Last Update Footer */}
      <div className={`fixed bottom-0 left-0 right-0 px-4 py-2 text-center text-xs ${warRoomMode ? 'bg-gray-900 text-gray-500 border-t border-gray-700' : 'bg-slate-100 text-slate-400 border-t border-slate-200'}`}>
        Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh: 30s
      </div>
    </div>
  );
}
