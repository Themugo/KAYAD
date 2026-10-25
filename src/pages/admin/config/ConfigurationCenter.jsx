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
import { isUnavailable } from '../../../components/admin/adminStat';

// A missing or non-numeric figure is shown as Unavailable, never as 0.
const nv = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 'Unavailable');

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
  const [flagsState, setFlagsState] = useState('idle');
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const { data } = await configApi.getConfigStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // No synthetic fallback: figures stay unavailable until the backend responds.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection !== 'features') return undefined;
    let cancelled = false;
    setFlagsState('loading');
    configApi.getFeatureFlags()
      .then(({ data }) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.data) ? data.data : null;
        if (!rows) throw new Error('Unexpected feature flag payload');
        setFeatureFlags(rows.map(f => ({
          ...f,
          name: f.name || f.key,
          status: f.status || (f.isActive || f.enabled ? 'active' : 'inactive'),
        })));
        setFlagsState('ready');
      })
      .catch(() => { if (!cancelled) setFlagsState('error'); });
    return () => { cancelled = true; };
  }, [activeSection]);

  const visibleFlags = featureFlags.filter(f => {
    const q = searchQuery.trim().toLowerCase();
    return !q || [f.name, f.key, f.category].some(v => String(v || '').toLowerCase().includes(q));
  });

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
          { label: 'Feature Flags', value: nv(stats?.featureFlags?.total), sub: `${nv(stats?.featureFlags?.active)} active`, icon: Flag, color: '#5aafa4' },
          { label: 'Reference Data', value: nv(stats?.referenceData?.total), sub: 'lookup values', icon: Database, color: colors.softBlue },
          { label: 'Vehicle Data', value: nv(stats?.vehicleMasterData?.total), sub: `${nv(stats?.vehicleMasterData?.makes)} makes`, icon: Car, color: colors.terracotta },
          { label: 'Locations', value: nv(stats?.locationMasterData?.total), sub: `${nv(stats?.locationMasterData?.countries)} countries`, icon: MapPin, color: colors.emerald },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span className="text-sm text-[#64748B]">{stat.label}</span>
            </div>
            <div className={`${isUnavailable(stat.value) ? 'text-lg' : 'text-3xl'} font-bold text-[#0A3340]`}>{stat.value.toLocaleString()}</div>
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
          {[].map((log, i) => (
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
          <p className="text-sm text-[#64748B]" role="status">No change history is connected to this view yet.</p>
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
        {flagsState === 'ready' && visibleFlags.map((flag) => (
          <div key={flag.id ?? flag.key} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
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
                aria-label={`${flag.status === 'active' ? 'Disable' : 'Enable'} ${flag.name}`}
                aria-pressed={flag.status === 'active'}
                onClick={() => toggleFeatureFlag(flag.id)}
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
        {flagsState === 'loading' && <p className="col-span-full text-sm text-[#64748B]" role="status">Loading feature flags…</p>}
        {flagsState === 'error' && <p className="col-span-full text-sm text-red-700" role="alert">Feature flags could not be loaded. No flags are shown rather than guessing their state.</p>}
        {flagsState === 'ready' && visibleFlags.length === 0 && <p className="col-span-full text-sm text-[#64748B]" role="status">No feature flags were returned.</p>}
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
          { label: 'Makes', count: stats?.vehicleMasterData?.makes, type: 'make' },
          { label: 'Models', count: stats?.vehicleMasterData?.models, type: 'model' },
          { label: 'Body Types', count: stats?.vehicleMasterData?.bodyTypes, type: 'body_type' },
          { label: 'Fuel Types', count: undefined, type: 'fuel_type' },
          { label: 'Transmissions', count: undefined, type: 'transmission_type' },
          { label: 'Colors', count: undefined, type: 'color' },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => setActiveSection(`vehicle_${item.type}`)}
            className="p-4 rounded-xl border border-[#D7E7E4] hover:border-[#0A3340] hover:bg-[#0A3340]/5 transition-all text-center"
          >
            <div className={`${isUnavailable(Number.isFinite(item.count) ? item.count : 'Unavailable') ? 'text-base' : 'text-2xl'} font-bold text-[#0A3340]`}>{Number.isFinite(item.count) ? item.count : 'Unavailable'}</div>
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
            {[].map((item, i) => (
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
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Edit">
                      <Edit size={16} className="text-[#64748B]" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg" aria-label="Delete">
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}<tr><td colSpan={6} className="px-6 py-6 text-sm text-[#64748B]">Vehicle make data is not connected to this view, so no makes are listed.</td></tr>
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
          { label: 'Vehicle Status', icon: Car },
          { label: 'Listing Status', icon: Tag },
          { label: 'Dealer Levels', icon: Users },
          { label: 'Auction Categories', icon: Gavel },
          { label: 'Inspection Outcomes', icon: ShieldCheck },
          { label: 'Finance Status', icon: DollarSign },
          { label: 'Payment Methods', icon: CreditCard },
          { label: 'Risk Levels', icon: AlertTriangle },
        ].map((type) => (
          <button
            key={type.label}
            className="p-4 rounded-xl border border-[#D7E7E4] hover:border-[#0A3340] hover:bg-[#0A3340]/5 transition-all text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <type.icon size={20} className="text-[#64748B]" />
              <span className="font-medium text-[#0A3340]">{Number.isFinite(type.count) ? type.count : 'Unavailable'}</span>
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
            {[].map((item, i) => (
              <tr key={i} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-[#EEF7F5] rounded text-xs text-[#64748B]">{item.type}</span>
                </td>
                <td className="px-6 py-4 text-[#0A3340] font-mono">{item.value}</td>
                <td className="px-6 py-4 text-[#0A3340]">{item.label}</td>
                <td className="px-6 py-4 text-[#64748B]">{item.order}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Edit">
                      <Edit size={16} className="text-[#64748B]" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg" aria-label="Delete">
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}<tr><td colSpan={6} className="px-6 py-6 text-sm text-[#64748B]">Reference values are not connected to this view, so none are listed.</td></tr>
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
            {[].map((log, i) => (
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
            <tr><td colSpan={6} className="px-6 py-6 text-sm text-[#64748B]">No audit entries are connected to this view yet.</td></tr>
            <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-[#64748B]">No configuration change records are connected to this view yet.</td></tr>
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
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Refresh">
                <RefreshCw size={20} className="text-[#64748B]" />
              </button>
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Notifications">
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
        <div className="flex-1 p-6">
          {loadError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Configuration statistics could not be loaded. Figures are unavailable, not zero.</div>}
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
}
