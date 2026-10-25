import React, { useState, useEffect } from 'react';
import {
  Factory, Package, Layout, Palette, Cloud, Rocket, Bot, ShoppingCart,
  Building, Settings, Globe, BarChart3, Layers, Cpu, Database, Zap,
  Shield, Users, FileText, DollarSign, Plus, ChevronRight, RefreshCw,
  Play, Pause, Trash2, Edit, Eye, Download, Upload, CheckCircle, AlertTriangle,
  Clock, TrendingUp, Server, Code, Palette as PaletteIcon, Monitor
} from 'lucide-react';
import * as pfApi from '../../../services/platformFactoryApi';
import { isUnavailable } from '../../../components/admin/adminStat';

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
  purple: '#5aafa4',
};

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: colors.navy },
  { id: 'templates', label: 'Templates', icon: Layout, color: colors.emerald },
  { id: 'products', label: 'Products', icon: Package, color: colors.terracotta },
  { id: 'components', label: 'Components', icon: Layers, color: colors.purple },
  { id: 'services', label: 'Services', icon: Cpu, color: colors.softBlue },
  { id: 'branding', label: 'Branding', icon: PaletteIcon, color: colors.mutedOrange },
  { id: 'deploy', label: 'Deployment', icon: Cloud, color: colors.navy },
  { id: 'store', label: 'App Store', icon: Rocket, color: colors.emerald },
];

const num = (value, format) => (Number.isFinite(value) ? format(value) : 'Unavailable');

export default function PlatformFactory() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [components, setComponents] = useState([]);
  const [services, setServices] = useState([]);
  const [brands, setBrands] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [productDescription, setProductDescription] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const { data: dashData } = await pfApi.getPlatformDashboard();
      setDashboard(dashData.data);

      const { data: tempData } = await pfApi.getTemplates();
      setTemplates(Array.isArray(tempData?.data) ? tempData.data : []);

      const { data: prodData } = await pfApi.getProducts();
      setProducts(Array.isArray(prodData?.data) ? prodData.data : []);

      const { data: compData } = await pfApi.getComponents();
      setComponents(Array.isArray(compData?.data) ? compData.data : []);

      const { data: servData } = await pfApi.getSharedServices();
      setServices(Array.isArray(servData?.data) ? servData.data : []);

      const { data: brandData } = await pfApi.getBrands();
      setBrands(Array.isArray(brandData?.data) ? brandData.data : []);

      const { data: healthData } = await pfApi.getPlatformHealth();
      setHealth(healthData.data);
    } catch (error) {
      console.error('Failed to load platform data:', error);
      // No synthetic fallback: show the failure and leave every figure unavailable.
      setLoadError('Platform Factory data could not be loaded. Figures below are unavailable, not zero.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProduct = async () => {
    if (!productDescription.trim()) return;
    try {
      const { data } = await pfApi.generateProduct({
        description: productDescription,
        template: 'custom',
      });
      setShowGenerator(false);
      setProductDescription('');
      loadAllData();
    } catch (error) {
      console.error('Failed to generate product:', error);
    }
  };

  // ============================================
  // DASHBOARD
  // ============================================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A3340]">Platform Factory Dashboard</h2>
          <p className="text-[#64748B]">Manage and generate new digital products</p>
        </div>
        <button onClick={() => setShowGenerator(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          Generate Product
        </button>
      </div>

      {loadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <div className="flex items-center gap-2 mb-2">
            <Package size={20} className="text-[#176B87]" />
            <span className="text-sm text-[#64748B]">Total Products</span>
          </div>
          <p className={`${isUnavailable(num(dashboard?.totalProducts, String)) ? 'text-lg' : 'text-3xl'} font-bold text-[#0A3340]`}>{num(dashboard?.totalProducts, String)}</p>
          <p className="text-xs text-[#64748B] mt-2">{num(dashboard?.activeProducts, String)} active</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} className="text-emerald-600" />
            <span className="text-sm text-[#64748B]">Total Revenue</span>
          </div>
          <p className={`${isUnavailable(num(dashboard?.totalRevenue, (v) => `${(v / 1000000).toFixed(1)}M`)) ? 'text-lg' : 'text-3xl'} font-bold text-[#0A3340]`}>{num(dashboard?.totalRevenue, (v) => `${(v / 1000000).toFixed(1)}M`)}</p>
          <p className="text-xs text-[#64748B] mt-2">Across all products</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <div className="flex items-center gap-2 mb-2">
            <Users size={20} className="text-[#176B87]" />
            <span className="text-sm text-[#64748B]">Total Users</span>
          </div>
          <p className={`${isUnavailable(num(dashboard?.totalUsers, (v) => `${(v / 1000).toFixed(1)}K`)) ? 'text-lg' : 'text-3xl'} font-bold text-[#0A3340]`}>{num(dashboard?.totalUsers, (v) => `${(v / 1000).toFixed(1)}K`)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={20} className="text-emerald-600" />
            <span className="text-sm text-[#64748B]">Platform Health</span>
          </div>
          <p className={`${isUnavailable(num(dashboard?.health, (v) => `${v}%`)) ? 'text-lg' : 'text-3xl'} font-bold text-emerald-600`}>{num(dashboard?.health, (v) => `${v}%`)}</p>
          <p className="text-xs text-[#64748B] mt-2">As reported by the platform health service</p>
        </div>
      </div>

      {/* Platform Health */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Product Health Overview</h3>
        <div className="space-y-3">
          {health?.products?.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-[#F6FAF9] rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  product.status === 'healthy' ? 'bg-emerald-500' :
                  product.status === 'warning' ? 'bg-[#13B8A6]' : 'bg-red-500'
                }`} />
                <span className="font-medium text-[#0A3340]">{product.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32">
                  <div className="w-full bg-[#DDF4F0] rounded-full h-2">
                    <div className="h-2 rounded-full" style={{
                      width: `${product.health}%`,
                      backgroundColor: product.health >= 90 ? colors.emerald : product.health >= 70 ? colors.softBlue : colors.mutedOrange
                    }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-[#64748B]">{product.health}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Recent Products</h3>
        <div className="grid grid-cols-3 gap-4">
          {products.slice(0, 3).map((product) => (
            <div key={product.id} className="p-4 bg-[#F6FAF9] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[#0A3340]">{product.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  product.status === 'production' ? 'bg-emerald-100 text-emerald-700' :
                  product.status === 'staging' ? 'bg-[#DDF4F0] text-[#12576D]' :
                  'bg-[#EEF7F5] text-[#12576D]'
                }`}>
                  {product.status}
                </span>
              </div>
              <p className="text-sm text-[#64748B]">{product.template}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-[#64748B]">
                <span>{product.users?.toLocaleString()} users</span>
                <span>{product.health}% health</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // TEMPLATES
  // ============================================

  const renderTemplates = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Platform Templates</h2>

      <div className="grid grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4] hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-[#0A3340] rounded-lg flex items-center justify-center">
                <ShoppingCart size={24} className="text-white" />
              </div>
              <span className="px-2 py-0.5 bg-[#EEF7F5] text-[#64748B] rounded text-xs">{template.category}</span>
            </div>
            <h3 className="font-semibold text-[#0A3340] mb-2">{template.name}</h3>
            <p className="text-sm text-[#64748B] mb-4">{template.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingUp size={14} className="text-emerald-600" />
                <span className="text-sm text-emerald-600">{template.popularity}%</span>
              </div>
              <button className="text-sm text-[#0A3340] font-medium hover:underline">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // PRODUCTS
  // ============================================

  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Product Registry</h2>
        <button onClick={() => setShowGenerator(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6FAF9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Health</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Users</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4 font-medium text-[#0A3340]">{product.name}</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{product.template}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.status === 'production' ? 'bg-emerald-100 text-emerald-700' :
                    product.status === 'staging' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-[#DDF4F0] text-[#12576D]'
                  }`}>
                    {product.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-[#DDF4F0] rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{
                        width: `${product.health}%`,
                        backgroundColor: product.health >= 90 ? colors.emerald : product.health >= 70 ? colors.softBlue : colors.mutedOrange
                      }} />
                    </div>
                    <span className="text-sm text-[#64748B]">{product.health}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{product.users?.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1.5 hover:bg-[#EEF7F5] rounded-lg" aria-label="View">
                      <Eye size={16} className="text-[#64748B]" />
                    </button>
                    <button className="p-1.5 hover:bg-[#EEF7F5] rounded-lg" aria-label="Edit">
                      <Edit size={16} className="text-[#64748B]" />
                    </button>
                    <button className="p-1.5 hover:bg-[#EEF7F5] rounded-lg" aria-label="Settings">
                      <Settings size={16} className="text-[#64748B]" />
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
  // COMPONENTS
  // ============================================

  const renderComponents = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Component Library</h2>

      <div className="grid grid-cols-4 gap-3">
        {components.map((comp) => (
          <div key={comp.id} className="bg-white rounded-lg p-4 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={16} className="text-[#0A3340]" />
              <span className="text-sm font-medium text-[#0A3340]">{comp.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span className="px-1.5 py-0.5 bg-[#EEF7F5] rounded">{comp.category}</span>
              <span>{comp.usage}% used</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // SERVICES
  // ============================================

  const renderServices = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Shared Services</h2>

      <div className="grid grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-[#0A3340] rounded-lg flex items-center justify-center">
                <Cpu size={20} className="text-white" />
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle size={14} />
                {service.uptime}%
              </span>
            </div>
            <h3 className="font-semibold text-[#0A3340] mb-1">{service.name}</h3>
            <p className="text-sm text-[#64748B] mb-3">{service.description}</p>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Server size={12} />
              <span>{service.latency}ms latency</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // BRANDING
  // ============================================

  const renderBranding = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">White Label Manager</h2>

      <div className="grid grid-cols-2 gap-4">
        {brands.map((brand) => (
          <div key={brand.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: brand.primaryColor }}>
                  <Globe size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0A3340]">{brand.name}</h3>
                  <p className="text-xs text-[#64748B]">{brand.domain}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                brand.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#DDF4F0] text-[#12576D]'
              }`}>
                {brand.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-[#D7E7E4]" style={{ backgroundColor: brand.primaryColor }} />
                <span className="text-xs text-[#64748B]">Primary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-[#D7E7E4]" style={{ backgroundColor: brand.accentColor }} />
                <span className="text-xs text-[#64748B]">Accent</span>
              </div>
            </div>
            <button className="w-full px-3 py-2 border border-[#D7E7E4] rounded-lg text-sm hover:bg-[#F6FAF9]">
              Edit Branding
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // DEPLOYMENT
  // ============================================

  const renderDeploy = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Deployment Manager</h2>

      <div className="grid grid-cols-4 gap-4">
        {['Development', 'Staging', 'Production', 'Canary'].map((env) => (
          <div key={env} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#0A3340]">{env}</h3>
              <span className="w-2 h-2 bg-slate-300 rounded-full" aria-hidden="true" />
            </div>
            <p className="text-sm text-[#64748B]">Instances, uptime and scaling for this environment are not connected to a data source, so they are not shown.</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // APP STORE
  // ============================================

  const renderStore = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">App Store</h2>

      <div className="grid grid-cols-3 gap-4">
        {[].map((app, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[#DDF4F0] rounded-lg flex items-center justify-center">
                <Rocket size={20} className="text-[#176B87]" />
              </div>
              <span className="px-2 py-0.5 bg-[#EEF7F5] text-[#64748B] rounded text-xs">{app.type}</span>
            </div>
            <h3 className="font-semibold text-[#0A3340] mb-1">{app.name}</h3>
            <div className="flex items-center gap-3 mb-3 text-sm text-[#64748B]">
              <span>{app.price}</span>
              <span>•</span>
              <span>{app.installs} installs</span>
              <span>•</span>
              <span className="text-[#176B87]">Rating {app.rating}</span>
            </div>
            <button className="w-full px-3 py-2 border border-[#D7E7E4] rounded-lg text-sm hover:bg-[#F6FAF9]">
              Install
            </button>
          </div>
        ))}<p className="col-span-full text-sm text-[#64748B]" role="status">The app marketplace catalogue is not connected to a data source, so no apps are listed.</p>
      </div>
    </div>
  );

  // ============================================
  // PRODUCT GENERATOR MODAL
  // ============================================

  const renderGeneratorModal = () => (
    <div className="fixed inset-0 bg-[#0A3340]/50 flex items-center justify-center z-50 p-8" onClick={() => setShowGenerator(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[#D7E7E4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0A3340] rounded-lg flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0A3340]">AI Product Generator</h2>
              <p className="text-sm text-[#64748B]">Describe your product and AI will generate it</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#12576D] mb-2">
              Product Description
            </label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="e.g., I want a heavy machinery marketplace for construction equipment..."
              className="w-full px-4 py-3 border border-[#D7E7E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3340] h-32"
            />
          </div>
          <div className="bg-[#F6FAF9] rounded-lg p-4 mb-4">
            <h4 className="font-medium text-[#0A3340] mb-2">AI will create:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-[#64748B]">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Database Schema</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>API Endpoints</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Admin Panel</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>User Interface</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Shared Services</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>AI Components</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGenerator(false)}
              className="flex-1 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateProduct}
              disabled={!productDescription.trim()}
              className="flex-1 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Rocket size={18} />
              Generate Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'templates': return renderTemplates();
      case 'products': return renderProducts();
      case 'components': return renderComponents();
      case 'services': return renderServices();
      case 'branding': return renderBranding();
      case 'deploy': return renderDeploy();
      case 'store': return renderStore();
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A3340] to-[#12576d] flex items-center justify-center">
                  <Factory size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Platform Factory</h1>
                  <p className="text-xs text-[#64748B]">Digital Product Generation</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${Number.isFinite(dashboard?.activeProducts) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                <span className={`w-2 h-2 rounded-full ${Number.isFinite(dashboard?.activeProducts) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {Number.isFinite(dashboard?.activeProducts) ? `${dashboard.activeProducts} Active Products` : 'Active products unavailable'}
              </div>
              <button onClick={loadAllData} className="p-2 hover:bg-[#EEF7F5] rounded-lg" aria-label="Refresh">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-[#D7E7E4] min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive ? 'bg-[#0A3340] text-white' : 'text-[#64748B] hover:bg-[#EEF7F5]'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{mod.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          {renderModuleContent()}
        </div>
      </div>

      {/* Generator Modal */}
      {showGenerator && renderGeneratorModal()}
    </div>
  );
}
