// ============================================================
// KAYAD ENTERPRISE CONTENT STUDIO
// DIGITAL PUBLISHING PLATFORM DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  PenTool,
  Globe,
  Book,
  HelpCircle,
  Megaphone,
  Image,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Check,
  Clock,
  Send,
  X,
  ChevronRight,
  TrendingUp,
  Users,
  Zap,
  Home,
  Layers,
  Star,
  Archive,
  RefreshCw,
  Shield,
  CheckCircle,
  AlertCircle,
  Bell,
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
const ARTICLES = [
  { id: 1, title: 'Top 10 SUVs for Kenya Roads in 2026', status: 'published', author: 'Marketing Team', views: 12500, date: '2026-07-28', category: 'Buyers Guide' },
  { id: 2, title: 'How to Finance Your Dream Car', status: 'review', author: 'Content Team', views: 0, date: '2026-07-29', category: 'Finance' },
  { id: 3, title: 'KAYAD Auction Week Preview', status: 'scheduled', author: 'Marketing Team', views: 0, date: '2026-08-01', category: 'Auctions' },
  { id: 4, title: 'Understanding Vehicle Inspection Reports', status: 'draft', author: 'Content Team', views: 0, date: '2026-07-30', category: 'Education' },
  { id: 5, title: 'Best Time to Buy a Used Car', status: 'published', author: 'Editorial', views: 8900, date: '2026-07-25', category: 'Buyers Guide' },
];

const FAQs = [
  { id: 1, question: 'How do I list my car for sale?', category: 'Selling', status: 'published', helpful: 245 },
  { id: 2, question: 'What documents do I need for inspection?', category: 'Inspection', status: 'published', helpful: 189 },
  { id: 3, question: 'How does KAYAD Finance work?', category: 'Finance', status: 'published', helpful: 156 },
  { id: 4, question: 'Is my payment secure?', category: 'Security', status: 'published', helpful: 312 },
];

const CAMPAIGNS = [
  { id: 1, name: 'Auction Week 2026', type: 'auction', status: 'active', impressions: 45000, conversions: 234 },
  { id: 2, name: 'Bank Holiday Sale', type: 'discount', status: 'scheduled', impressions: 0, conversions: 0 },
  { id: 3, name: 'Toyota Festival', type: 'brand', status: 'draft', impressions: 0, conversions: 0 },
];

const LANDING_PAGES = [
  { id: 1, name: 'Dealer Recruitment', slug: '/dealers/join', status: 'published', views: 3500, conversions: 45 },
  { id: 2, name: 'Auction Week 2026', slug: '/auction-week', status: 'published', views: 8900, conversions: 156 },
  { id: 3, name: 'Bank Promotion', slug: '/bank-promo', status: 'draft', views: 0, conversions: 0 },
];

const BANNERS = [
  { id: 1, name: 'Auction Week Hero', type: 'hero', status: 'active', impressions: 125000, clicks: 4500 },
  { id: 2, name: 'Finance Banner', type: 'banner', status: 'active', impressions: 89000, clicks: 2100 },
];

const CONTENT_BLOCKS = [
  { type: 'hero', name: 'Hero Section', count: 12 },
  { type: 'heading', name: 'Heading', count: 45 },
  { type: 'image', name: 'Image', count: 89 },
  { type: 'video', name: 'Video', count: 23 },
  { type: 'stats', name: 'Statistics', count: 8 },
  { type: 'testimonial', name: 'Testimonial', count: 34 },
  { type: 'faq', name: 'FAQ', count: 15 },
  { type: 'newsletter', name: 'Newsletter', count: 6 },
];

const BLOCK_TYPES = [
  { type: 'hero', name: 'Hero Section', icon: '🎯' },
  { type: 'heading', name: 'Heading', icon: '📝' },
  { type: 'paragraph', name: 'Paragraph', icon: '📄' },
  { type: 'button', name: 'Button', icon: '🔘' },
  { type: 'image', name: 'Image', icon: '🖼️' },
  { type: 'video', name: 'Video', icon: '🎬' },
  { type: 'gallery', name: 'Gallery', icon: '📷' },
  { type: 'vehicle_carousel', name: 'Vehicle Carousel', icon: '🚗' },
  { type: 'dealer_carousel', name: 'Dealer Carousel', icon: '🏢' },
  { type: 'stats', name: 'Statistics', icon: '📊' },
  { type: 'testimonial', name: 'Testimonial', icon: '💬' },
  { type: 'faq', name: 'FAQ', icon: '❓' },
  { type: 'pricing', name: 'Pricing Table', icon: '💰' },
  { type: 'countdown', name: 'Countdown', icon: '⏰' },
  { type: 'newsletter', name: 'Newsletter', icon: '✉️' },
  { type: 'html', name: 'HTML Block', icon: '📄' },
];

export default function ContentStudioDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'articles' | 'faqs' | 'landing' | 'campaigns' | 'banners' | 'blocks' | 'calendar' | 'media' | 'analytics'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { id: 'articles', label: 'Articles', icon: <FileText size={18} /> },
    { id: 'faqs', label: 'FAQs', icon: <HelpCircle size={18} /> },
    { id: 'landing', label: 'Landing Pages', icon: <Globe size={18} /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Megaphone size={18} /> },
    { id: 'banners', label: 'Banners', icon: <Image size={18} /> },
    { id: 'blocks', label: 'Content Blocks', icon: <Layers size={18} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
    { id: 'media', label: 'Media', icon: <Image size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
      case 'active':
        return KAYAD_COLORS.emerald;
      case 'review':
      case 'scheduled':
        return KAYAD_COLORS.amber;
      case 'draft':
      case 'inactive':
        return KAYAD_COLORS.softBlue;
      case 'rejected':
        return KAYAD_COLORS.red;
      default:
        return KAYAD_COLORS.softBlue;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
      case 'active':
        return <CheckCircle size={14} />;
      case 'review':
        return <Eye size={14} />;
      case 'scheduled':
        return <Clock size={14} />;
      case 'draft':
        return <Edit3 size={14} />;
      default:
        return <AlertCircle size={14} />;
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
                <PenTool size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Content Studio</h1>
                <p className="text-sm opacity-80">Digital Publishing Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: KAYAD_COLORS.softBlue }} />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg w-64"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: KAYAD_COLORS.white, border: 'none' }}
                />
              </div>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <Plus size={16} />
                Create
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
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
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

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Published Articles', value: 45, icon: <FileText size={20} />, color: KAYAD_COLORS.lightNavy },
                { label: 'Active FAQs', value: FAQs.length, icon: <HelpCircle size={20} />, color: KAYAD_COLORS.purple },
                { label: 'Running Campaigns', value: 3, icon: <Megaphone size={20} />, color: KAYAD_COLORS.emerald },
                { label: 'Total Views', value: '45.2K', icon: <TrendingUp size={20} />, color: KAYAD_COLORS.amber },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl p-4 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                  <div className="flex items-center gap-2 mb-2" style={{ color: stat.color }}>{stat.icon}<span className="text-sm">{stat.label}</span></div>
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Recent Content & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Articles</h3>
                  <button className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>View All</button>
                </div>
                <div className="space-y-3">
                  {ARTICLES.slice(0, 4).map((article) => (
                    <div key={article.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                          <FileText size={20} style={{ color: KAYAD_COLORS.purple }} />
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{article.title}</p>
                          <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{article.author} • {article.date}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: `${getStatusColor(article.status)}20`, color: getStatusColor(article.status) }}>
                        {getStatusIcon(article.status)}
                        {article.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'New Article', icon: <FileText size={20} />, color: KAYAD_COLORS.lightNavy },
                    { label: 'New FAQ', icon: <HelpCircle size={20} />, color: KAYAD_COLORS.purple },
                    { label: 'New Campaign', icon: <Megaphone size={20} />, color: KAYAD_COLORS.amber },
                    { label: 'Upload Media', icon: <Image size={20} />, color: KAYAD_COLORS.emerald },
                    { label: 'View Calendar', icon: <Calendar size={20} />, color: KAYAD_COLORS.softBlue },
                    { label: 'Analytics', icon: <BarChart3 size={20} />, color: KAYAD_COLORS.red },
                  ].map((action, i) => (
                    <button key={i} className="p-4 rounded-lg flex items-center gap-3 transition-colors" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <span style={{ color: action.color }}>{action.icon}</span>
                      <span className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Publishing Queue */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Publishing Queue</h3>
                <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${KAYAD_COLORS.amber}20`, color: KAYAD_COLORS.amber }}>3 scheduled</span>
              </div>
              <div className="space-y-3">
                {ARTICLES.filter(a => a.status === 'scheduled').map((article) => (
                  <div key={article.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-3">
                      <Clock size={18} style={{ color: KAYAD_COLORS.amber }} />
                      <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{article.title}</span>
                    </div>
                    <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Scheduled: {article.date}</span>
                  </div>
                ))}
                {ARTICLES.filter(a => a.status === 'review').map((article) => (
                  <div key={article.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-3">
                      <Eye size={18} style={{ color: KAYAD_COLORS.softBlue }} />
                      <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{article.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 rounded text-sm" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>Approve</button>
                      <button className="px-3 py-1 rounded text-sm" style={{ backgroundColor: KAYAD_COLORS.red, color: KAYAD_COLORS.white }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    placeholder="Search articles..."
                    className="px-4 py-2 rounded-lg border"
                    style={{ borderColor: KAYAD_COLORS.warmBeige }}
                  />
                  <select className="px-4 py-2 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <option>All Status</option>
                    <option>Published</option>
                    <option>Draft</option>
                    <option>Review</option>
                    <option>Scheduled</option>
                  </select>
                </div>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <Plus size={16} />
                  New Article
                </button>
              </div>

              <div className="space-y-3">
                {ARTICLES.map((article) => (
                  <div key={article.id} className="flex items-center justify-between p-4 rounded-lg border-2" style={{ backgroundColor: KAYAD_COLORS.white, borderColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                        <FileText size={24} style={{ color: KAYAD_COLORS.purple }} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{article.title}</p>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{article.category} • {article.author} • {article.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {article.status === 'published' && (
                        <div className="text-right">
                          <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{article.views.toLocaleString()} views</p>
                          <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Published</p>
                        </div>
                      )}
                      <span className="px-3 py-1 rounded-full text-sm font-medium capitalize" style={{ backgroundColor: `${getStatusColor(article.status)}20`, color: getStatusColor(article.status) }}>
                        {article.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}><Eye size={16} style={{ color: KAYAD_COLORS.softBlue }} /></button>
                        <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}><Edit3 size={16} style={{ color: KAYAD_COLORS.softBlue }} /></button>
                        <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}><MoreVertical size={16} style={{ color: KAYAD_COLORS.softBlue }} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FAQs Tab */}
        {activeTab === 'faqs' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>FAQ Manager</h3>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <Plus size={16} />
                  New FAQ
                </button>
              </div>
              <div className="space-y-3">
                {FAQs.map((faq) => (
                  <div key={faq.id} className="p-4 rounded-lg border-2" style={{ backgroundColor: KAYAD_COLORS.white, borderColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{faq.question}</p>
                        <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>Category: {faq.category}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{faq.helpful} helpful</span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${getStatusColor(faq.status)}20`, color: getStatusColor(faq.status) }}>
                          {faq.status}
                        </span>
                        <div className="flex items-center gap-2">
                          <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}><Edit3 size={16} /></button>
                          <button className="p-2 rounded-lg" style={{ backgroundColor: '#fee2e2' }}><Trash2 size={16} style={{ color: KAYAD_COLORS.red }} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Landing Pages Tab */}
        {activeTab === 'landing' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Landing Pages</h3>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <Plus size={16} />
                  Create Landing Page
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LANDING_PAGES.map((page) => (
                  <div key={page.id} className="p-4 rounded-lg border-2" style={{ backgroundColor: KAYAD_COLORS.white, borderColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{page.name}</p>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{page.slug}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: `${getStatusColor(page.status)}20`, color: getStatusColor(page.status) }}>
                        {page.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span style={{ color: KAYAD_COLORS.softBlue }}>{page.views.toLocaleString()} views</span>
                        <span style={{ color: KAYAD_COLORS.softBlue }}>{page.conversions} conversions</span>
                      </div>
                      <button className="px-3 py-1 rounded text-sm" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Campaign Manager</h3>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <Plus size={16} />
                  New Campaign
                </button>
              </div>
              <div className="space-y-3">
                {CAMPAIGNS.map((campaign) => (
                  <div key={campaign.id} className="p-4 rounded-lg border-2" style={{ backgroundColor: KAYAD_COLORS.white, borderColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.amber}20` }}>
                          <Megaphone size={24} style={{ color: KAYAD_COLORS.amber }} />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{campaign.name}</p>
                          <p className="text-sm capitalize" style={{ color: KAYAD_COLORS.softBlue }}>Type: {campaign.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{campaign.impressions.toLocaleString()}</p>
                          <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>impressions</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium" style={{ color: KAYAD_COLORS.emerald }}>{campaign.conversions}</p>
                          <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>conversions</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: `${getStatusColor(campaign.status)}20`, color: getStatusColor(campaign.status) }}>
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Banners Tab */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Banner Manager</h3>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <Plus size={16} />
                  New Banner
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BANNERS.map((banner) => (
                  <div key={banner.id} className="p-4 rounded-lg border-2" style={{ backgroundColor: KAYAD_COLORS.white, borderColor: KAYAD_COLORS.warmBeige }}>
                    <div className="h-32 rounded-lg mb-3 flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <span style={{ color: KAYAD_COLORS.softBlue }}>Banner Preview</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{banner.name}</p>
                        <p className="text-sm capitalize" style={{ color: KAYAD_COLORS.softBlue }}>Type: {banner.type}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${getStatusColor(banner.status)}20`, color: getStatusColor(banner.status) }}>
                        {banner.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Blocks Tab */}
        {activeTab === 'blocks' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Content Blocks</h3>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <Plus size={16} />
                  Create Block
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {BLOCK_TYPES.map((block) => (
                  <div key={block.type} className="p-4 rounded-lg text-center cursor-pointer transition-transform hover:scale-105" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <span className="text-3xl mb-2 block">{block.icon}</span>
                    <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{block.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Publishing Calendar</h3>
            <div className="h-96 flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
              <p style={{ color: KAYAD_COLORS.softBlue }}>Calendar view coming soon</p>
            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Media Library</h3>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <Plus size={16} />
                Upload
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-square rounded-lg flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <Image size={32} style={{ color: KAYAD_COLORS.softBlue }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Content Performance</h3>
              <div className="h-64 flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                <p style={{ color: KAYAD_COLORS.softBlue }}>Analytics charts coming soon</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
