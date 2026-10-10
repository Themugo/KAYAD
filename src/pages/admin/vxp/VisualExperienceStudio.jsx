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
  { id: 'designer', label: 'Page Designer', icon: Layout, color: colors.navy },
  { id: 'theme', label: 'Theme Designer', icon: PaletteIcon, color: colors.softBlue },
  { id: 'layout', label: 'Layout Manager', icon: LayoutTemplate, color: colors.terracotta },
  { id: 'components', label: 'Component Library', icon: BoxIcon, color: colors.emerald },
  { id: 'cards', label: 'Card Designer', icon: CreditCard, color: '#5aafa4' },
  { id: 'sections', label: 'Section Library', icon: Layers3, color: colors.mutedOrange },
  { id: 'ads', label: 'Ad Studio', icon: Bell, color: colors.softBlue },
  { id: 'templates', label: 'Templates', icon: File, color: colors.emerald },
  { id: 'versions', label: 'Version History', icon: History, color: colors.navy },
  { id: 'ai', label: 'AI Design', icon: Sparkles, color: '#13B8A6' },
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
  { id: 'hero', name: 'Hero Section', category: 'Hero', preview: '#0A3340' },
  { id: 'hero_search', name: 'Hero with Search', category: 'Hero', preview: '#5AAFA4' },
  { id: 'featured', name: 'Featured Cars', category: 'Cars', preview: '#10B981' },
  { id: 'latest', name: 'Latest Listings', category: 'Cars', preview: '#5aafa4' },
  { id: 'dealers', name: 'Dealers Grid', category: 'Dealers', preview: '#5aafa4' },
  { id: 'stats', name: 'Statistics', category: 'Content', preview: '#13b8a6' },
  { id: 'testimonials', name: 'Testimonials', category: 'Content', preview: '#13B8A6' },
  { id: 'cta', name: 'Call to Action', category: 'Marketing', preview: colors.navy },
  { id: 'newsletter', name: 'Newsletter', category: 'Marketing', preview: colors.softBlue },
  { id: 'faq', name: 'FAQ Accordion', category: 'Support', preview: colors.emerald },
  { id: 'blog', name: 'Blog Grid', category: 'Blog', preview: colors.terracotta },
  { id: 'footer', name: 'Footer', category: 'Footer', preview: '#0A3340' },
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
      // No synthetic production fallback: the UI remains empty until the backend responds.
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
        <h2 className="text-2xl font-bold text-[#0A3340]">Page Designer</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewPageModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
          >
            <Plus size={18} />
            New Page
          </button>
        </div>
      </div>

      {/* Device Preview Controls */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-[#D7E7E4]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-[#EEF7F5] rounded-lg p-1">
            <button
              onClick={() => setDevicePreview('desktop')}
              className={`p-2 rounded-lg ${devicePreview === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              <Monitor size={18} className={devicePreview === 'desktop' ? 'text-[#0A3340]' : 'text-[#64748B]'} />
            </button>
            <button
              onClick={() => setDevicePreview('tablet')}
              className={`p-2 rounded-lg ${devicePreview === 'tablet' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              <Tablet size={18} className={devicePreview === 'tablet' ? 'text-[#0A3340]' : 'text-[#64748B]'} />
            </button>
            <button
              onClick={() => setDevicePreview('mobile')}
              className={`p-2 rounded-lg ${devicePreview === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              <Smartphone size={18} className={devicePreview === 'mobile' ? 'text-[#0A3340]' : 'text-[#64748B]'} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-[#EEF7F5] rounded-lg"><ZoomOut size={18} /></button>
            <span className="text-sm text-[#64748B] w-16 text-center">100%</span>
            <button className="p-2 hover:bg-[#EEF7F5] rounded-lg"><ZoomIn size={18} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-[#EEF7F5] rounded-lg"><Undo size={18} /></button>
          <button className="p-2 hover:bg-[#EEF7F5] rounded-lg"><Redo size={18} /></button>
          <div className="w-px h-6 bg-[#DDF4F0] mx-2" />
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${previewMode ? 'bg-[#0A3340] text-white' : 'border border-[#D7E7E4] hover:bg-[#F6FAF9]'}`}
          >
            <Eye size={18} />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Component Panel */}
        {showComponentPanel && (
          <div className="w-64 bg-white rounded-xl border border-[#D7E7E4] overflow-hidden">
            <div className="p-4 border-b border-[#D7E7E4]">
              <h3 className="font-semibold text-[#0A3340]">Components</h3>
            </div>
            <div className="p-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {componentLibrary.map((group) => (
                <div key={group.category}>
                  <h4 className="text-xs font-medium text-[#94A3B8] uppercase mb-2">{group.category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => (
                      <button
                        key={item}
                        className="p-2 text-left text-sm rounded-lg border border-[#D7E7E4] hover:border-[#0A3340] hover:bg-[#0A3340]/5 transition-all"
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
            <div className={`bg-white rounded-xl border border-[#D7E7E4] overflow-hidden ${
              devicePreview === 'desktop' ? 'max-w-full' :
              devicePreview === 'tablet' ? 'max-w-[768px] mx-auto' :
              'max-w-[375px] mx-auto'
            }`}>
              <div className="p-4 border-b border-[#D7E7E4] bg-[#F6FAF9]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#0A3340]">{selectedPage.name}</h3>
                    <p className="text-sm text-[#64748B]">/{selectedPage.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPage.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#DDF4F0] text-[#12576D]'
                    }`}>
                      {selectedPage.status}
                    </span>
                    <button className="p-2 hover:bg-[#DDF4F0] rounded-lg">
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Canvas Content */}
              <div className="p-8 min-h-[600px] bg-[#EEF7F5]">
                {/* Hero Section Placeholder */}
                <div className="bg-gradient-to-r from-[#0A3340] to-[#2a3a6b] rounded-xl p-12 mb-6 text-white">
                  <div className="max-w-2xl mx-auto text-center">
                    <h1 className="text-4xl font-bold mb-4">Hero Section</h1>
                    <p className="text-lg opacity-80 mb-8">Click to edit this section</p>
                    <div className="flex items-center justify-center gap-4">
                      <button className="px-6 py-3 bg-white text-[#0A3340] rounded-lg font-medium hover:bg-opacity-90">
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
                    className="bg-white rounded-xl border-2 border-dashed border-[#BDE5DE] p-8 mb-6 text-center cursor-pointer hover:border-[#0A3340] transition-colors"
                    onClick={() => setSelectedElement(section)}
                  >
                    <Layers3 size={32} className="mx-auto text-[#94A3B8] mb-2" />
                    <p className="text-[#64748B]">{section}</p>
                    <p className="text-sm text-[#94A3B8]">Click to add or edit</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#D7E7E4] p-12 text-center">
              <Layout size={64} className="mx-auto text-[#BDE5DE] mb-4" />
              <h3 className="text-xl font-semibold text-[#0A3340] mb-2">Select a Page to Edit</h3>
              <p className="text-[#64748B] mb-6">Choose a page from the sidebar or create a new one</p>
              <div className="flex justify-center gap-4">
                {pages.slice(0, 4).map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page)}
                    className="px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
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
          <div className="w-72 bg-white rounded-xl border border-[#D7E7E4] overflow-hidden">
            <div className="p-4 border-b border-[#D7E7E4]">
              <h3 className="font-semibold text-[#0A3340]">Properties</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Page Name</label>
                <input
                  type="text"
                  value={selectedPage.name}
                  className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Slug</label>
                <input
                  type="text"
                  value={selectedPage.slug}
                  className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Status</label>
                <select className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4] text-sm">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#D7E7E4]">
                <h4 className="text-sm font-medium text-[#64748B] mb-2">Spacing</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#64748B]">Padding</span>
                    <span className="text-sm font-mono">32px</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#64748B]">Margin</span>
                    <span className="text-sm font-mono">0px</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#D7E7E4]">
                <h4 className="text-sm font-medium text-[#64748B] mb-2">Background</h4>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded border border-[#D7E7E4]" style={{ backgroundColor: colors.beige }} />
                  <input type="text" value={colors.beige} className="flex-1 px-2 py-1 text-sm rounded border border-[#D7E7E4]" />
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
        <h2 className="text-2xl font-bold text-[#0A3340]">Theme Designer</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Theme
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Color Palette */}
        <div className="col-span-2 bg-white rounded-xl border border-[#D7E7E4] p-6">
          <h3 className="font-semibold text-[#0A3340] mb-4">Color Palette</h3>
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
                <label className="block text-sm font-medium text-[#64748B] mb-2">{color.name}</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg border border-[#D7E7E4] cursor-pointer"
                    style={{ backgroundColor: color.value }}
                  />
                  <input
                    type="text"
                    defaultValue={color.value}
                    className="flex-1 px-2 py-1 text-sm rounded border border-[#D7E7E4] font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Theme Preview */}
        <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
          <h3 className="font-semibold text-[#0A3340] mb-4">Preview</h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-[#0A3340] text-white rounded-lg">Primary Button</button>
            <button className="w-full px-4 py-2 border border-[#0A3340] text-[#0A3340] rounded-lg">Secondary</button>
            <button className="w-full px-4 py-2 bg-[#5aafa4] text-white rounded-lg">Accent</button>
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm text-center">Success</div>
            <div className="p-3 bg-softBlue-100 text-softBlue-700 rounded-lg text-sm text-center">Info</div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
        <h3 className="font-semibold text-[#0A3340] mb-4">Typography</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Heading Font</label>
            <select className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4]">
              <option>Inter</option>
              <option>Playfair Display</option>
              <option>Poppins</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Body Font</label>
            <select className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4]">
              <option>Inter</option>
              <option>Open Sans</option>
              <option>Roboto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Scale</label>
            <select className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4]">
              <option>1.25 (Major Third)</option>
              <option>1.333 (Perfect Fourth)</option>
              <option>1.5 (Perfect Fifth)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spacing & Effects */}
      <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
        <h3 className="font-semibold text-[#0A3340] mb-4">Spacing & Effects</h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Border Radius</label>
            <select className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4]">
              <option>None (0px)</option>
              <option>Small (4px)</option>
              <option>Medium (8px)</option>
              <option>Large (12px)</option>
              <option>Full (9999px)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Shadow</label>
            <select className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4]">
              <option>None</option>
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Transitions</label>
            <select className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4]">
              <option>Fast (150ms)</option>
              <option>Normal (300ms)</option>
              <option>Slow (500ms)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Base Spacing</label>
            <select className="w-full px-3 py-2 rounded-lg border border-[#D7E7E4]">
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
        <h2 className="text-2xl font-bold text-[#0A3340]">Card Designer</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Card
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Card Types */}
        <div className="bg-white rounded-xl border border-[#D7E7E4] p-4">
          <h3 className="font-semibold text-[#0A3340] mb-4">Card Types</h3>
          <div className="space-y-2">
            {cardTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedCard(type.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  selectedCard === type.id ? 'bg-[#0A3340] text-white' : 'hover:bg-[#F6FAF9]'
                }`}
              >
                <CreditCard size={18} />
                <span className="text-sm font-medium">{type.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card Preview */}
        <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
          <h3 className="font-semibold text-[#0A3340] mb-4">Preview</h3>
          <div className="bg-[#EEF7F5] p-6 rounded-xl">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-[#DDF4F0] to-[#BDE5DE]" />
              <div className="p-4">
                <h4 className="font-bold text-[#0A3340] mb-1">Toyota Land Cruiser 2023</h4>
                <p className="text-sm text-[#64748B] mb-2">Nairobi, Kenya</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#0A3340]">KES 18,500,000</span>
                  <span className="text-xs text-[#94A3B8]">45,000 km</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Verified</span>
                  <span className="px-2 py-0.5 bg-[#DDF4F0] text-[#12576D] rounded text-xs">Finance</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Field Manager */}
        <div className="bg-white rounded-xl border border-[#D7E7E4] p-4">
          <h3 className="font-semibold text-[#0A3340] mb-4">Card Fields</h3>
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
              <label key={field.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F6FAF9] cursor-pointer">
                <input type="checkbox" defaultChecked={field.checked} className="rounded" />
                <span className="text-sm text-[#12576D]">{field.name}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#D7E7E4]">
            <h4 className="text-sm font-medium text-[#64748B] mb-2">Layout</h4>
            <div className="grid grid-cols-2 gap-2">
              <button className="p-2 text-xs border border-[#0A3340] bg-[#0A3340]/5 rounded">Compact</button>
              <button className="p-2 text-xs border border-[#D7E7E4] rounded hover:bg-[#F6FAF9]">Standard</button>
              <button className="p-2 text-xs border border-[#D7E7E4] rounded hover:bg-[#F6FAF9]">Expanded</button>
              <button className="p-2 text-xs border border-[#D7E7E4] rounded hover:bg-[#F6FAF9]">Gallery</button>
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
        <h2 className="text-2xl font-bold text-[#0A3340]">Section Library</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          Create Section
        </button>
      </div>

      <div className="flex gap-4">
        {['All', 'Hero', 'Cars', 'Dealers', 'Marketing', 'Content', 'Footer'].map((cat) => (
          <button
            key={cat}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              cat === 'All' ? 'bg-[#0A3340] text-white' : 'bg-white border border-[#D7E7E4] hover:bg-[#F6FAF9]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {sectionTemplates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl border border-[#D7E7E4] overflow-hidden hover:border-[#0A3340] transition-colors cursor-pointer">
            <div className="h-32 relative" style={{ backgroundColor: template.preview }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Layers3 size={32} className="text-white/50" />
              </div>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-[#0A3340] text-sm">{template.name}</h4>
              <p className="text-xs text-[#94A3B8]">{template.category}</p>
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
        <h2 className="text-2xl font-bold text-[#0A3340]">Advertisement Studio</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Advertisement
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Ad Zones */}
        <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
          <h3 className="font-semibold text-[#0A3340] mb-4">Ad Placements</h3>
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
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[#D7E7E4] hover:bg-[#F6FAF9]">
                <div>
                  <p className="font-medium text-[#0A3340] text-sm">{ad.zone}</p>
                  <p className="text-xs text-[#94A3B8]">{ad.size}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  ad.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  ad.status === 'paused' ? 'bg-[#DDF4F0] text-[#12576D]' :
                  'bg-[#EEF7F5] text-[#64748B]'
                }`}>
                  {ad.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ad Campaigns */}
        <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
          <h3 className="font-semibold text-[#0A3340] mb-4">Active Campaigns</h3>
          <div className="space-y-3">
            {[
              { name: 'Summer Car Sale', impressions: '125,000', ctr: '2.4%', budget: 'KES 500,000' },
              { name: 'Toyota Week', impressions: '89,000', ctr: '3.1%', budget: 'KES 350,000' },
              { name: 'Auction Promo', impressions: '45,000', ctr: '1.8%', budget: 'KES 200,000' },
            ].map((campaign, i) => (
              <div key={i} className="p-4 rounded-lg border border-[#D7E7E4]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-[#0A3340]">{campaign.name}</h4>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">Active</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[#94A3B8]">Impressions</p>
                    <p className="font-medium text-[#0A3340]">{campaign.impressions}</p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8]">CTR</p>
                    <p className="font-medium text-[#0A3340]">{campaign.ctr}</p>
                  </div>
                  <div>
                    <p className="text-[#94A3B8]">Budget</p>
                    <p className="font-medium text-[#0A3340]">{campaign.budget}</p>
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
      <h2 className="text-2xl font-bold text-[#0A3340]">AI Design Assistant</h2>

      <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#DDF4F0] flex items-center justify-center">
            <Sparkles size={24} className="text-[#176B87]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#0A3340]">Describe Your Vision</h3>
            <p className="text-sm text-[#64748B]">AI will design layouts based on your description</p>
          </div>
        </div>

        <textarea
          className="w-full p-4 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] focus:ring-2 focus:ring-[#0A3340]/20 outline-none resize-none"
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
                className="px-3 py-1.5 text-sm border border-[#D7E7E4] rounded-full hover:bg-[#F6FAF9]"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#176B87] text-white rounded-lg hover:bg-[#12576D]">
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
          <div key={i} className="bg-white rounded-xl border border-[#D7E7E4] overflow-hidden hover:border-[#0A3340] transition-colors cursor-pointer">
            <div className="h-32 relative" style={{ backgroundColor: suggestion.preview }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Layout size={32} className="text-white/50" />
              </div>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-[#0A3340] text-sm">{suggestion.title}</h4>
              <p className="text-xs text-[#94A3B8]">{suggestion.description}</p>
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
      <h2 className="text-2xl font-bold text-[#0A3340]">Version History</h2>

      <div className="bg-white rounded-xl border border-[#D7E7E4] p-6">
        <div className="space-y-4">
          {[
            { version: 'v12', date: '2 hours ago', user: 'Admin', changes: 'Updated hero section and pricing cards' },
            { version: 'v11', date: '1 day ago', user: 'Admin', changes: 'Added new statistics section' },
            { version: 'v10', date: '3 days ago', user: 'Admin', changes: 'Published summer sale campaign' },
            { version: 'v9', date: '1 week ago', user: 'Admin', changes: 'Redesigned footer layout' },
            { version: 'v8', date: '2 weeks ago', user: 'Admin', changes: 'Updated color palette' },
          ].map((v, i) => (
            <div key={i} className={`flex items-center justify-between p-4 rounded-lg ${i === 0 ? 'bg-[#0A3340]/5 border border-[#0A3340]/20' : 'bg-[#F6FAF9]'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-[#0A3340] text-white' : 'bg-[#DDF4F0] text-[#64748B]'}`}>
                  <History size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0A3340]">{v.version}</span>
                    {i === 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">Current</span>}
                  </div>
                  <p className="text-sm text-[#64748B]">{v.changes}</p>
                  <p className="text-xs text-[#94A3B8]">{v.date} by {v.user}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {i !== 0 && (
                  <button className="px-3 py-1.5 text-sm border border-[#D7E7E4] rounded-lg hover:bg-[#EEF7F5]">
                    Preview
                  </button>
                )}
                {i !== 0 && (
                  <button className="px-3 py-1.5 text-sm text-[#0A3340] border border-[#0A3340] rounded-lg hover:bg-[#0A3340]/5">
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
    <div className="min-h-screen bg-[#EEF7F5]">
      {/* Header */}
      <header className="bg-white border-b border-[#D7E7E4] sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A3340] flex items-center justify-center">
                  <Layout size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Visual Experience Studio</h1>
                  <p className="text-xs text-[#64748B]">No-Code Design Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {stats && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-[#64748B]">{stats.pages.total} Pages</span>
                  <span className="text-[#64748B]">{stats.sections.total} Sections</span>
                  <span className="text-[#64748B]">{stats.themes.total} Themes</span>
                </div>
              )}
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

          {/* Pages List */}
          <div className="p-4 border-t border-[#D7E7E4]">
            <h3 className="text-xs font-medium text-[#94A3B8] uppercase mb-2">Pages</h3>
            <div className="space-y-1">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => {
                    setSelectedPage(page);
                    setActiveSection('designer');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    selectedPage?.id === page.id ? 'bg-[#EEF7F5]' : 'hover:bg-[#F6FAF9]'
                  }`}
                >
                  <span className="text-[#12576D] truncate">{page.name}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    page.status === 'published' ? 'bg-emerald-500' : 'bg-[#13B8A6]'
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
        <div className="fixed inset-0 bg-[#0A3340]/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-4 border-b border-[#D7E7E4] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0A3340]">Create New Page</h2>
              <button onClick={() => setShowNewPageModal(false)} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Page Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4]" placeholder="e.g., Summer Sale" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Slug</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4]" placeholder="/summer-sale" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Page Type</label>
                <select className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4]">
                  <option value="custom">Custom Page</option>
                  <option value="home">Homepage</option>
                  <option value="listing">Listing Page</option>
                  <option value="details">Details Page</option>
                  <option value="campaign">Campaign Landing Page</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-1">Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Blank', 'With Hero', 'With Search'].map((t) => (
                    <button key={t} className="p-3 border border-[#D7E7E4] rounded-lg text-sm hover:border-[#0A3340]">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[#D7E7E4] flex items-center justify-end gap-3">
              <button onClick={() => setShowNewPageModal(false)} className="px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
                Cancel
              </button>
              <button className="px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
