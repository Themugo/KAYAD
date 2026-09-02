import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, LandingPage, Newspaper, BookOpen,
  HelpCircle, Megaphone, Image, Palette, Calendar, Search,
  BarChart3, Globe, SplitSquareVertical, Settings, ChevronRight,
  Plus, Eye, Edit, Trash2, Clock, CheckCircle, AlertCircle,
  FolderOpen, Tag, Filter, MoreVertical, Bell, TrendingUp
} from 'lucide-react';
import * as cmsApi from '../../../services/cmsApi';
import VisualPageBuilder from './components/VisualPageBuilder';
import MediaLibrary from './components/MediaLibrary';
import SEOManager from './components/SEOManager';
import PublishingCalendar from './components/PublishingCalendar';

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
};

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: colors.navy },
  { id: 'pages', label: 'Pages', icon: FileText, color: colors.softBlue },
  { id: 'landing', label: 'Landing Pages', icon: LandingPage, color: colors.emerald },
  { id: 'blog', label: 'Blog', icon: Newspaper, color: colors.terracotta },
  { id: 'news', label: 'News', icon: BookOpen, color: '#8B5CF6' },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, color: '#06B6D4' },
  { id: 'help', label: 'Help Center', icon: HelpCircle, color: '#F59E0B' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, color: colors.mutedOrange },
  { id: 'announcements', label: 'Announcements', icon: Bell, color: colors.mutedCrimson },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, color: '#EC4899' },
  { id: 'promotions', label: 'Promotions', icon: TrendingUp, color: colors.emerald },
  { id: 'banners', label: 'Banners', icon: Image, color: '#A855F7' },
  { id: 'media', label: 'Media Library', icon: FolderOpen, color: colors.softBlue },
  { id: 'seo', label: 'SEO', icon: Globe, color: colors.navy },
  { id: 'calendar', label: 'Calendar', icon: Calendar, color: '#14B8A6' },
  { id: 'abtests', label: 'A/B Tests', icon: SplitSquareVertical, color: '#F97316' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, color: '#6366F1' },
  { id: 'widgets', label: 'Widgets', icon: Palette, color: '#D946EF' },
];

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
};

const statusIcons = {
  draft: Clock,
  scheduled: Clock,
  published: CheckCircle,
  archived: AlertCircle,
};

export default function ContentStudio() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data } = await cmsApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // No synthetic production fallback: the UI remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Content Overview</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054] transition-colors">
          <Plus size={18} />
          Create New
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Pages', value: stats?.pages?.total || 0, sub: `${stats?.pages?.published || 0} published`, color: colors.softBlue },
          { label: 'Articles', value: stats?.content?.total || 0, sub: `${stats?.content?.published || 0} published`, color: colors.terracotta },
          { label: 'Media Files', value: stats?.media?.total || 0, sub: 'in library', color: colors.emerald },
          { label: 'FAQs', value: stats?.faqs?.total || 0, sub: 'articles', color: colors.mutedOrange },
          { label: 'Active Campaigns', value: stats?.campaigns?.active || 0, sub: 'running', color: '#EC4899' },
          { label: 'Active Banners', value: stats?.banners?.active || 0, sub: 'on site', color: '#A855F7' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
              </div>
              <span className="text-sm text-slate-500">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-400 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Weekly Analytics */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">This Week's Performance</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#17244B]">{stats?.analytics?.weekViews?.toLocaleString() || 0}</div>
            <div className="text-sm text-slate-500 mt-1">Page Views</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">{stats?.analytics?.weekClicks?.toLocaleString() || 0}</div>
            <div className="text-sm text-slate-500 mt-1">Clicks</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#C77B58]">{stats?.analytics?.weekConversions?.toLocaleString() || 0}</div>
            <div className="text-sm text-slate-500 mt-1">Conversions</div>
          </div>
        </div>
      </div>

      {/* Recent Content */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'New Page', icon: FileText, module: 'pages' },
            { label: 'Write Article', icon: Newspaper, module: 'blog' },
            { label: 'Add FAQ', icon: HelpCircle, module: 'faq' },
            { label: 'Create Campaign', icon: Megaphone, module: 'campaigns' },
            { label: 'Upload Media', icon: Image, module: 'media' },
            { label: 'Schedule Post', icon: Calendar, module: 'calendar' },
            { label: 'View Analytics', icon: BarChart3, module: 'analytics' },
            { label: 'Manage SEO', icon: Globe, module: 'seo' },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => setActiveModule(action.module)}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-[#17244B] hover:bg-[#17244B]/5 transition-all"
            >
              <action.icon size={20} className="text-slate-600" />
              <span className="text-sm font-medium text-slate-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    const module = modules.find(m => m.id === activeModule);
    const Icon = module?.icon || FileText;

    return (
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${module?.color}20` }}>
              <Icon size={24} style={{ color: module?.color }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{module?.label}</h2>
              <p className="text-sm text-slate-500">Manage your {module?.label?.toLowerCase()} content</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054] transition-colors">
            <Plus size={18} />
            New {module?.label.replace('s', '').replace(' Pages', ' Page')}
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={`Search ${module?.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-slate-200 focus:border-[#17244B] outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50">
            <Filter size={18} />
            More Filters
          </button>
        </div>

        {/* Content Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Author</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon size={18} className="text-slate-400" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">Sample {module?.label.replace('s', '')} {i}</div>
                        <div className="text-sm text-slate-400">/sample-slug-{i}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[Object.keys(statusColors)[i % 4]]}`}>
                      {React.createElement(statusIcons[Object.keys(statusColors)[i % 4]], { size: 12 })}
                      {Object.keys(statusColors)[i % 4]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#C77B58]/20 text-[#C77B58] text-xs font-medium flex items-center justify-center">A</div>
                      <span className="text-sm text-slate-600">Admin User</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">2 hours ago</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#17244B] transition-colors">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#17244B] transition-colors">
                        <Edit size={16} />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
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
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#17244B] flex items-center justify-center">
                  <Palette size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Content Studio</h1>
                  <p className="text-xs text-slate-500">KAYAD Enterprise CMS</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Quick search..."
                  className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none w-64"
                />
              </div>
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <Bell size={20} />
              </button>
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#17244B] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{module.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-0">
          {activeModule === 'dashboard' && renderDashboard()}
          {activeModule === 'pages' && <VisualPageBuilder />}
          {activeModule === 'landing' && <VisualPageBuilder />}
          {activeModule === 'media' && <MediaLibrary />}
          {activeModule === 'seo' && <SEOManager />}
          {activeModule === 'calendar' && <PublishingCalendar />}
          {activeModule === 'blog' && renderModuleContent()}
          {activeModule === 'news' && renderModuleContent()}
          {activeModule === 'knowledge' && renderModuleContent()}
          {activeModule === 'help' && renderModuleContent()}
          {activeModule === 'faq' && renderModuleContent()}
          {activeModule === 'announcements' && renderModuleContent()}
          {activeModule === 'campaigns' && renderModuleContent()}
          {activeModule === 'promotions' && renderModuleContent()}
          {activeModule === 'banners' && renderModuleContent()}
          {activeModule === 'widgets' && renderModuleContent()}
          {activeModule === 'abtests' && renderModuleContent()}
          {activeModule === 'analytics' && renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
