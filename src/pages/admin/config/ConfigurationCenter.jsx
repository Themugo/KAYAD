import React, { useState, useEffect } from 'react';
import {
  Settings, Database, Globe, Car, Users, Gavel, ShieldCheck,
  DollarSign, CreditCard, FileText, Flag, Bell, Tag, Languages,
  MapPin, Zap, Package, Building2, Scale, Truck, CheckCircle,
  ChevronRight, Search, Filter, Plus, Edit, Trash2, Download,
  Upload, MoreVertical, ToggleLeft, ToggleRight, RefreshCw, X,
  Save, Eye, History, AlertTriangle
} from 'lucide-react';
import * as configApi from '../../../services/configApi';

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
};

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: Settings, color: colors.navy },
  { id: 'general', label: 'General Settings', icon: Settings, color: colors.navy },
  { id: 'vehicle', label: 'Vehicle Master Data', icon: Car, color: colors.terracotta },
  { id: 'location', label: 'Location Data', icon: MapPin, color: colors.emerald },
  { id: 'reference', label: 'Reference Data', icon: Database, color: colors.softBlue },
  { id: 'features', label: 'Feature Flags', icon: Flag, color: '#5aafa4' },
  { id: 'dealer', label: 'Dealer Settings', icon: Users, color: colors.terracotta },
  { id: 'auction', label: 'Auction Settings', icon: Gavel, color: colors.navy },
  { id: 'inspection', label: 'Inspection Settings', icon: ShieldCheck, color: colors.emerald },
  { id: 'finance', label: 'Finance Settings', icon: DollarSign, color: colors.softBlue },
  { id: 'payment', label: 'Payment Settings', icon: CreditCard, color: colors.mutedOrange },
  { id: 'pricing', label: 'Pricing Engine', icon: Tag, color: '#13B8A6' },
  { id: 'countries', label: 'Countries', icon: Globe, color: colors.navy },
  { id: 'notifications', label: 'Notification Templates', icon: Bell, color: colors.mutedOrange },
  { id: 'audit', label: 'Audit Log', icon: History, color: colors.softBlue },
];

export default function ConfigurationCenter() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [referenceData, setReferenceData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await configApi.getConfigStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({
        configEntries: { total: 156 },
        featureFlags: { total: 24, active: 18, inactive: 6 },
        referenceData: { total: 342, byType: { vehicle_status: 8, listing_status: 6 } },
        vehicleMasterData: { total: 567, makes: 45, models: 234, bodyTypes: 15 },
        locationMasterData: { total: 234, countries: 6, regions: 47, cities: 181 },
        countries: { total: 6 },
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatureFlag = async (id) => {
    try {
      await configApi.toggleFeatureFlag(id);
      setFeatureFlags(featureFlags.map(f =>
        f.id === id ? { ...f, status: f.status === 'active' ? 'inactive' : 'active' } : f
      ));
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Configuration Overview</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
            <Download size={18} />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
            <Upload size={18} />
            Import
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Feature Flags', value: stats?.featureFlags?.total || 0, sub: `${stats?.featureFlags?.active || 0} active`, icon: Flag, color: '#5aafa4' },
          { label: 'Reference Data', value: stats?.referenceData?.total || 0, sub: 'lookup values', icon: Database, color: colors.softBlue },
          { label: 'Vehicle Data', value: stats?.vehicleMasterData?.total || 0, sub: `${stats?.vehicleMasterData?.makes || 0} makes`, icon: Car, color: colors.terracotta },
          { label: 'Locations', value: stats?.locationMasterData?.total || 0, sub: `${stats?.locationMasterData?.countries || 0} countries`, icon: MapPin, color: colors.emerald },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span className="text-sm text-[#64748B]">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-[#0A3340]">{stat.value.toLocaleString()}</div>
            <div className="text-xs text-[#94A3B8] mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <h3 className="text-lg font-semibold text-[#0A3340] mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sections.slice(1, 9).map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="flex items-center gap-3 p-4 rounded-lg border border-[#D7E7E4] hover:border-[#0A3340] hover:bg-[#0A3340]/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${section.color}15` }}>
                <section.icon size={20} style={{ color: section.color }} />
              </div>
              <span className="text-sm font-medium text-[#12576D]">{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#0A3340]">Recent Changes</h3>
          <button
            onClick={() => setActiveSection('audit')}
            className="text-sm text-[#0A3340] hover:underline"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {[
            { action: 'Updated', item: 'Auction Duration Settings', user: 'Admin', time: '5 min ago' },
            { action: 'Created', item: 'New Vehicle Make: BYD', user: 'Editor', time: '1 hour ago' },
            { action: 'Enabled', item: 'AI Assistant Feature', user: 'Admin', time: '2 hours ago' },
            { action: 'Updated', item: 'M-Pesa Configuration', user: 'Admin', time: '3 hours ago' },
            { action: 'Created', item: 'New Region: Nakuru', user: 'Editor', time: '5 hours ago' },
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#F6FAF9]">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  log.action === 'Created' ? 'bg-emerald-100' : log.action === 'Enabled' ? 'bg-[#DDF4F0]' : 'bg-[#DDF4F0]'
                }`}>
                  {log.action === 'Created' ? <Plus size={16} className="text-emerald-600" /> :
                   log.action === 'Enabled' ? <CheckCircle size={16} className="text-[#176B87]" /> :
                   <Edit size={16} className="text-[#176B87]" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0A3340]">{log.item}</p>
                  <p className="text-xs text-[#94A3B8]">by {log.user}</p>
                </div>
              </div>
              <span className="text-xs text-[#94A3B8]">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFeatureFlags = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Feature Flags</h2>
        <button
          onClick={() => { setSelectedItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
        >
          <Plus size={18} />
          Add Feature Flag
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] outline-none"
          />
        </div>
        <select className="px-4 py-2.5 rounded-lg border border-[#D7E7E4] outline-none">
          <option>All Categories</option>
          <option>Marketplace</option>
          <option>Auction</option>
          <option>Finance</option>
          <option>Experimental</option>
        </select>
        <select className="px-4 py-2.5 rounded-lg border border-[#D7E7E4] outline-none">
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      {/* Feature Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { key: 'auctions_enabled', name: 'Auctions', category: 'Marketplace', status: 'active', description: 'Enable auction functionality' },
          { key: 'escrow_enabled', name: 'Escrow', category: 'Finance', status: 'active', description: 'Enable escrow payments' },
          { key: 'finance_enabled', name: 'Finance', category: 'Finance', status: 'active', description: 'Enable financing options' },
          { key: 'messaging_enabled', name: 'Messaging', category: 'Communication', status: 'active', description: 'Enable in-app messaging' },
          { key: 'ai_assistant', name: 'AI Assistant', category: 'Experimental', status: 'inactive', description: 'Enable AI-powered assistant' },
          { key: 'live_video', name: 'Live Video Tours', category: 'Experimental', status: 'inactive', description: 'Enable live video vehicle tours' },
          { key: 'voice_commentary', name: 'Voice Commentary', category: 'Experimental', status: 'inactive', description: 'Enable voice notes on listings' },
          { key: 'dealer_analytics', name: 'Dealer Analytics', category: 'Analytics', status: 'active', description: 'Enable dealer dashboard analytics' },
          { key: 'vehicle_passport', name: 'Vehicle Passport', category: 'Marketplace', status: 'active', description: 'Enable vehicle passport feature' },
        ].map((flag, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${flag.status === 'active' ? 'bg-emerald-100' : 'bg-[#EEF7F5]'}`}>
                  <Zap size={20} className={flag.status === 'active' ? 'text-emerald-600' : 'text-[#94A3B8]'} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A3340]">{flag.name}</h3>
                  <p className="text-xs text-[#94A3B8]">{flag.key}</p>
                </div>
              </div>
              <button
                onClick={() => toggleFeatureFlag(flag.key)}
                className="flex items-center gap-1"
              >
                {flag.status === 'active' ? (
                  <ToggleRight size={32} className="text-emerald-600" />
                ) : (
                  <ToggleLeft size={32} className="text-[#94A3B8]" />
                )}
              </button>
            </div>
            <p className="text-sm text-[#64748B] mb-3">{flag.description}</p>
            <div className="flex items-center justify-between pt-3 border-t border-[#D7E7E4]">
              <span className="px-2 py-0.5 bg-[#EEF7F5] rounded text-xs text-[#64748B]">{flag.category}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${flag.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#EEF7F5] text-[#64748B]'}`}>
                {flag.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVehicleMasterData = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Vehicle Master Data</h2>
        <button
          onClick={() => { setSelectedItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
        >
          <Plus size={18} />
          Add Vehicle Data
        </button>
      </div>

      {/* Data Types */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Makes', count: stats?.vehicleMasterData?.makes || 45, type: 'make' },
          { label: 'Models', count: stats?.vehicleMasterData?.models || 234, type: 'model' },
          { label: 'Body Types', count: stats?.vehicleMasterData?.bodyTypes || 15, type: 'body_type' },
          { label: 'Fuel Types', count: 8, type: 'fuel_type' },
          { label: 'Transmissions', count: 4, type: 'transmission_type' },
          { label: 'Colors', count: 24, type: 'color' },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => setActiveSection(`vehicle_${item.type}`)}
            className="p-4 rounded-xl border border-[#D7E7E4] hover:border-[#0A3340] hover:bg-[#0A3340]/5 transition-all text-center"
          >
            <div className="text-2xl font-bold text-[#0A3340]">{item.count}</div>
            <div className="text-sm text-[#64748B]">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Vehicle Makes List */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <div className="p-4 border-b border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340]">Vehicle Makes</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#F6FAF9] border-b border-[#D7E7E4]">
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Make</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Models</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Country</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {[
              { make: 'Toyota', models: 45, country: 'Japan', status: 'active' },
              { make: 'Honda', models: 32, country: 'Japan', status: 'active' },
              { make: 'Nissan', models: 28, country: 'Japan', status: 'active' },
              { make: 'Subaru', models: 18, country: 'Japan', status: 'active' },
              { make: 'Mitsubishi', models: 22, country: 'Japan', status: 'active' },
              { make: 'Isuzu', models: 12, country: 'Japan', status: 'active' },
              { make: 'Volkswagen', models: 35, country: 'Germany', status: 'active' },
              { make: 'Mercedes-Benz', models: 42, country: 'Germany', status: 'active' },
              { make: 'BMW', models: 38, country: 'Germany', status: 'active' },
              { make: 'Ford', models: 30, country: 'USA', status: 'active' },
              { make: 'BYD', models: 15, country: 'China', status: 'active' },
              { make: 'Geely', models: 12, country: 'China', status: 'active' },
            ].map((item, i) => (
              <tr key={i} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#EEF7F5] flex items-center justify-center">
                      <Car size={18} className="text-[#94A3B8]" />
                    </div>
                    <span className="font-medium text-[#0A3340]">{item.make}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[#64748B]">{item.models}</td>
                <td className="px-6 py-4 text-[#64748B]">{item.country}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">{item.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                      <Edit size={16} className="text-[#64748B]" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReferenceData = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Reference Data</h2>
        <button
          onClick={() => { setSelectedItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
        >
          <Plus size={18} />
          Add Reference
        </button>
      </div>

      {/* Reference Types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Vehicle Status', count: 8, icon: Car },
          { label: 'Listing Status', count: 6, icon: Tag },
          { label: 'Dealer Levels', count: 5, icon: Users },
          { label: 'Auction Categories', count: 12, icon: Gavel },
          { label: 'Inspection Outcomes', count: 7, icon: ShieldCheck },
          { label: 'Finance Status', count: 9, icon: DollarSign },
          { label: 'Payment Methods', count: 8, icon: CreditCard },
          { label: 'Risk Levels', count: 5, icon: AlertTriangle },
        ].map((type) => (
          <button
            key={type.label}
            className="p-4 rounded-xl border border-[#D7E7E4] hover:border-[#0A3340] hover:bg-[#0A3340]/5 transition-all text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <type.icon size={20} className="text-[#64748B]" />
              <span className="font-medium text-[#0A3340]">{type.count}</span>
            </div>
            <p className="text-sm text-[#64748B]">{type.label}</p>
          </button>
        ))}
      </div>

      {/* Reference Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <div className="p-4 border-b border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340]">All Reference Values</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#F6FAF9] border-b border-[#D7E7E4]">
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Value</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Label</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Display Order</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {[
              { type: 'vehicle_status', value: 'active', label: 'Active', order: 1 },
              { type: 'vehicle_status', value: 'pending', label: 'Pending Review', order: 2 },
              { type: 'vehicle_status', value: 'sold', label: 'Sold', order: 3 },
              { type: 'vehicle_status', value: 'archived', label: 'Archived', order: 4 },
              { type: 'listing_status', value: 'draft', label: 'Draft', order: 1 },
              { type: 'listing_status', value: 'published', label: 'Published', order: 2 },
              { type: 'listing_status', value: 'featured', label: 'Featured', order: 3 },
              { type: 'dealer_level', value: 'basic', label: 'Basic', order: 1 },
              { type: 'dealer_level', value: 'premium', label: 'Premium', order: 2 },
              { type: 'dealer_level', value: 'elite', label: 'Elite', order: 3 },
            ].map((item, i) => (
              <tr key={i} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-[#EEF7F5] rounded text-xs text-[#64748B]">{item.type}</span>
                </td>
                <td className="px-6 py-4 text-[#0A3340] font-mono">{item.value}</td>
                <td className="px-6 py-4 text-[#0A3340]">{item.label}</td>
                <td className="px-6 py-4 text-[#64748B]">{item.order}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                      <Edit size={16} className="text-[#64748B]" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAuditLog = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Audit Log</h2>
        <button className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
          <Download size={18} />
          Export Logs
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F6FAF9] border-b border-[#D7E7E4]">
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Action</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Entity</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">User</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Previous Value</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">New Value</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Timestamp</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {[
              { action: 'Update', entity: 'Feature Flag', user: 'admin@kayad.co.ke', prev: 'inactive', new: 'active', time: '2024-01-15 14:30' },
              { action: 'Create', entity: 'Vehicle Make', user: 'editor@kayad.co.ke', prev: '-', new: 'BYD', time: '2024-01-15 13:45' },
              { action: 'Update', entity: 'Config Entry', user: 'admin@kayad.co.ke', prev: '14 days', new: '30 days', time: '2024-01-15 12:00' },
              { action: 'Delete', entity: 'Reference Data', user: 'admin@kayad.co.ke', prev: 'obsolete_status', new: '-', time: '2024-01-15 10:30' },
              { action: 'Update', entity: 'Country Config', user: 'admin@kayad.co.ke', prev: 'KE', new: 'Kenya', time: '2024-01-14 16:45' },
            ].map((log, i) => (
              <tr key={i} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    log.action === 'Create' ? 'bg-emerald-100 text-emerald-700' :
                    log.action === 'Update' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#0A3340]">{log.entity}</td>
                <td className="px-6 py-4 text-[#64748B] text-sm">{log.user}</td>
                <td className="px-6 py-4 text-[#64748B] font-mono text-sm">{log.prev}</td>
                <td className="px-6 py-4 text-[#0A3340] font-mono text-sm">{log.new}</td>
                <td className="px-6 py-4 text-[#64748B] text-sm">{log.time}</td>
                <td className="px-6 py-4 text-right">
                  <button className="px-3 py-1 text-xs border border-[#D7E7E4] rounded hover:bg-[#F6FAF9]">
                    Rollback
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard': return renderDashboard();
      case 'features': return renderFeatureFlags();
      case 'vehicle': return renderVehicleMasterData();
      case 'reference': return renderReferenceData();
      case 'audit': return renderAuditLog();
      default: return (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-[#D7E7E4] text-center">
          <Settings size={64} className="mx-auto text-[#BDE5DE] mb-4" />
          <h3 className="text-xl font-semibold text-[#0A3340] mb-2">{sections.find(s => s.id === activeSection)?.label}</h3>
          <p className="text-[#64748B]">This section is under development</p>
        </div>
      );
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
                <div className="w-10 h-10 rounded-xl bg-[#0A3340] flex items-center justify-center">
                  <Database size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Configuration Center</h1>
                  <p className="text-xs text-[#64748B]">Master Data Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <RefreshCw size={20} className="text-[#64748B]" />
              </button>
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <Bell size={20} className="text-[#64748B]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#D7E7E4] min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#0A3340] text-white'
                      : 'text-[#64748B] hover:bg-[#EEF7F5]'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{section.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderSectionContent()}
        </main>
      </div>
    </div>
  );
}
