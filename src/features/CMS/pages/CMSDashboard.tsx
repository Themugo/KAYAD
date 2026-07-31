// ============================================================
// KAYAD WEBSITE BUILDER / CMS
// CMS DASHBOARD - Website Management Interface
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
  Footprints,
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
  { id: 1, name: 'Homepage', slug: '/', status: 'published', sections: 8 },
  { id: 2, name: 'Marketplace', slug: '/marketplace', status: 'published', sections: 5 },
  { id: 3, name: 'Auction', slug: '/auction', status: 'published', sections: 4 },
  { id: 4, name: 'About Us', slug: '/about', status: 'draft', sections: 3 },
];

const SECTIONS = [
  { type: 'hero', name: 'Hero Section', icon: '🎯' },
  { type: 'featured_cars', name: 'Featured Cars', icon: '🚗' },
  { type: 'search', name: 'Search Bar', icon: '🔍' },
  { type: 'banner', name: 'Banner', icon: '📢' },
  { type: 'stats', name: 'Statistics', icon: '📊' },
  { type: 'partners', name: 'Partners', icon: '🤝' },
  { type: 'testimonials', name: 'Testimonials', icon: '💬' },
  { type: 'faq', name: 'FAQ', icon: '❓' },
  { type: 'cta', name: 'Call to Action', icon: '📞' },
  { type: 'footer', name: 'Footer', icon: '📋' },
];

const NAV_ITEMS = [
  { label: 'Buy', url: '/marketplace', type: 'link' },
  { label: 'Sell', url: '/sell', type: 'link' },
  { label: 'Auction', url: '/auction', type: 'link' },
  { label: 'Finance', url: '/finance', type: 'dropdown', children: [
    { label: 'Get Loan', url: '/finance/loan' },
    { label: 'Insurance', url: '/finance/insurance' },
  ]},
  { label: 'Inspect', url: '/inspection', type: 'link' },
  { label: 'Dealers', url: '/dealers', type: 'link' },
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

export default function CMSDashboard() {
  const [activeTab, setActiveTab] = useState<'pages' | 'navigation' | 'theme' | 'carcards' | 'seo' | 'popups'>('pages');
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);

  const tabs = [
    { id: 'pages', label: 'Pages', icon: <Layout size={18} /> },
    { id: 'navigation', label: 'Navigation', icon: <Menu size={18} /> },
    { id: 'theme', label: 'Theme', icon: <Palette size={18} /> },
    { id: 'carcards', label: 'Car Cards', icon: <Grid size={18} /> },
    { id: 'seo', label: 'SEO', icon: <FileText size={18} /> },
    { id: 'popups', label: 'Popups', icon: <Zap size={18} /> },
  ];

  const handleDragStart = (index: number) => {
    setDragItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDrop = () => {
    // Reorder logic would go here
    setDragItem(null);
    setDragOverItem(null);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Settings size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Website Manager</h1>
                <p className="text-sm opacity-80">Dynamic Frontend CMS</p>
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

        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Page List */}
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
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedPage?.id === page.id ? 'border-2' : ''
                    }`}
                    style={{
                      backgroundColor: selectedPage?.id === page.id ? `${KAYAD_COLORS.purple}10` : KAYAD_COLORS.warmBeige,
                      borderColor: selectedPage?.id === page.id ? KAYAD_COLORS.purple : 'transparent',
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{page.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        page.status === 'published' ? 'text-green-600' : 'text-amber-600'
                      }`} style={{
                        backgroundColor: page.status === 'published' ? '#dcfce7' : '#fef3c7',
                      }}>
                        {page.status}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>{page.slug}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Page Editor */}
            <div className="lg:col-span-2 rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              {selectedPage ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                        Editing: {selectedPage.name}
                      </h3>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {selectedPage.sections} sections • Drag to reorder
                      </p>
                    </div>
                    <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                      Publish
                    </button>
                  </div>

                  {/* Sections */}
                  <div className="space-y-3">
                    {SECTIONS.slice(0, selectedPage.sections || 5).map((section, index) => (
                      <motion.div
                        key={section.type}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={handleDrop}
                        className={`p-4 rounded-lg border-2 cursor-move ${
                          dragOverItem === index ? 'border-dashed' : ''
                        }`}
                        style={{
                          backgroundColor: KAYAD_COLORS.warmBeige,
                          borderColor: dragItem === index ? KAYAD_COLORS.purple : KAYAD_COLORS.warmBeige,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                            <span className="text-2xl">{section.icon}</span>
                            <div>
                              <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{section.name}</p>
                              <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Type: {section.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.white }}>
                              <Edit3 size={16} style={{ color: KAYAD_COLORS.softBlue }} />
                            </button>
                            <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.white }}>
                              <Copy size={16} style={{ color: KAYAD_COLORS.softBlue }} />
                            </button>
                            <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.white }}>
                              <EyeOff size={16} style={{ color: KAYAD_COLORS.softBlue }} />
                            </button>
                            <button className="p-2 rounded-lg" style={{ backgroundColor: '#fee2e2' }}>
                              <Trash2 size={16} style={{ color: KAYAD_COLORS.red }} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Add Section */}
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
              <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Navigation Builder</h3>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <Plus size={16} />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {NAV_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                      <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{item.label}</span>
                      <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
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
                    <div
                      className="w-full h-16 rounded-lg mb-2"
                      style={{ backgroundColor: color }}
                    />
                    <p className="text-sm capitalize" style={{ color: KAYAD_COLORS.lightNavy }}>{name}</p>
                    <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{color}</p>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.lightNavy, color: KAYAD_COLORS.white }}>
                Edit Colors
              </button>
            </div>

            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Typography</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Heading Font</label>
                  <select className="w-full p-2 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <option>Inter</option>
                    <option>Poppins</option>
                    <option>Playfair Display</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Body Font</label>
                  <select className="w-full p-2 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <option>Inter</option>
                    <option>Open Sans</option>
                    <option>Roboto</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Car Cards Tab */}
        {activeTab === 'carcards' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Car Card Fields</h3>
            <p className="text-sm mb-6" style={{ color: KAYAD_COLORS.softBlue }}>
              Choose which fields to display on vehicle cards
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CAR_CARD_FIELDS.map((field) => (
                <label key={field.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <input type="checkbox" defaultChecked={field.checked} className="w-5 h-5 rounded" />
                  <span style={{ color: KAYAD_COLORS.lightNavy }}>{field.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
              <h4 className="font-medium mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Layout Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Columns (Desktop)</label>
                  <select className="w-full p-2 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <option>3</option>
                    <option>4</option>
                    <option>5</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Card Style</label>
                  <select className="w-full p-2 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <option>Default</option>
                    <option>Compact</option>
                    <option>Premium</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Pagination</label>
                  <select className="w-full p-2 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <option>Numbered</option>
                    <option>Load More</option>
                    <option>Infinite Scroll</option>
                  </select>
                </div>
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
                <label className="text-sm mb-2 block" style={{ color: KAYAD_COLORS.softBlue }}>Site Name</label>
                <input type="text" defaultValue="KAYAD" className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
              <div>
                <label className="text-sm mb-2 block" style={{ color: KAYAD_COLORS.softBlue }}>Default Meta Title</label>
                <input type="text" defaultValue="KAYAD - Africa's Smartest Automotive Platform" className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
              <div>
                <label className="text-sm mb-2 block" style={{ color: KAYAD_COLORS.softBlue }}>Default Meta Description</label>
                <textarea rows={3} defaultValue="Buy, sell, auction and finance vehicles with confidence on East Africa's most trusted automotive platform." className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
              <div>
                <label className="text-sm mb-2 block" style={{ color: KAYAD_COLORS.softBlue }}>Google Analytics ID</label>
                <input type="text" placeholder="GA-XXXXXXXXX" className="w-full p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }} />
              </div>
            </div>
          </div>
        )}

        {/* Popups Tab */}
        {activeTab === 'popups' && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Popup Manager</h3>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <Plus size={16} />
                Create Popup
              </button>
            </div>
            <div className="text-center py-12" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
              <Zap size={48} style={{ color: KAYAD_COLORS.softBlue }} className="mx-auto mb-4" />
              <p style={{ color: KAYAD_COLORS.softBlue }}>No popups configured yet</p>
              <p className="text-sm mt-2" style={{ color: KAYAD_COLORS.softBlue }}>Create announcements, offers, or notifications</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
