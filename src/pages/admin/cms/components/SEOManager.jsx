import React, { useState } from 'react';
import {
  Globe, Search, Share2, FileText, CheckCircle, AlertCircle,
  ExternalLink, Copy, Edit, Save, RefreshCw, Link, Robots,
  Sitemap, Eye, Smartphone, Monitor, ChevronDown, Plus, Trash2,
  ArrowRightLeft, BarChart3, X, Settings
} from 'lucide-react';

// Design System Colors
const colors = {
  navy: '#0A3340',
  beige: '#EEF7F5',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#5aafa4',
  softBlue: '#5AAFA4',
};

const pagesSeed = [];

const redirectsSeed = [];

export default function SEOManager() {
  const [activeTab, setActiveTab] = useState('pages');
  const [selectedPage, setSelectedPage] = useState(null);
  const [pages, setPages] = useState(pagesSeed);
  const [redirects, setRedirects] = useState(redirectsSeed);
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
      case 'warning': return 'text-[#176B87]';
      case 'error': return 'text-red-500';
      default: return 'text-[#94A3B8]';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'good': return 'bg-emerald-100 text-emerald-700';
      case 'warning': return 'bg-[#DDF4F0] text-[#12576D]';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-[#EEF7F5] text-[#12576D]';
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
    <div className="min-h-screen bg-[#EEF7F5]">
      {/* Header */}
      <header className="bg-white border-b border-[#D7E7E4] sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A3340] flex items-center justify-center">
                  <Globe size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">SEO Manager</h1>
                  <p className="text-xs text-[#64748B]">Optimize search visibility</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
                <RefreshCw size={18} />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
                <Save size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#D7E7E4] min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === tab.id ? 'bg-[#0A3340] text-white' : 'text-[#64748B] hover:bg-[#EEF7F5]'}`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 p-4 bg-[#F6FAF9] rounded-xl">
            <h4 className="text-xs font-semibold text-[#64748B] uppercase mb-3">Quick Stats</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Pages Optimized</span>
                <span className="text-sm font-semibold text-emerald-600">4/6</span>
              </div>
              <div className="w-full bg-[#DDF4F0] rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '66%' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Active Redirects</span>
                <span className="text-sm font-semibold text-[#0A3340]">{redirects.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'pages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0A3340]">Page SEO Settings</h2>
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <Eye size={16} />
                  Preview how pages appear in search results
                </div>
              </div>

              {/* Page List */}
              <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F6FAF9] border-b border-[#D7E7E4]">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Page</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Meta Title</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Status</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Score</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7E7E4]">
                    {pages.map(page => (
                      <tr key={page.id} className="hover:bg-[#F6FAF9] transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-[#0A3340]">{page.title}</div>
                            <div className="text-xs text-[#94A3B8]">{page.url}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <p className="text-sm text-[#64748B] truncate">{page.metaTitle || 'No title set'}</p>
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
                            <div className="w-24 h-2 bg-[#DDF4F0] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getScore(page) >= 80 ? 'bg-emerald-500' : getScore(page) >= 50 ? 'bg-[#13B8A6]' : 'bg-red-500'}`}
                                style={{ width: `${getScore(page)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-[#64748B] w-10">{getScore(page)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedPage(page)}
                            className="px-3 py-1.5 text-sm text-[#0A3340] hover:bg-[#0A3340]/10 rounded-lg"
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
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
                <h3 className="text-lg font-semibold text-[#0A3340] mb-4">Google Search Preview</h3>
                <div className="max-w-2xl space-y-4">
                  <div className="p-4 bg-white border border-[#D7E7E4] rounded-lg">
                    <div className="text-[#176B87] text-lg hover:underline cursor-pointer truncate">
                      {pages[0].metaTitle || 'KAYAD - East Africa\'s Premier Automotive Marketplace'}
                    </div>
                    <div className="text-green-700 text-sm truncate">
                      https://kayad.co.ke{pages[0].url}
                    </div>
                    <div className="text-[#64748B] text-sm mt-1 line-clamp-2">
                      {pages[0].metaDescription || 'Buy, sell, and auction vehicles with confidence. Trusted escrow protection, professional inspections, and verified dealers.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-[#0A3340]">Social Media Sharing</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* Facebook Preview */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-[#176B87] rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">f</span>
                    </div>
                    <h3 className="font-semibold text-[#0A3340]">Facebook</h3>
                  </div>
                  <div className="border border-[#D7E7E4] rounded-lg overflow-hidden">
                    {pages[0].ogImage ? (
                      <img src={pages[0].ogImage} alt="OG" className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-[#EEF7F5] flex items-center justify-center">
                        <span className="text-[#94A3B8]">No image set</span>
                      </div>
                    )}
                    <div className="p-3">
                      <div className="text-xs text-[#64748B] uppercase">kayad.co.ke</div>
                      <div className="font-semibold text-[#0A3340]">{pages[0].metaTitle || 'Page Title'}</div>
                      <div className="text-sm text-[#64748B] line-clamp-2">{pages[0].metaDescription || 'Page description...'}</div>
                    </div>
                  </div>
                </div>

                {/* Twitter Preview */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-[#0A3340] rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">X</span>
                    </div>
                    <h3 className="font-semibold text-[#0A3340]">Twitter / X</h3>
                  </div>
                  <div className="border border-[#D7E7E4] rounded-lg overflow-hidden">
                    {pages[0].ogImage ? (
                      <img src={pages[0].ogImage} alt="OG" className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-[#EEF7F5] flex items-center justify-center">
                        <span className="text-[#94A3B8]">No image set</span>
                      </div>
                    )}
                    <div className="p-3">
                      <div className="font-semibold text-[#0A3340]">{pages[0].metaTitle || 'Page Title'}</div>
                      <div className="text-sm text-[#64748B] line-clamp-2">{pages[0].metaDescription || 'Page description...'}</div>
                      <div className="text-xs text-[#64748B] mt-1">kayad.co.ke</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#F3FAF9] border border-[#BDE5DE] rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-[#176B87] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-[#0A3340]">Recommended Image Sizes</h4>
                  <p className="text-sm text-[#12576D] mt-1">
                    Facebook: 1200x630px • Twitter: 1200x600px • LinkedIn: 1200x627px
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'redirects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0A3340]">URL Redirects</h2>
                <button
                  onClick={() => setShowAddRedirect(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]"
                >
                  <Plus size={18} />
                  Add Redirect
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F6FAF9] border-b border-[#D7E7E4]">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">From</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">To</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Status</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-[#64748B] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D7E7E4]">
                    {redirects.map(redirect => (
                      <tr key={redirect.id} className="hover:bg-[#F6FAF9] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link size={14} className="text-[#94A3B8]" />
                            <code className="text-sm bg-[#EEF7F5] px-2 py-1 rounded">{redirect.from}</code>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft size={14} className="text-[#94A3B8]" />
                            <code className="text-sm bg-[#EEF7F5] px-2 py-1 rounded">{redirect.to}</code>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                            {redirect.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-[#EEF7F5] rounded-lg text-[#94A3B8] hover:text-red-500">
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
                <h2 className="text-xl font-bold text-[#0A3340]">XML Sitemap</h2>
                <button className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
                  <RefreshCw size={18} />
                  Regenerate
                </button>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
                <div className="flex items-center gap-3 mb-4">
                  <Sitemap size={24} className="text-[#0A3340]" />
                  <div>
                    <h3 className="font-semibold text-[#0A3340]">Sitemap Status</h3>
                    <p className="text-sm text-[#64748B]">Last generated: 2 hours ago</p>
                  </div>
                  <span className="ml-auto px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">Active</span>
                </div>

                <div className="bg-[#0A3340] rounded-lg p-4 overflow-auto">
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
                  <button className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
                    <Copy size={16} />
                    Copy URL
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
                    <ExternalLink size={16} />
                    Open in Browser
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'robots' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-[#0A3340]">robots.txt Configuration</h2>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
                <div className="bg-[#0A3340] rounded-lg p-4 overflow-auto">
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
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
                    <Save size={16} />
                    Save robots.txt
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'structured' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-[#0A3340]">Structured Data (Schema.org)</h2>

              <div className="grid grid-cols-2 gap-4">
                {['Organization', 'WebSite', 'Product', 'LocalBusiness', 'FAQPage', 'BreadcrumbList'].map(type => (
                  <div key={type} className="bg-white rounded-xl p-4 border border-[#D7E7E4]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-[#0A3340]">{type}</h4>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Enabled</span>
                    </div>
                    <div className="text-sm text-[#64748B]">{type} schema markup</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Page Modal */}
      {selectedPage && (
        <div className="fixed inset-0 bg-[#0A3340]/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#D7E7E4]">
              <h2 className="text-lg font-bold text-[#0A3340]">Edit SEO: {selectedPage.title}</h2>
              <button onClick={() => setSelectedPage(null)} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#12576D] mb-1">Meta Title</label>
                <input
                  type="text"
                  defaultValue={selectedPage.metaTitle}
                  className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] focus:ring-2 focus:ring-[#0A3340]/20 outline-none"
                  placeholder="Enter page title for search engines"
                />
                <p className="text-xs text-[#94A3B8] mt-1">Recommended: 50-60 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#12576D] mb-1">Meta Description</label>
                <textarea
                  defaultValue={selectedPage.metaDescription}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] focus:ring-2 focus:ring-[#0A3340]/20 outline-none resize-none"
                  placeholder="Enter page description for search engines"
                />
                <p className="text-xs text-[#94A3B8] mt-1">Recommended: 150-160 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#12576D] mb-1">Canonical URL</label>
                <input
                  type="text"
                  defaultValue={selectedPage.url}
                  className="w-full px-4 py-2 rounded-lg border border-[#D7E7E4] focus:border-[#0A3340] focus:ring-2 focus:ring-[#0A3340]/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#12576D] mb-1">Open Graph Image</label>
                <div className="flex items-center gap-4">
                  {selectedPage.ogImage ? (
                    <img src={selectedPage.ogImage} alt="OG" className="w-32 h-20 object-cover rounded-lg border border-[#D7E7E4]" />
                  ) : (
                    <div className="w-32 h-20 bg-[#EEF7F5] rounded-lg border border-[#D7E7E4] flex items-center justify-center">
                      <span className="text-[#94A3B8] text-xs">No image</span>
                    </div>
                  )}
                  <button className="px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
                    Upload Image
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#D7E7E4]">
              <button
                onClick={() => setSelectedPage(null)}
                className="px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
