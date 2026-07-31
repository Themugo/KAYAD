import React, { useState } from 'react';
import {
  Globe, Search, Share2, FileText, CheckCircle, AlertCircle,
  ExternalLink, Copy, Edit, Save, RefreshCw, Link, Robots,
  Sitemap, Eye, Smartphone, Monitor, ChevronDown, Plus, Trash2,
  ArrowRightLeft, BarChart3, X, Settings
} from 'lucide-react';

// Design System Colors
const colors = {
  navy: '#17244B',
  beige: '#F6F1E8',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#C77B58',
  softBlue: '#60A5FA',
};

const mockPages = [
  { id: '1', title: 'Homepage', url: '/', metaTitle: 'KAYAD - East Africa\'s Premier Automotive Marketplace', metaDescription: 'Buy, sell, and auction vehicles with confidence. Trusted escrow protection, professional inspections, and verified dealers.', ogImage: 'https://picsum.photos/1200/630', status: 'good' },
  { id: '2', title: 'Browse Vehicles', url: '/browse', metaTitle: 'Browse Cars, Trucks & SUVs | KAYAD Marketplace', metaDescription: 'Explore thousands of verified vehicles from trusted dealers across East Africa.', ogImage: 'https://picsum.photos/1200/630', status: 'warning' },
  { id: '3', title: 'Auctions', url: '/auctions', metaTitle: '', metaDescription: '', ogImage: '', status: 'error' },
  { id: '4', title: 'Dealers', url: '/dealers', metaTitle: 'Verified Car Dealers | KAYAD', metaDescription: 'Connect with verified, trusted car dealers across East Africa.', ogImage: '', status: 'good' },
  { id: '5', title: 'Financing', url: '/financing', metaTitle: 'Easy Car Finance & Loans | KAYAD', metaDescription: 'Get pre-approved for vehicle financing with competitive rates.', ogImage: 'https://picsum.photos/1200/630', status: 'good' },
  { id: '6', title: 'Inspections', url: '/inspections', metaTitle: 'Professional Vehicle Inspections | KAYAD', metaDescription: 'Book comprehensive vehicle inspections by certified professionals.', ogImage: '', status: 'warning' },
];

const mockRedirects = [
  { id: '1', from: '/old-page', to: '/new-page', status: 'active' },
  { id: '2', from: '/cars', to: '/browse', status: 'active' },
  { id: '3', from: '/auction', to: '/auctions', status: 'active' },
];

export default function SEOManager() {
  const [activeTab, setActiveTab] = useState('pages');
  const [selectedPage, setSelectedPage] = useState(null);
  const [pages, setPages] = useState(mockPages);
  const [redirects, setRedirects] = useState(mockRedirects);
  const [showAddRedirect, setShowAddRedirect] = useState(false);
  const [newRedirect, setNewRedirect] = useState({ from: '', to: '', status: 'active' });
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-emerald-500';
      case 'warning': return 'text-amber-500';
      case 'error': return 'text-red-500';
      default: return 'text-slate-400';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'good': return 'bg-emerald-100 text-emerald-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getScore = (page) => {
    if (page.metaTitle && page.metaDescription && page.ogImage) return 100;
    if (page.metaTitle || page.metaDescription) return 60;
    if (page.metaTitle || page.ogImage) return 50;
    return 20;
  };

  const tabs = [
    { id: 'pages', label: 'Page SEO', icon: FileText },
    { id: 'social', label: 'Social Sharing', icon: Share2 },
    { id: 'redirects', label: 'Redirects', icon: ArrowRightLeft },
    { id: 'sitemap', label: 'Sitemap', icon: Sitemap },
    { id: 'robots', label: 'Robots.txt', icon: Robots },
    { id: 'structured', label: 'Structured Data', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#17244B] flex items-center justify-center">
                  <Globe size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">SEO Manager</h1>
                  <p className="text-xs text-slate-500">Optimize search visibility</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                <RefreshCw size={18} />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
                <Save size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === tab.id ? 'bg-[#17244B] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 p-4 bg-slate-50 rounded-xl">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Quick Stats</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Pages Optimized</span>
                <span className="text-sm font-semibold text-emerald-600">4/6</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '66%' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Redirects</span>
                <span className="text-sm font-semibold text-[#17244B]">{redirects.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'pages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Page SEO Settings</h2>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Eye size={16} />
                  Preview how pages appear in search results
                </div>
              </div>

              {/* Page List */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Page</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Meta Title</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Score</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pages.map(page => (
                      <tr key={page.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-800">{page.title}</div>
                            <div className="text-xs text-slate-400">{page.url}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <p className="text-sm text-slate-600 truncate">{page.metaTitle || 'No title set'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusBg(page.status)}`}>
                            {page.status === 'good' && <CheckCircle size={12} />}
                            {page.status === 'warning' && <AlertCircle size={12} />}
                            {page.status === 'error' && <X size={12} />}
                            {page.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getScore(page) >= 80 ? 'bg-emerald-500' : getScore(page) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${getScore(page)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-600 w-10">{getScore(page)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedPage(page)}
                            className="px-3 py-1.5 text-sm text-[#17244B] hover:bg-[#17244B]/10 rounded-lg"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Google Preview */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Google Search Preview</h3>
                <div className="max-w-2xl space-y-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
                      {pages[0].metaTitle || 'KAYAD - East Africa\'s Premier Automotive Marketplace'}
                    </div>
                    <div className="text-green-700 text-sm truncate">
                      https://kayad.co.ke{pages[0].url}
                    </div>
                    <div className="text-slate-600 text-sm mt-1 line-clamp-2">
                      {pages[0].metaDescription || 'Buy, sell, and auction vehicles with confidence. Trusted escrow protection, professional inspections, and verified dealers.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">Social Media Sharing</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* Facebook Preview */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">f</span>
                    </div>
                    <h3 className="font-semibold text-slate-800">Facebook</h3>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {pages[0].ogImage ? (
                      <img src={pages[0].ogImage} alt="OG" className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400">No image set</span>
                      </div>
                    )}
                    <div className="p-3">
                      <div className="text-xs text-slate-500 uppercase">kayad.co.ke</div>
                      <div className="font-semibold text-slate-800">{pages[0].metaTitle || 'Page Title'}</div>
                      <div className="text-sm text-slate-600 line-clamp-2">{pages[0].metaDescription || 'Page description...'}</div>
                    </div>
                  </div>
                </div>

                {/* Twitter Preview */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">X</span>
                    </div>
                    <h3 className="font-semibold text-slate-800">Twitter / X</h3>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {pages[0].ogImage ? (
                      <img src={pages[0].ogImage} alt="OG" className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-400">No image set</span>
                      </div>
                    )}
                    <div className="p-3">
                      <div className="font-semibold text-slate-800">{pages[0].metaTitle || 'Page Title'}</div>
                      <div className="text-sm text-slate-600 line-clamp-2">{pages[0].metaDescription || 'Page description...'}</div>
                      <div className="text-xs text-slate-500 mt-1">kayad.co.ke</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Recommended Image Sizes</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Facebook: 1200x630px • Twitter: 1200x600px • LinkedIn: 1200x627px
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'redirects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">URL Redirects</h2>
                <button
                  onClick={() => setShowAddRedirect(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]"
                >
                  <Plus size={18} />
                  Add Redirect
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">From</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">To</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {redirects.map(redirect => (
                      <tr key={redirect.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link size={14} className="text-slate-400" />
                            <code className="text-sm bg-slate-100 px-2 py-1 rounded">{redirect.from}</code>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft size={14} className="text-slate-400" />
                            <code className="text-sm bg-slate-100 px-2 py-1 rounded">{redirect.to}</code>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                            {redirect.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sitemap' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">XML Sitemap</h2>
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <RefreshCw size={18} />
                  Regenerate
                </button>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <Sitemap size={24} className="text-[#17244B]" />
                  <div>
                    <h3 className="font-semibold text-slate-800">Sitemap Status</h3>
                    <p className="text-sm text-slate-500">Last generated: 2 hours ago</p>
                  </div>
                  <span className="ml-auto px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">Active</span>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 overflow-auto">
                  <pre className="text-green-400 text-xs font-mono">
{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kayad.co.ke/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://kayad.co.ke/browse</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kayad.co.ke/auctions</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <!-- ... more URLs -->`}
                  </pre>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Copy size={16} />
                    Copy URL
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <ExternalLink size={16} />
                    Open in Browser
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'robots' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">robots.txt Configuration</h2>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <div className="bg-slate-900 rounded-lg p-4 overflow-auto">
                  <pre className="text-green-400 text-sm font-mono">
{`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /*.json$
Disallow: /checkout
Disallow: /account

Sitemap: https://kayad.co.ke/sitemap.xml

# Crawl-delay for polite bots
Crawl-delay: 10`}
                  </pre>
                </div>

                <div className="mt-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
                    <Save size={16} />
                    Save robots.txt
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'structured' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">Structured Data (Schema.org)</h2>

              <div className="grid grid-cols-2 gap-4">
                {['Organization', 'WebSite', 'Product', 'LocalBusiness', 'FAQPage', 'BreadcrumbList'].map(type => (
                  <div key={type} className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-slate-800">{type}</h4>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Enabled</span>
                    </div>
                    <div className="text-sm text-slate-500">{type} schema markup</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Page Modal */}
      {selectedPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Edit SEO: {selectedPage.title}</h2>
              <button onClick={() => setSelectedPage(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meta Title</label>
                <input
                  type="text"
                  defaultValue={selectedPage.metaTitle}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
                  placeholder="Enter page title for search engines"
                />
                <p className="text-xs text-slate-400 mt-1">Recommended: 50-60 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meta Description</label>
                <textarea
                  defaultValue={selectedPage.metaDescription}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none resize-none"
                  placeholder="Enter page description for search engines"
                />
                <p className="text-xs text-slate-400 mt-1">Recommended: 150-160 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Canonical URL</label>
                <input
                  type="text"
                  defaultValue={selectedPage.url}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-[#17244B] focus:ring-2 focus:ring-[#17244B]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Open Graph Image</label>
                <div className="flex items-center gap-4">
                  {selectedPage.ogImage ? (
                    <img src={selectedPage.ogImage} alt="OG" className="w-32 h-20 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-32 h-20 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                      <span className="text-slate-400 text-xs">No image</span>
                    </div>
                  )}
                  <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    Upload Image
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedPage(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[#17244B] text-white rounded-lg hover:bg-[#1e3054]">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
