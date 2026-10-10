import React, { useState, useEffect } from 'react';
import {
  Target, Zap, Users, MapPin, Calendar, TrendingUp, BarChart3, Home,
  Layers, Palette, Globe, Smartphone, Tablet, Monitor, Sparkles, Plus,
  Search, Filter, Edit, Trash2, MoreVertical, Eye, Settings, ChevronRight,
  Check, X, Play, Pause, Power, Clock, CalendarDays, Flag, Gift, Car,
  Building, Gavel, Calculator, ClipboardCheck, Star, ArrowRight, Save,
  RefreshCw, TrendingDown, MousePointer, EyeOff, History, Bell, Map
} from 'lucide-react';
import * as xosApi from '../../../services/xosApi';

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

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: colors.navy },
  { id: 'campaigns', label: 'Campaigns', icon: Target, color: colors.terracotta },
  { id: 'audiences', label: 'Audiences', icon: Users, color: colors.emerald },
  { id: 'journeys', label: 'Journeys', icon: Map, color: colors.softBlue },
  { id: 'themes', label: 'Seasonal Themes', icon: Palette, color: colors.mutedOrange },
  { id: 'homepage', label: 'Homepage Variants', icon: Home, color: '#5aafa4' },
  { id: 'navigation', label: 'Navigation Rules', icon: Layers, color: colors.navy },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: colors.emerald },
  { id: 'ai', label: 'AI Recommendations', icon: Sparkles, color: '#13B8A6' },
];

const campaignTypes = [
  { id: 'seasonal', name: 'Seasonal', icon: Gift, color: colors.mutedOrange },
  { id: 'auction', name: 'Auction Week', icon: Gavel, color: colors.navy },
  { id: 'dealer', name: 'Dealer Promo', icon: Building, color: colors.emerald },
  { id: 'finance', name: 'Finance', icon: Calculator, color: colors.softBlue },
  { id: 'vehicle', name: 'Vehicle Expo', icon: Car, color: colors.terracotta },
  { id: 'awareness', name: 'Brand Awareness', icon: Star, color: '#5aafa4' },
];

const audienceSegments = [
  { id: 'buyer', name: 'Buyers', icon: ShoppingCart, count: 12500 },
  { id: 'seller', name: 'Sellers', icon: Tag, count: 3200 },
  { id: 'dealer', name: 'Dealers', icon: Building, count: 450 },
  { id: 'visitor', name: 'Visitors', icon: Eye, count: 45000 },
  { id: 'auction', name: 'Auction Participants', icon: Gavel, count: 2800 },
  { id: 'finance', name: 'Finance Applicants', icon: Calculator, count: 890 },
];

const seasonalTemplates = [
  { id: 'christmas', name: 'Christmas', icon: Gift, color: '#176B87' },
  { id: 'new_year', name: 'New Year', icon: Sparkles, color: '#13B8A6' },
  { id: 'eid', name: 'Eid', icon: Flag, color: '#0A3340' },
  { id: 'madaraka', name: 'Madaraka Day', icon: Flag, color: '#13B8A6' },
  { id: 'jamhuri', name: 'Jamhuri Day', icon: Star, color: '#0a3340' },
  { id: 'auction_week', name: 'Auction Week', icon: Gavel, color: colors.navy },
  { id: 'dealer_week', name: 'Dealer Week', icon: Building, color: colors.emerald },
  { id: 'summer', name: 'Summer Sale', icon: Sun, color: '#5AAFA4' },
];

const homepageVariantTypes = [
  { id: 'buyer', name: 'Buyer Homepage', color: colors.emerald },
  { id: 'dealer', name: 'Dealer Homepage', color: colors.softBlue },
  { id: 'auction', name: 'Auction Homepage', color: colors.navy },
  { id: 'finance', name: 'Finance Homepage', color: colors.terracotta },
  { id: 'visitor', name: 'Visitor Homepage', color: colors.mutedOrange },
  { id: 'regional', name: 'Regional Variants', color: '#5aafa4' },
];

export default function ExperienceStudio() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [themes, setThemes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: dashData } = await xosApi.getXOSDashboard();
      setDashboard(dashData.data);

      const { data: campaignsData } = await xosApi.getCampaigns();
      setCampaigns(campaignsData.data);

      const { data: expData } = await xosApi.getExperiences();
      setExperiences(expData.data);

      const { data: audData } = await xosApi.getAudiences();
      setAudiences(audData.data);

      const { data: journeyData } = await xosApi.getJourneys();
      setJourneys(journeyData.data);

      const { data: themeData } = await xosApi.getSeasonalThemes();
      setThemes(themeData.data);

      const { data: variantData } = await xosApi.getHomepageVariants();
      setVariants(variantData.data);

      const { data: aiData } = await xosApi.getAIRecommendations();
      setAiRecommendations(aiData.data);
    } catch (error) {
      console.error('Failed to load XOS data:', error);
      // No synthetic production fallback: the UI remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // DASHBOARD
  // ============================================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Experience Dashboard</h2>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Experiences', value: dashboard?.experiences?.active || 0, icon: Zap, color: colors.emerald },
          { label: 'Active Campaigns', value: dashboard?.campaigns?.active || 0, icon: Target, color: colors.terracotta },
          { label: 'Active Journeys', value: dashboard?.journeys?.active || 0, icon: Map, color: colors.softBlue },
          { label: 'Seasonal Themes', value: dashboard?.themes?.active || 0, icon: Palette, color: colors.mutedOrange },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <span className="text-sm text-[#64748B]">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-[#0A3340]">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-6">
        {/* Active Campaigns */}
        <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-5">
          <h3 className="font-semibold text-[#0A3340] mb-4">Active Campaigns</h3>
          <div className="space-y-3">
            {campaigns.filter(c => c.status === 'active').slice(0, 3).map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-3 bg-[#F6FAF9] rounded-lg">
                <div>
                  <p className="font-medium text-[#0A3340]">{campaign.name}</p>
                  <p className="text-xs text-[#64748B]">{campaign.impressions?.toLocaleString()} impressions</p>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Experiences */}
        <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-5">
          <h3 className="font-semibold text-[#0A3340] mb-4">Top Experiences</h3>
          <div className="space-y-3">
            {experiences.filter(e => e.status === 'active').slice(0, 3).map((exp) => (
              <div key={exp.id} className="flex items-center justify-between p-3 bg-[#F6FAF9] rounded-lg">
                <div>
                  <p className="font-medium text-[#0A3340]">{exp.name}</p>
                  <p className="text-xs text-[#64748B]">Priority: {exp.priority}</p>
                </div>
                <Power size={16} className="text-emerald-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Active Themes */}
        <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-5">
          <h3 className="font-semibold text-[#0A3340] mb-4">Active Seasonal Themes</h3>
          <div className="space-y-3">
            {themes.filter(t => t.status === 'active').slice(0, 3).map((theme) => (
              <div key={theme.id} className="flex items-center justify-between p-3 bg-[#F6FAF9] rounded-lg">
                <div>
                  <p className="font-medium text-[#0A3340]">{theme.name}</p>
                  <p className="text-xs text-[#64748B]">{theme.themeType}</p>
                </div>
                <Palette size={16} className="text-mutedOrange" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-gradient-to-r from-[#13B8A6] to-[#176B87] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={24} />
          <h3 className="font-semibold text-lg">AI Experience Recommendations</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {aiRecommendations.slice(0, 3).map((rec) => (
            <div key={rec.id} className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  rec.impact === 'high' ? 'bg-emerald-400/30' : 'bg-[#13B8A6]/30'
                }`}>
                  {rec.impact}
                </span>
                <span className="text-xs opacity-80">{rec.confidence}% confidence</span>
              </div>
              <h4 className="font-medium mb-1">{rec.title}</h4>
              <p className="text-sm opacity-80">{rec.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // CAMPAIGNS
  // ============================================

  const renderCampaigns = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Campaign Manager</h2>
        <button
          onClick={() => setShowModal('campaign')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
        >
          <Plus size={18} />
          New Campaign
        </button>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: campaigns.length, color: colors.navy },
          { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, color: colors.emerald },
          { label: 'Scheduled', value: campaigns.filter(c => c.status === 'scheduled').length, color: colors.softBlue },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, color: colors.slate },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-[#D7E7E4]">
            <p className="text-sm text-[#64748B]">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6FAF9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Schedule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Performance</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4">
                  <p className="font-medium text-[#0A3340]">{campaign.name}</p>
                  <p className="text-sm text-[#64748B]">Budget: KES {(campaign.budget || 0).toLocaleString()}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    campaignTypes.find(t => t.id === campaign.campaignType)?.color ? 'bg-[#EEF7F5]' : 'bg-[#EEF7F5]'
                  }`}>
                    {campaign.campaignType}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    campaign.status === 'scheduled' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    campaign.status === 'paused' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-[#EEF7F5] text-[#12576D]'
                  }`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[#64748B]">
                  {campaign.startDate} - {campaign.endDate}
                </td>
                <td className="px-6 py-4">
                  {campaign.impressions > 0 ? (
                    <div>
                      <p className="text-sm font-medium">{campaign.impressions?.toLocaleString()} impressions</p>
                      <p className="text-xs text-[#64748B]">CTR: {campaign.ctr}%</p>
                    </div>
                  ) : (
                    <span className="text-sm text-[#94A3B8]">Not started</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {campaign.status === 'active' ? (
                      <button className="p-2 hover:bg-[#F3FAF9] rounded-lg text-[#176B87]">
                        <Pause size={16} />
                      </button>
                    ) : campaign.status === 'paused' ? (
                      <button className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600">
                        <Play size={16} />
                      </button>
                    ) : null}
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                      <Edit size={16} />
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

  // ============================================
  // AUDIENCES
  // ============================================

  const renderAudiences = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Audience Manager</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Audience
        </button>
      </div>

      {/* Audience Segments */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { id: 'country', name: 'By Country', icon: Globe, description: 'Kenya, Uganda, Tanzania, Rwanda, Burundi' },
          { id: 'device', name: 'By Device', icon: Smartphone, description: 'Desktop, Tablet, Mobile' },
          { id: 'user_type', name: 'By User Type', icon: Users, description: 'Buyer, Seller, Dealer, Inspector' },
          { id: 'behavior', name: 'By Behavior', icon: TrendingUp, description: 'First-time, Returning, Engaged' },
          { id: 'interest', name: 'By Interest', icon: Target, description: 'SUV, Sedan, Truck, Electric' },
          { id: 'time', name: 'By Time', icon: Calendar, description: 'Seasonal, Time-based rules' },
        ].map((segment) => (
          <div key={segment.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4] hover:border-[#0A3340] transition-colors cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#0A3340]/10 flex items-center justify-center">
                <segment.icon size={20} className="text-[#0A3340]" />
              </div>
              <h3 className="font-semibold text-[#0A3340]">{segment.name}</h3>
            </div>
            <p className="text-sm text-[#64748B]">{segment.description}</p>
          </div>
        ))}
      </div>

      {/* Active Audiences */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-5">
        <h3 className="font-semibold text-[#0A3340] mb-4">Active Audiences</h3>
        <div className="grid grid-cols-4 gap-4">
          {audienceSegments.map((seg) => (
            <div key={seg.id} className="p-4 bg-[#F6FAF9] rounded-lg">
              <p className="font-medium text-[#0A3340]">{seg.name}</p>
              <p className="text-2xl font-bold text-[#0A3340]">{seg.count?.toLocaleString()}</p>
              <p className="text-xs text-[#64748B]">users</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // JOURNEYS
  // ============================================

  const renderJourneys = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Journey Designer</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Journey
        </button>
      </div>

      {/* Journey Types */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { id: 'buyer', name: 'Buyer Journey', icon: ShoppingCart, color: colors.emerald },
          { id: 'dealer', name: 'Dealer Journey', icon: Building, color: colors.softBlue },
          { id: 'auction', name: 'Auction Journey', icon: Gavel, color: colors.navy },
          { id: 'finance', name: 'Finance Journey', icon: Calculator, color: colors.terracotta },
          { id: 'inspection', name: 'Inspection Journey', icon: ClipboardCheck, color: colors.mutedOrange },
          { id: 'seller', name: 'Seller Journey', icon: Tag, color: '#5aafa4' },
        ].map((type) => (
          <div key={type.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4] hover:border-[#0A3340] transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${type.color}20` }}>
              <type.icon size={24} style={{ color: type.color }} />
            </div>
            <h3 className="font-semibold text-[#0A3340]">{type.name}</h3>
            <p className="text-sm text-[#64748B] mt-1">Visual flow designer</p>
          </div>
        ))}
      </div>

      {/* Active Journeys */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] p-5">
        <h3 className="font-semibold text-[#0A3340] mb-4">Active Journeys</h3>
        <div className="space-y-3">
          {journeys.map((journey) => (
            <div key={journey.id} className="flex items-center justify-between p-4 bg-[#F6FAF9] rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#0A3340]/10 rounded-lg flex items-center justify-center">
                  <Map size={20} className="text-[#0A3340]" />
                </div>
                <div>
                  <p className="font-medium text-[#0A3340]">{journey.name}</p>
                  <p className="text-sm text-[#64748B]">{journey.journeyType}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  journey.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#EEF7F5] text-[#12576D]'
                }`}>
                  {journey.status}
                </span>
                <button className="p-2 hover:bg-[#DDF4F0] rounded-lg">
                  <Edit size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // SEASONAL THEMES
  // ============================================

  const renderThemes = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Seasonal Themes</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Theme
        </button>
      </div>

      {/* Theme Templates */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Quick Start Templates</h3>
        <div className="grid grid-cols-4 gap-4">
          {seasonalTemplates.map((template) => (
            <div key={template.id} className="p-4 rounded-xl border border-[#D7E7E4] hover:border-[#0A3340] cursor-pointer transition-colors">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${template.color}20` }}>
                <template.icon size={24} style={{ color: template.color }} />
              </div>
              <h4 className="font-medium text-[#0A3340]">{template.name}</h4>
            </div>
          ))}
        </div>
      </div>

      {/* Active Themes */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6FAF9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Theme</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Schedule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {themes.map((theme) => (
              <tr key={theme.id} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4">
                  <p className="font-medium text-[#0A3340]">{theme.name}</p>
                </td>
                <td className="px-6 py-4 capitalize">
                  <span className="px-2 py-1 bg-[#EEF7F5] rounded text-xs">{theme.themeType}</span>
                </td>
                <td className="px-6 py-4 text-sm text-[#64748B]">
                  {theme.startDate} - {theme.endDate}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    theme.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#EEF7F5] text-[#12576D]'
                  }`}>
                    {theme.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                      <Edit size={16} />
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

  // ============================================
  // HOMEPAGE VARIANTS
  // ============================================

  const renderHomepageVariants = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Homepage Variants</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Variant
        </button>
      </div>

      <p className="text-[#64748B]">Create different homepage experiences for different user segments. The system automatically serves the appropriate variant based on user context.</p>

      {/* Variant Types */}
      <div className="grid grid-cols-3 gap-4">
        {homepageVariantTypes.map((type) => (
          <div key={type.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4] hover:border-[#0A3340] cursor-pointer transition-colors">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${type.color}20` }}>
              <Home size={24} style={{ color: type.color }} />
            </div>
            <h3 className="font-semibold text-[#0A3340]">{type.name}</h3>
            <p className="text-sm text-[#64748B] mt-1">Custom layout for {type.id} users</p>
          </div>
        ))}
      </div>

      {/* Active Variants */}
      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6FAF9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Variant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {variants.map((variant) => (
              <tr key={variant.id} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4 font-medium text-[#0A3340]">{variant.name}</td>
                <td className="px-6 py-4 capitalize">{variant.variantType}</td>
                <td className="px-6 py-4">{variant.priority}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    variant.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#EEF7F5] text-[#12576D]'
                  }`}>
                    {variant.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                      <Eye size={16} />
                    </button>
                    <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                      <Edit size={16} />
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

  // ============================================
  // ANALYTICS
  // ============================================

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Experience Analytics</h2>

      {/* Performance Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Impressions', value: '2.4M', change: '+12%', positive: true, icon: Eye },
          { label: 'Engagements', value: '456K', change: '+18%', positive: true, icon: MousePointer },
          { label: 'Engagement Rate', value: '18.6%', change: '+2.3%', positive: true, icon: TrendingUp },
          { label: 'Conversions', value: '12.4K', change: '+8%', positive: true, icon: Target },
        ].map((metric, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#64748B]">{metric.label}</span>
              <metric.icon size={18} className="text-[#94A3B8]" />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-[#0A3340]">{metric.value}</p>
              <span className={`text-sm font-medium ${metric.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* By Device */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">By Device</h3>
          <div className="space-y-3">
            {[
              { device: 'Desktop', impressions: 1234567, rate: 21.3 },
              { device: 'Tablet', impressions: 456789, rate: 18.9 },
              { device: 'Mobile', impressions: 765433, rate: 15.2 },
            ].map((item) => (
              <div key={item.device} className="p-3 bg-[#F6FAF9] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[#0A3340]">{item.device}</span>
                  <span className="text-sm text-[#64748B]">{item.rate}%</span>
                </div>
                <div className="w-full bg-[#DDF4F0] rounded-full h-2">
                  <div className="bg-[#0A3340] h-2 rounded-full" style={{ width: `${item.rate}%` }} />
                </div>
                <p className="text-xs text-[#64748B] mt-1">{item.impressions?.toLocaleString()} impressions</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">By Country</h3>
          <div className="space-y-3">
            {[
              { country: 'Kenya', impressions: 1567890, rate: 19.8 },
              { country: 'Uganda', impressions: 345678, rate: 17.2 },
              { country: 'Tanzania', impressions: 289012, rate: 18.5 },
            ].map((item) => (
              <div key={item.country} className="p-3 bg-[#F6FAF9] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[#0A3340]">{item.country}</span>
                  <span className="text-sm text-[#64748B]">{item.rate}%</span>
                </div>
                <div className="w-full bg-[#DDF4F0] rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${item.rate}%` }} />
                </div>
                <p className="text-xs text-[#64748B] mt-1">{item.impressions?.toLocaleString()} impressions</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">Top Experiences</h3>
          <div className="space-y-3">
            {[
              { name: 'Kenya Buyer', rate: 23.4 },
              { name: 'Auction Week', rate: 28.7 },
              { name: 'Dealer Portal', rate: 19.2 },
            ].map((item, i) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-[#F6FAF9] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#0A3340]/10 flex items-center justify-center text-xs font-medium text-[#0A3340]">
                    {i + 1}
                  </span>
                  <span className="font-medium text-[#0A3340]">{item.name}</span>
                </div>
                <span className="font-bold text-emerald-600">{item.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // AI RECOMMENDATIONS
  // ============================================

  const renderAIRecommendations = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">AI Experience Recommendations</h2>
      <p className="text-[#64748B]">AI-powered suggestions to optimize your user experiences</p>

      <div className="grid grid-cols-2 gap-4">
        {aiRecommendations.map((rec) => (
          <div key={rec.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  rec.impact === 'high' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#DDF4F0] text-[#12576D]'
                }`}>
                  {rec.impact} impact
                </span>
                <span className="px-2 py-1 bg-[#EEF7F5] rounded text-xs">{rec.type}</span>
              </div>
              <span className="text-sm text-[#64748B]">{rec.confidence}% confidence</span>
            </div>
            <h3 className="font-semibold text-[#0A3340] mb-2">{rec.title}</h3>
            <p className="text-sm text-[#64748B] mb-4">{rec.description}</p>
            <div className="flex items-center gap-2">
              <button className="flex-1 px-3 py-2 border border-[#0A3340] text-[#0A3340] rounded-lg text-sm hover:bg-[#0A3340]/5">
                Apply Suggestion
              </button>
              <button className="px-3 py-2 text-[#64748B] text-sm hover:text-[#12576D]">
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'campaigns': return renderCampaigns();
      case 'audiences': return renderAudiences();
      case 'journeys': return renderJourneys();
      case 'themes': return renderThemes();
      case 'homepage': return renderHomepageVariants();
      case 'analytics': return renderAnalytics();
      case 'ai': return renderAIRecommendations();
      default: return renderDashboard();
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
                  <Target size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Experience Studio</h1>
                  <p className="text-xs text-[#64748B]">Experience Orchestration Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <RefreshCw size={20} className="text-[#64748B]" />
              </button>
              <button className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <Settings size={20} className="text-[#64748B]" />
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
        <main className="flex-1 p-6">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}

// Helper icons not from lucide
const ShoppingCart = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const Tag = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
    <path d="M7 7h.01"/>
  </svg>
);

const Sun = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
  </svg>
);
