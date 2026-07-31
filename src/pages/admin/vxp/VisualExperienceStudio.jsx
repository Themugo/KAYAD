import React, { useState, useEffect } from 'react';
import {
  Box, Layout, Palette, Grid3X3, Layers, FileText, Monitor, Smartphone,
  Tablet, Paintbrush, MousePointer, Move, Copy, Trash2, Plus, Search, Filter,
  Edit, Save, Eye, Settings, ChevronRight, ChevronDown, ChevronLeft, Check,
  X, GripVertical, Save as SaveIcon, Download, Upload, RefreshCw, Wand2,
  Globe, LayoutTemplate, Layers3, Palette as PaletteIcon, Box as BoxIcon,
  Type, Image, Link, File, Video, Table, Grid, Columns, Rows, Code, PenTool,
  Undo, Redo, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, RotateCcw, GitBranch, Clock, History, EyeOff,
  Search as SearchIcon, BarChart3, Calendar, Map, LayoutGrid, CreditCard,
  Sliders, Bell, Star, ArrowRight, Sparkles
} from 'lucide-react';
import * as vxpApi from '../../../services/vxpApi';

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

const sections = [
  { id: 'designer', label: 'Page Designer', icon: Layout, color: colors.navy },
  { id: 'theme', label: 'Theme Designer', icon: PaletteIcon, color: colors.softBlue },
  { id: 'layout', label: 'Layout Manager', icon: LayoutTemplate, color: colors.terracotta },
  { id: 'components', label: 'Component Library', icon: BoxIcon, color: colors.emerald },
  { id: 'cards', label: 'Card Designer', icon: CreditCard, color: '#8B5CF6' },
  { id: 'sections', label: 'Section Library', icon: Layers3, color: colors.mutedOrange },
  { id: 'ads', label: 'Ad Studio', icon: Bell, color: colors.softBlue },
  { id: 'templates', label: 'Templates', icon: File, color: colors.emerald },
  { id: 'versions', label: 'Version History', icon: History, color: colors.navy },
  { id: 'ai', label: 'AI Design', icon: Sparkles, color: '#EC4899' },
];

const componentLibrary = [
  { category: 'Layout', items: ['Container', 'Grid', 'Flexbox', 'Stack', 'Divider', 'Spacer'] },
  { category: 'Typography', items: ['Heading', 'Text', 'Link', 'List', 'Quote'] },
  { category: 'Media', items: ['Image', 'Video', 'Icon', 'Avatar', 'Gallery'] },
  { category: 'Navigation', items: ['Navbar', 'Menu', 'Tabs', 'Breadcrumb', 'Pagination'] },
  { category: 'Interactive', items: ['Button', 'Input', 'Select', 'Checkbox', 'Radio', 'Toggle', 'Slider', 'Search'] },
  { category: 'Display', items: ['Card', 'Badge', 'Alert', 'Tooltip', 'Modal', 'Drawer'] },
  { category: 'Data', items: ['Table', 'List', 'Timeline', 'Progress', 'Chart', 'Stat'] },
  { category: 'KAYAD', items: ['Vehicle Card', 'Dealer Card', 'Auction Card', 'Search Form', 'Map Widget', 'Finance Calc'] },
];

const sectionTemplates = [
  { id: 'hero', name: 'Hero Section', category: 'Hero', preview: '#17244B' },
  { id: 'hero_search', name: 'Hero with Search', category: 'Hero', preview: '#60A5FA' },
  { id: 'featured', name: 'Featured Cars', category: 'Cars', preview: '#10B981' },
  { id: 'latest', name: 'Latest Listings', category: 'Cars', preview: '#C77B58' },
  { id: 'dealers', name: 'Dealers Grid', category: 'Dealers', preview: '#8B5CF6' },
  { id: 'stats', name: 'Statistics', category: 'Content', preview: '#FB923C' },
  { id: 'testimonials', name: 'Testimonials', category: 'Content', preview: '#EC4899' },
  { id: 'cta', name: 'Call to Action', category: 'Marketing', preview: colors.navy },
  { id: 'newsletter', name: 'Newsletter', category: 'Marketing', preview: colors.softBlue },
  { id: 'faq', name: 'FAQ Accordion', category: 'Support', preview: colors.emerald },
  { id: 'blog', name: 'Blog Grid', category: 'Blog', preview: colors.terracotta },
  { id: 'footer', name: 'Footer', category: 'Footer', preview: '#1F2937' },
];

const cardTypes = [
  { id: 'vehicle', name: 'Vehicle Card', icon: 'car' },
  { id: 'dealer', name: 'Dealer Card', icon: 'building' },
  { id: 'auction', name: 'Auction Card', icon: 'gavel' },
  { id: 'inspection', name: 'Inspection Card', icon: 'clipboard-check' },
  { id: 'finance', name: 'Finance Card', icon: 'calculator' },
  { id: 'blog', name: 'Blog Card', icon: 'file-text' },
  { id: 'news', name: 'News Card', icon: 'newspaper' },
  { id: 'ad', name: 'Advertisement Card', icon: 'megaphone' },
];

export default function VisualExperienceStudio() {
  const [activeSection, setActiveSection] = useState('designer');
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [devicePreview, setDevicePreview] = useState('desktop');
  const [showComponentPanel, setShowComponentPanel] = useState(true);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: statsData } = await vxpApi.getVXPStats();
      setStats(statsData.data);

      const { data: pagesData } = await vxpApi.getPages();
      setPages(pagesData.data);

      const { data: themesData } = await vxpApi.getThemes();
      setThemes(themesData.data);

      const { data: cardsData } = await vxpApi.getCards();
      setCards(cardsData.data);
    } catch (error) {
      console.error('Failed to load VXP data:', error);
      // Use mock data
      setStats({
        pages: { total: 12, published: 8, draft: 4 },
        sections: { total: 156 },
        themes: { total: 5 },
        cards: { total: 24 },
        advertisements: { total: 18 },
      });
      setPages([
        { id: '1', name: 'Homepage', slug: '/', status: 'published', pageType: 'home' },
        { id: '2', name: 'Marketplace', slug: '/marketplace', status: 'published', pageType: 'listing' },
        { id: '3', name: 'Auction', slug: '/auction', status: 'published', pageType: 'auction' },
        { id: '4', name: 'Dealers', slug: '/dealers', status: 'published', pageType: 'dealer' },
        { id: '5', name: 'Inspection', slug: '/inspection', status: 'published', pageType: 'service' },
        { id: '6', name: 'Finance', slug: '/finance', status: 'draft', pageType: 'finance' },
        { id: '7', name: 'Summer Sale', slug: '/summer-sale', status: 'draft', pageType: 'campaign' },
        { id: '8', name: 'Toyota Week', slug: '/toyota-week', status: 'draft', pageType: 'campaign' },
      ]);
      setThemes([
        { id: '1', name: 'KAYAD Default', isDefault: true, colors: { primary: '#17244B', accent: '#C77B58' } },
        { id: '2', name: 'Premium Dark', colors: { primary: '#1a1a2e', accent: '#c9a227' } },
        { id: '3', name: 'Kenyan Heritage', colors: { primary: '#228B22', accent: '#8B4513' } },
      ]);
      setCards([
        { id: '1', name: 'Standard Vehicle', cardType: 'vehicle', status: 'active' },
        { id: '2', name: 'Premium Vehicle', cardType: 'vehicle', status: 'active' },
        { id: '3', name: 'Auction Item', cardType: 'auction', status: 'active' },
        { id: '4', name: 'Dealer Profile', cardType: 'dealer', status: 'active' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PAGE DESIGNER
  // ============================================

  const renderPageDesigner = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Page Designer</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewPageModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
          >
            <Plus size={18} />
            New Page
          </button>
        </div>
      </div>

      {/* Device Preview Controls */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setDevicePreview('desktop')}
              className={`p-2 rounded-lg ${devicePreview === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              <Monitor size={18} className={devicePreview === 'desktop' ? 'text-[#17244B]' : 'text-slate-500'} />
            </button>
            <button
              onClick={() => setDevicePreview('tablet')}
              className={`p-2 rounded-lg ${devicePreview === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              <Tablet size={18} className={devicePreview === 'tablet' ? 'text-[#17244B]' : 'text-slate-500'} />
            </button>
            <button
              onClick={() => setDevicePreview('mobile')}
              className={`p-2 rounded-lg ${devicePreview === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              <Smartphone size={18} className={devicePreview === 'mobile' ? 'text-[#17244B]' : 'text-slate-500'} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-slate-100 rounded-lg"><ZoomOut size={18} /></button>
            <span className="text-sm text-slate-500 w-16 text-center">100%</span>
            <button className="p-2 hover:bg-slate-100 rounded-lg"><ZoomIn size={18} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-100 rounded-lg"><Undo size={18} /></button>
          <button className="p-2 hover:bg-slate-100 rounded-lg"><Redo size={18} /></button>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${previewMode ? 'bg-[#17244B] text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
          >
            <Eye size={18} />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Component Panel */}
        {showComponentPanel && (
          <div className="w-64 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Components</h3>
            </div>
            <div className="p-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {componentLibrary.map((group) => (
                <div key={group.category}>
                  <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">{group.category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => (
                      <button
                        key={item}
                        className="p-2 text-left text-sm rounded-lg border border-slate-200 hover:border-[#17244B] hover:bg-[#17244B]/5 transition-all"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1">
          {selectedPage ? (
            <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${
              devicePreview === 'desktop' ? 'max-w-full' :
              devicePreview === 'tablet' ? 'max-w-[768px] mx-auto' :
              'max-w-[375px] mx-auto'
            }`}>
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{selectedPage.name}</h3>
                    <p className="text-sm text-slate-500">/{selectedPage.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPage.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedPage.status}
                    </span>
                    <button className="p-2 hover:bg-slate-200 rounded-lg">
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Canvas Content */}
              <div className="p-8 min-h-[600px] bg-[#F6F1E8]">
                {/* Hero Section Placeholder */}
                <div className="bg-gradient-to-r from-[#17244B] to-[#2a3a6b] rounded-xl p-12 mb-6 text-white">
                  <div className="max-w-2xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-4">Hero Section</h1>
                    <p className="text-lg opacity-80 mb-8">Click to edit this section</p>
                    <div className="flex items-center justify-center gap-4">
                      <button className="px-6 py-3 bg-white text-[#17244B] rounded-lg font-medium hover:bg-opacity-90">
                        Get Started
                      </button>
                      <button className="px-6 py-3 border-2 border-white rounded-lg font-medium hover:bg-white/10">
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section Placeholders */}
                {['Featured Cars', 'Latest Listings', 'Statistics', 'Call to Action'].map((section, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 mb-6 text-center cursor-pointer hover:border-[#17244B] transition-colors"
                    onClick={() => setSelectedElement(section)}
                  >
                    <Layers3 size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-500">{section}</p>
                    <p className="text-sm text-slate-400">Click to add or edit</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Layout size={64} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a Page to Edit</h3>
              <p className="text-slate-500 mb-6">Choose a page from the sidebar or create a new one</p>
              <div className="flex justify-center gap-4">
                {pages.slice(0, 4).map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page)}
                    className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    {page.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {selectedPage && (
          <div className="w-72 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Properties</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Page Name</label>
                <input
                  type="text"
                  value={selectedPage.name}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Slug</label>
                <input
                  type="text"
                  value={selectedPage.slug}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-600 mb-2">Spacing</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Padding</span>
                    <span className="text-sm font-mono">32px</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Margin</span>
                    <span className="text-sm font-mono">0px</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-600 mb-2">Background</h4>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded border border-slate-200" style={{ backgroundColor: colors.beige }} />
                  <input type="text" value={colors.beige} className="flex-1 px-2 py-1 text-sm rounded border border-slate-200" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // THEME DESIGNER
  // ============================================

  const renderThemeDesigner = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Theme Designer</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          New Theme
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Color Palette */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Color Palette</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { name: 'Primary', key: 'primary', value: colors.navy },
              { name: 'Accent', key: 'accent', value: colors.terracotta },
              { name: 'Background', key: 'background', value: colors.beige },
              { name: 'Surface', key: 'surface', value: colors.white },
              { name: 'Success', key: 'success', value: colors.emerald },
              { name: 'Info', key: 'info', value: colors.softBlue },
              { name: 'Warning', key: 'warning', value: colors.mutedOrange },
              { name: 'Danger', key: 'danger', value: colors.mutedCrimson },
            ].map((color) => (
              <div key={color.key}>
                <label className="block text-sm font-medium text-slate-600 mb-2">{color.name}</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                    style={{ backgroundColor: color.value }}
                  />
                  <input
                    type="text"
                    defaultValue={color.value}
                    className="flex-1 px-2 py-1 text-sm rounded border border-slate-200 font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Theme Preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Preview</h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-[#17244B] text-white rounded-lg">Primary Button</button>
            <button className="w-full px-4 py-2 border border-[#17244B] text-[#17244B] rounded-lg">Secondary</button>
            <button className="w-full px-4 py-2 bg-[#C77B58] text-white rounded-lg">Accent</button>
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm text-center">Success</div>
            <div className="p-3 bg-softBlue-100 text-softBlue-700 rounded-lg text-sm text-center">Info</div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Typography</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Heading Font</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200">
              <option>Inter</option>
              <option>Playfair Display</option>
              <option>Poppins</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Body Font</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200">
              <option>Inter</option>
              <option>Open Sans</option>
              <option>Roboto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Scale</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200">
              <option>1.25 (Major Third)</option>
              <option>1.333 (Perfect Fourth)</option>
              <option>1.5 (Perfect Fifth)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spacing & Effects */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Spacing & Effects</h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Border Radius</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200">
              <option>None (0px)</option>
              <option>Small (4px)</option>
              <option>Medium (8px)</option>
              <option>Large (12px)</option>
              <option>Full (9999px)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Shadow</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200">
              <option>None</option>
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Transitions</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200">
              <option>Fast (150ms)</option>
              <option>Normal (300ms)</option>
              <option>Slow (500ms)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Base Spacing</label>
            <select className="w-full px-3 py-2 rounded-lg border border-slate-200">
              <option>4px</option>
              <option>8px</option>
              <option>16px</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // CARD DESIGNER
  // ============================================

  const renderCardDesigner = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Card Designer</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          New Card
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Card Types */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Card Types</h3>
          <div className="space-y-2">
            {cardTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedCard(type.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  selectedCard === type.id ? 'bg-[#17244B] text-white' : 'hover:bg-slate-50'
                }`}
              >
                <CreditCard size={18} />
                <span className="text-sm font-medium">{type.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card Preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Preview</h3>
          <div className="bg-[#F6F1E8] p-6 rounded-xl">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-slate-200 to-slate-300" />
              <div className="p-4">
                <h4 className="font-bold text-slate-800 mb-1">Toyota Land Cruiser 2023</h4>
                <p className="text-sm text-slate-500 mb-2">Nairobi, Kenya</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#17244B]">KES 18,500,000</span>
                  <span className="text-xs text-slate-400">45,000 km</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Verified</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Finance</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Field Manager */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Card Fields</h3>
          <div className="space-y-2">
            {[
              { id: 'image', name: 'Image', checked: true },
              { id: 'title', name: 'Title', checked: true },
              { id: 'location', name: 'Location', checked: true },
              { id: 'price', name: 'Price', checked: true },
              { id: 'mileage', name: 'Mileage', checked: true },
              { id: 'badges', name: 'Badges', checked: true },
              { id: 'seller', name: 'Seller', checked: false },
              { id: 'rating', name: 'Rating', checked: false },
              { id: 'warranty', name: 'Warranty', checked: false },
              { id: 'buttons', name: 'Action Buttons', checked: true },
            ].map((field) => (
              <label key={field.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked={field.checked} className="rounded" />
                <span className="text-sm text-slate-700">{field.name}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-medium text-slate-600 mb-2">Layout</h4>
            <div className="grid grid-cols-2 gap-2">
              <button className="p-2 text-xs border border-[#17244B] bg-[#17244B]/5 rounded">Compact</button>
              <button className="p-2 text-xs border border-slate-200 rounded hover:bg-slate-50">Standard</button>
              <button className="p-2 text-xs border border-slate-200 rounded hover:bg-slate-50">Expanded</button>
              <button className="p-2 text-xs border border-slate-200 rounded hover:bg-slate-50">Gallery</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // SECTION LIBRARY
  // ============================================

  const renderSectionLibrary = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Section Library</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          Create Section
        </button>
      </div>

      <div className="flex gap-4">
        {['All', 'Hero', 'Cars', 'Dealers', 'Marketing', 'Content', 'Footer'].map((cat) => (
          <button
            key={cat}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              cat === 'All' ? 'bg-[#17244B] text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {sectionTemplates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-[#17244B] transition-colors cursor-pointer">
            <div className="h-32 relative" style={{ backgroundColor: template.preview }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Layers3 size={32} className="text-white/50" />
              </div>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-slate-800 text-sm">{template.name}</h4>
              <p className="text-xs text-slate-400">{template.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // AD STUDIO
  // ============================================

  const renderAdStudio = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Advertisement Studio</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
          <Plus size={18} />
          New Advertisement
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Ad Zones */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Ad Placements</h3>
          <div className="space-y-2">
            {[
              { zone: 'Homepage Hero', size: '728x90', status: 'active' },
              { zone: 'Homepage Sidebar', size: '300x250', status: 'active' },
              { zone: 'Search Results', size: '728x90', status: 'paused' },
              { zone: 'Car Details Sidebar', size: '300x600', status: 'active' },
              { zone: 'Auction Page', size: '728x90', status: 'active' },
              { zone: 'Footer Banner', size: '728x90', status: 'paused' },
              { zone: 'Popup Modal', size: '500x500', status: 'inactive' },
            ].map((ad, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{ad.zone}</p>
                  <p className="text-xs text-slate-400">{ad.size}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  ad.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  ad.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {ad.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ad Campaigns */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Active Campaigns</h3>
          <div className="space-y-3">
            {[
              { name: 'Summer Car Sale', impressions: '125,000', ctr: '2.4%', budget: 'KES 500,000' },
              { name: 'Toyota Week', impressions: '89,000', ctr: '3.1%', budget: 'KES 350,000' },
              { name: 'Auction Promo', impressions: '45,000', ctr: '1.8%', budget: 'KES 200,000' },
            ].map((campaign, i) => (
              <div key={i} className="p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-800">{campaign.name}</h4>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">Active</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Impressions</p>
                    <p className="font-medium text-slate-800">{campaign.impressions}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">CTR</p>
                    <p className="font-medium text-slate-800">{campaign.ctr}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Budget</p>
                    <p className="font-medium text-slate-800">{campaign.budget}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // AI DESIGN ASSISTANT
  // ============================================

  const renderAIDesign = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">AI Design Assistant</h2>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
            <Sparkles size={24} className="text-pink-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Describe Your Vision</h3>
            <p className="text-sm text-slate-500">AI will design layouts based on your description</p>
          </div>
        </div>

        <textarea
          className="w-full p-4 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none resize-none"
          rows={4}
          placeholder="Example: Make the homepage look more premium with larger images and less text. Create a modern navigation bar with a mega menu. Design three new hero layouts for the auction section."
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
        />

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            {['Make it premium', 'Modernize', 'Reduce spacing', 'Add animations'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setAiPrompt(suggestion)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-full hover:bg-slate-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
            <Wand2 size={18} />
            Generate Design
          </button>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: 'Hero Layout A', description: 'Full-width with video background', preview: colors.navy },
          { title: 'Hero Layout B', description: 'Split screen with image', preview: colors.terracotta },
          { title: 'Hero Layout C', description: 'Centered with gradient', preview: colors.softBlue },
        ].map((suggestion, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-[#17244B] transition-colors cursor-pointer">
            <div className="h-32 relative" style={{ backgroundColor: suggestion.preview }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Layout size={32} className="text-white/50" />
              </div>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-slate-800 text-sm">{suggestion.title}</h4>
              <p className="text-xs text-slate-400">{suggestion.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // VERSION HISTORY
  // ============================================

  const renderVersionHistory = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Version History</h2>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="space-y-4">
          {[
            { version: 'v12', date: '2 hours ago', user: 'Admin', changes: 'Updated hero section and pricing cards' },
            { version: 'v11', date: '1 day ago', user: 'Admin', changes: 'Added new statistics section' },
            { version: 'v10', date: '3 days ago', user: 'Admin', changes: 'Published summer sale campaign' },
            { version: 'v9', date: '1 week ago', user: 'Admin', changes: 'Redesigned footer layout' },
            { version: 'v8', date: '2 weeks ago', user: 'Admin', changes: 'Updated color palette' },
          ].map((v, i) => (
            <div key={i} className={`flex items-center justify-between p-4 rounded-lg ${i === 0 ? 'bg-[#17244B]/5 border border-[#17244B]/20' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-[#17244B] text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <History size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{v.version}</span>
                    {i === 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Current</span>}
                  </div>
                  <p className="text-sm text-slate-500">{v.changes}</p>
                  <p className="text-xs text-slate-400">{v.date} by {v.user}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {i !== 0 && (
                  <button className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-100">
                    Preview
                  </button>
                )}
                {i !== 0 && (
                  <button className="px-3 py-1.5 text-sm text-[#17244B] border border-[#17244B] rounded-lg hover:bg-[#17244B]/5">
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'designer': return renderPageDesigner();
      case 'theme': return renderThemeDesigner();
      case 'cards': return renderCardDesigner();
      case 'sections': return renderSectionLibrary();
      case 'ads': return renderAdStudio();
      case 'ai': return renderAIDesign();
      case 'versions': return renderVersionHistory();
      default: return renderPageDesigner();
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
                <div className="w-10 h-10 rounded-xl bg-[#17244B] flex items-center justify-center">
                  <Layout size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">Visual Experience Studio</h1>
                  <p className="text-xs text-slate-500">No-Code Design Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {stats && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">{stats.pages.total} Pages</span>
                  <span className="text-slate-500">{stats.sections.total} Sections</span>
                  <span className="text-slate-500">{stats.themes.total} Themes</span>
                </div>
              )}
              <button className="p-2 hover:bg-slate-100 rounded-lg">
                <Settings size={20} className="text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
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
                      ? 'bg-[#17244B] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{section.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>

          {/* Pages List */}
          <div className="p-4 border-t border-slate-200">
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Pages</h3>
            <div className="space-y-1">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => {
                    setSelectedPage(page);
                    setActiveSection('designer');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    selectedPage?.id === page.id ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="text-slate-700 truncate">{page.name}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    page.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderSectionContent()}
        </main>
      </div>

      {/* New Page Modal */}
      {showNewPageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Create New Page</h2>
              <button onClick={() => setShowNewPageModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Page Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" placeholder="e.g., Summer Sale" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Slug</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" placeholder="/summer-sale" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Page Type</label>
                <select className="w-full px-4 py-2 rounded-lg border border-slate-200">
                  <option value="custom">Custom Page</option>
                  <option value="home">Homepage</option>
                  <option value="listing">Listing Page</option>
                  <option value="details">Details Page</option>
                  <option value="campaign">Campaign Landing Page</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Blank', 'With Hero', 'With Search'].map((t) => (
                    <button key={t} className="p-3 border border-slate-200 rounded-lg text-sm hover:border-[#17244B]">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button onClick={() => setShowNewPageModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button className="px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
