// ============================================================
// KAYAD WEBSITE BUILDER / CMS
// ENHANCED CMS DASHBOARD - Complete Website Builder Platform
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layout,
  FileText,
  Palette,
  Grid,
  Image,
  Menu,
  Settings,
  Eye,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Edit3,
  Copy,
  EyeOff,
  Clock,
  Zap,
  Globe,
  Home,
  Sliders,
  Layers,
  Bell,
  Search,
  Users,
  BarChart3,
  History,
  RotateCcw,
  Shield,
  CheckCircle,
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
const PAGES = [
  { id: 1, name: 'Homepage', slug: '/', status: 'published', sections: 8, lastEdited: '2026-07-30' },
  { id: 2, name: 'Marketplace', slug: '/marketplace', status: 'published', sections: 5, lastEdited: '2026-07-29' },
  { id: 3, name: 'Auction', slug: '/auction', status: 'published', sections: 4, lastEdited: '2026-07-28' },
  { id: 4, name: 'About Us', slug: '/about', status: 'draft', sections: 3, lastEdited: '2026-07-27' },
  { id: 5, name: 'Contact', slug: '/contact', status: 'published', sections: 2, lastEdited: '2026-07-25' },
  { id: 6, name: 'FAQ', slug: '/faq', status: 'published', sections: 1, lastEdited: '2026-07-24' },
];

const SECTION_TYPES = [
  { type: 'hero', name: 'Hero Section', icon: '🎯', category: 'Layout' },
  { type: 'featured_cars', name: 'Featured Cars', icon: '🚗', category: 'Content' },
  { type: 'search', name: 'Search Bar', icon: '🔍', category: 'Interactive' },
  { type: 'banner', name: 'Banner', icon: '📢', category: 'Marketing' },
  { type: 'stats', name: 'Statistics', icon: '📊', category: 'Content' },
  { type: 'partners', name: 'Partners', icon: '🤝', category: 'Content' },
  { type: 'testimonials', name: 'Testimonials', icon: '💬', category: 'Content' },
  { type: 'faq', name: 'FAQ', icon: '❓', category: 'Interactive' },
  { type: 'cta', name: 'Call to Action', icon: '📞', category: 'Marketing' },
  { type: 'auction', name: 'Auction Grid', icon: '🔨', category: 'Content' },
  { type: 'dealer_spotlight', name: 'Dealer Spotlight', icon: '⭐', category: 'Content' },
  { type: 'financing', name: 'Financing', icon: '💰', category: 'Services' },
  { type: 'brands', name: 'Brand Logos', icon: '🏢', category: 'Content' },
  { type: 'blog', name: 'Blog Preview', icon: '📝', category: 'Content' },
  { type: 'newsletter', name: 'Newsletter', icon: '✉️', category: 'Interactive' },
  { type: 'footer', name: 'Footer', icon: '📋', category: 'Layout' },
];

const NAV_ITEMS = [
  { label: 'Buy', url: '/marketplace', type: 'link', badge: null, visible: true },
  { label: 'Sell', url: '/sell', type: 'link', badge: null, visible: true },
  { label: 'Auction', url: '/auction', type: 'link', badge: 'LIVE', visible: true },
  { label: 'Finance', url: '/finance', type: 'dropdown', badge: null, children: [
    { label: 'Get Loan', url: '/finance/loan' },
    { label: 'Insurance', url: '/finance/insurance' },
  ], visible: true },
  { label: 'Inspect', url: '/inspection', type: 'link', badge: null, visible: true },
  { label: 'Dealers', url: '/dealers', type: 'link', badge: 'NEW', visible: true },
];

const CAR_CARD_FIELDS = [
  { id: 'photo', label: 'Photo', checked: true },
  { id: 'price', label: 'Price', checked: true },
  { id: 'title', label: 'Title', checked: true },
  { id: 'location', label: 'Location', checked: true },
  { id: 'mileage', label: 'Mileage', checked: true },
  { id: 'transmission', label: 'Transmission', checked: true },
  { id: 'fuel', label: 'Fuel Type', checked: true },
  { id: 'year', label: 'Year', checked: true },
  { id: 'dealer', label: 'Dealer', checked: true },
  { id: 'inspection', label: 'Inspection Badge', checked: true },
  { id: 'finance', label: 'Finance Badge', checked: true },
  { id: 'escrow', label: 'Escrow Badge', checked: true },
  { id: 'wishlist', label: 'Wishlist', checked: true },
  { id: 'compare', label: 'Compare', checked: true },
];

const THEME_COLORS = {
  primary: '#1e3a5f',
  secondary: '#64748b',
  accent: '#c4a484',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f5f0e8',
  surface: '#ffffff',
};

const PROMOTIONS = [
  { name: 'Weekend Sale', status: 'active', impressions: 12500, clicks: 890 },
  { name: 'Auction Week', status: 'scheduled', impressions: 0, clicks: 0 },
  { name: 'Toyota Festival', status: 'draft', impressions: 0, clicks: 0 },
];

const VERSION_HISTORY = [
  { version: 3, editedBy: 'Marketing Admin', date: '2026-07-30', summary: 'Updated hero headline' },
  { version: 2, editedBy: 'Content Team', date: '2026-07-29', summary: 'Added featured cars section' },
  { version: 1, editedBy: 'Admin', date: '2026-07-27', summary: 'Initial homepage creation' },
];

const AUDIT_LOG = [
  { action: 'Published', user: 'Marketing Admin', content: 'Homepage', time: '10 min ago' },
  { action: 'Edited', user: 'Content Team', content: 'Hero Section', time: '1 hour ago' },
  { action: 'Created', user: 'Admin', content: 'FAQ Page', time: '2 hours ago' },
];

export default function CMSDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pages' | 'navigation' | 'theme' | 'carcards' | 'promotions' | 'settings' | 'seo' | 'history' | 'audit'>('dashboard');
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { id: 'pages', label: 'Pages', icon: <Layout size={18} /> },
    { id: 'navigation', label: 'Navigation', icon: <Menu size={18} /> },
    { id: 'theme', label: 'Theme', icon: <Palette size={18} /> },
    { id: 'carcards', label: 'Car Cards', icon: <Grid size={18} /> },
    { id: 'promotions', label: 'Promotions', icon: <Zap size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Sliders size={18} /> },
    { id: 'seo', label: 'SEO', icon: <Search size={18} /> },
    { id: 'history', label: 'History', icon: <History size={18} /> },
    { id: 'audit', label: 'Audit Log', icon: <Shield size={18} /> },
  ];

  const handleDragStart = (index: number) => {
    setDragItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDrop = () => {
    setDragItem(null);
    setDragOverItem(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
      case 'active':
        return KAYAD_COLORS.emerald;
      case 'draft':
      case 'scheduled':
        return KAYAD_COLORS.amber;
      case 'archived':
      case 'inactive':
        return KAYAD_COLORS.softBlue;
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
                <Globe size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Website Builder</h1>
                <p className="text-sm opacity-80">Complete CMS Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Device Preview */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className="p-2 rounded"
                  style={{ backgroundColor: previewDevice === 'desktop' ? KAYAD_COLORS.white : 'transparent' }}
                >
                  <Monitor size={18} color={previewDevice === 'desktop' ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white} />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className="p-2 rounded"
                  style={{ backgroundColor: previewDevice === 'tablet' ? KAYAD_COLORS.white : 'transparent' }}
                >
                  <Tablet size={18} color={previewDevice === 'tablet' ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white} />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className="p-2 rounded"
                  style={{ backgroundColor: previewDevice === 'mobile' ? KAYAD_COLORS.white : 'transparent' }}
                >
                  <Smartphone size={18} color={previewDevice === 'mobile' ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white} />
                </button>
              </div>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <Eye size={16} />
                Preview
              </button>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                <Save size={16} />
                Save Changes
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
                { label: 'Published Pages', value: PAGES.filter(p => p.status === 'published').length, icon: <CheckCircle size={20} /> },
                { label: 'Draft Pages', value: PAGES.filter(p => p.status === 'draft').length, icon: <Edit3 size={20} /> },
                { label: 'Active Promotions', value: PROMOTIONS.filter(p => p.status === 'active').length, icon: <Zap size={20} /> },
                { label: 'Total Sections', value: SECTION_TYPES.length, icon: <Layers size={20} /> },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl p-4 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                  <div className="flex items-center gap-2 mb-2" style={{ color: KAYAD_COLORS.softBlue }}>{stat.icon}<span className="text-sm">{stat.label}</span></div>
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Activity</h3>
                <div className="space-y-3">
                  {AUDIT_LOG.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{log.action}: {log.content}</p>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>by {log.user}</p>
                      </div>
                      <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Edit Homepage', icon: <Home size={20} />, color: KAYAD_COLORS.lightNavy },
                    { label: 'Manage Nav', icon: <Menu size={20} />, color: KAYAD_COLORS.purple },
                    { label: 'Add Promotion', icon: <Zap size={20} />, color: KAYAD_COLORS.amber },
                    { label: 'View Analytics', icon: <BarChart3 size={20} />, color: KAYAD_COLORS.emerald },
                  ].map((action, i) => (
                    <button key={i} className="p-4 rounded-lg flex items-center gap-3 transition-colors" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <span style={{ color: action.color }}>{action.icon}</span>
                      <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Pages</h3>
                <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <Plus size={18} style={{ color: KAYAD_COLORS.lightNavy }} />
                </button>
              </div>
              <div className="space-y-2">
                {PAGES.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => setSelectedPage(page)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedPage?.id === page.id ? 'border-2' : ''}`}
                    style={{
                      backgroundColor: selectedPage?.id === page.id ? `${KAYAD_COLORS.purple}10` : KAYAD_COLORS.warmBeige,
                      borderColor: selectedPage?.id === page.id ? KAYAD_COLORS.purple : 'transparent',
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{page.name}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${getStatusColor(page.status)}20`, color: getStatusColor(page.status) }}>
                        {page.status}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{page.slug}</p>
                      <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{page.sections} sections</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              {selectedPage ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Editing: {selectedPage.name}</h3>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Drag to reorder sections</p>
                    </div>
                    <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                      Publish
                    </button>
                  </div>

                  <div className="space-y-3">
                    {SECTION_TYPES.slice(0, selectedPage.sections || 5).map((section, index) => (
                      <motion.div
                        key={section.type}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={handleDrop}
                        className={`p-4 rounded-lg border-2 cursor-move ${dragOverItem === index ? 'border-dashed' : ''}`}
                        style={{ backgroundColor: KAYAD_COLORS.warmBeige, borderColor: dragItem === index ? KAYAD_COLORS.purple : KAYAD_COLORS.warmBeige }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                            <span className="text-2xl">{section.icon}</span>
                            <div>
                              <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{section.name}</p>
                              <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{section.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.white }}><Edit3 size={16} style={{ color: KAYAD_COLORS.softBlue }} /></button>
                            <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.white }}><Copy size={16} style={{ color: KAYAD_COLORS.softBlue }} /></button>
                            <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.white }}><EyeOff size={16} style={{ color: KAYAD_COLORS.softBlue }} /></button>
                            <button className="p-2 rounded-lg" style={{ backgroundColor: '#fee2e2' }}><Trash2 size={16} style={{ color: KAYAD_COLORS.red }} /></button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 rounded-lg border-2 border-dashed" style={{ borderColor: KAYAD_COLORS.softBlue }}>
                    <div className="flex items-center justify-center gap-2" style={{ color: KAYAD_COLORS.softBlue }}>
                      <Plus size={20} />
                      <span>Add Section</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Layout size={48} style={{ color: KAYAD_COLORS.softBlue }} className="mx-auto mb-4" />
                  <p style={{ color: KAYAD_COLORS.softBlue }}>Select a page to edit</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tab */}
        {activeTab === 'navigation' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Navigation Builder</h3>
                <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Drag to reorder • Click to edit</p>
              </div>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <Plus size={16} />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {NAV_ITEMS.map((item, index) => (
                <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                      <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: KAYAD_COLORS.amber, color: KAYAD_COLORS.white }}>
                          {item.badge}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked={item.visible} className="w-4 h-4" />
                      </label>
                      <button className="p-1.5 rounded"><Edit3 size={16} style={{ color: KAYAD_COLORS.softBlue }} /></button>
                      <button className="p-1.5 rounded"><Trash2 size={16} style={{ color: KAYAD_COLORS.red }} /></button>
                    </div>
                  </div>
                  {item.children && (
                    <div className="ml-8 mt-2 space-y-1">
                      {item.children.map((child, cIndex) => (
                        <div key={cIndex} className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: KAYAD_COLORS.white }}>
                          <span style={{ color: KAYAD_COLORS.lightNavy }}>{child.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Theme Tab */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Color Palette</h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(THEME_COLORS).map(([name, color]) => (
                  <div key={name} className="text-center">
                    <div className="w-full h-16 rounded-lg mb-2 cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: color }} />
                    <p className="text-sm capitalize" style={{ color: KAYAD_COLORS.lightNavy }}>{name}</p>
                    <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{color}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Typography</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Heading Font</label>
                  <select className="w-full p-2 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <option>Inter</option><option>Poppins</option><option>Playfair Display</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Body Font</label>
                  <select className="w-full p-2 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <option>Inter</option><option>Open Sans</option><option>Roboto</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Border Radius</label>
                  <select className="w-full p-2 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <option>None</option><option>Small</option><option>Medium</option><option>Large</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Car Cards Tab */}
        {activeTab === 'carcards' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Car Card Configuration</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CAR_CARD_FIELDS.map((field) => (
                <label key={field.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <input type="checkbox" defaultChecked={field.checked} className="w-5 h-5" />
                  <span style={{ color: KAYAD_COLORS.lightNavy }}>{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Promotions Tab */}
        {activeTab === 'promotions' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Promotion Engine</h3>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <Plus size={16} />
                Create Promotion
              </button>
            </div>
            <div className="space-y-4">
              {PROMOTIONS.map((promo, i) => (
                <div key={i} className="p-4 rounded-lg border-2" style={{ backgroundColor: KAYAD_COLORS.warmBeige, borderColor: 'transparent' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{promo.name}</p>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {promo.impressions.toLocaleString()} impressions • {promo.clicks.toLocaleString()} clicks
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium capitalize" style={{ backgroundColor: `${getStatusColor(promo.status)}20`, color: getStatusColor(promo.status) }}>
                      {promo.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h3 className="font-semibold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>Global Website Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Website Name</label>
                <input type="text" defaultValue="KAYAD" className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
              <div>
                <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Website Tagline</label>
                <input type="text" defaultValue="Africa's Smartest Automotive Platform" className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
              <div>
                <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Logo URL</label>
                <input type="text" placeholder="https://..." className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
              <div>
                <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Container Width</label>
                <select className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                  <option>1280px</option><option>1440px</option><option>1920px</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>SEO Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm mb-2 block" style={{ color: KAYAD_COLORS.softBlue }}>Default Meta Title</label>
                <input type="text" defaultValue="KAYAD - Africa's Smartest Automotive Platform" className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
              <div>
                <label className="text-sm mb-2 block" style={{ color: KAYAD_COLORS.softBlue }}>Default Meta Description</label>
                <textarea rows={3} defaultValue="Buy, sell, auction and finance vehicles..." className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
              <div>
                <label className="text-sm mb-2 block" style={{ color: KAYAD_COLORS.softBlue }}>Google Analytics ID</label>
                <input type="text" placeholder="GA-XXXXXXXXX" className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h3 className="font-semibold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>Version History</h3>
            <div className="space-y-4">
              {VERSION_HISTORY.map((version, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: KAYAD_COLORS.purple, color: KAYAD_COLORS.white }}>
                        v{version.version}
                      </span>
                      <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{version.summary}</p>
                    </div>
                    <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>by {version.editedBy} • {version.date}</p>
                  </div>
                  <button className="px-3 py-1 rounded-lg flex items-center gap-1" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                    <RotateCcw size={14} />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h3 className="font-semibold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>Audit Log</h3>
            <div className="space-y-3">
              {AUDIT_LOG.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                      <Users size={16} style={{ color: KAYAD_COLORS.purple }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{log.user}</p>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{log.action} {log.content}</p>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
