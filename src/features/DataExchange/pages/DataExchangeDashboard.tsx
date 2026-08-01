// ============================================================
// KAYAD AUTOMOTIVE DATA EXCHANGE
// DATA INTELLIGENCE DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Car,
  Users,
  Gavel,
  Shield,
  DollarSign,
  MapPin,
  FileText,
  Download,
  ExternalLink,
  Lock,
  Eye,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Database,
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
const MARKET_OVERVIEW = {
  totalActiveListings: 12453,
  vehiclesSoldThisMonth: 2345,
  avgDaysToSell: 21,
  avgListingPrice: 2450000,
  avgSalePrice: 2380000,
  marketTrend: 'up',
  trendChange: 2.3,
  demandScore: 78,
  supplyScore: 65,
};

const PRICE_INDEX = {
  currentValue: 124.5,
  previousValue: 122.8,
  change: 1.7,
  changePercentage: 1.38,
  categories: {
    sedan: { value: 118.3, change: 1.2 },
    suv: { value: 131.5, change: 2.4 },
    truck: { value: 118.3, change: 0.8 },
    compact: { value: 122.1, change: 1.5 },
    luxury: { value: 128.7, change: -0.5 },
  },
};

const POPULAR_VEHICLES = [
  { rank: 1, make: 'Toyota', model: 'Corolla', popularity: 95, avgPrice: 2650000, trend: 'up' },
  { rank: 2, make: 'Toyota', model: 'Land Cruiser', popularity: 92, avgPrice: 8500000, trend: 'up' },
  { rank: 3, make: 'Nissan', model: 'X-Trail', popularity: 85, avgPrice: 3200000, trend: 'up' },
  { rank: 4, make: 'Honda', model: 'Civic', popularity: 82, avgPrice: 2800000, trend: 'stable' },
  { rank: 5, make: 'Mercedes-Benz', model: 'C-Class', popularity: 78, avgPrice: 4500000, trend: 'down' },
];

const REGIONAL_DATA = [
  { region: 'Nairobi', listings: 5234, avgPrice: 2650000, trend: 'up', growth: 12.5 },
  { region: 'Mombasa', listings: 2156, avgPrice: 2450000, trend: 'stable', growth: 5.2 },
  { region: 'Kisumu', listings: 1234, avgPrice: 2200000, trend: 'up', growth: 8.7 },
  { region: 'Nakuru', listings: 1567, avgPrice: 2100000, trend: 'up', growth: 15.3 },
];

const DATA_PRODUCTS = [
  { code: 'market-overview', name: 'Market Overview', access: 'public', price: 'Free', updated: 'Daily' },
  { code: 'price-index', name: 'KAYAD Price Index', access: 'public', price: 'Free', updated: 'Monthly' },
  { code: 'dealer-benchmarks', name: 'Dealer Benchmarks', access: 'partner', price: 'KES 30K/mo', updated: 'Weekly' },
  { code: 'regional-insights', name: 'Regional Insights', access: 'commercial', price: 'KES 50K/mo', updated: 'Weekly' },
  { code: 'bank-dashboard', name: 'Bank Intelligence', access: 'commercial', price: 'Custom', updated: 'Daily' },
  { code: 'government-reports', name: 'Government Reports', access: 'internal', price: 'Free', updated: 'Monthly' },
];

const MARKET_REPORTS = [
  { name: 'July 2026 Market Report', type: 'monthly', date: '2026-07-25', access: 'public' },
  { name: 'Q2 2026 Quarterly Review', type: 'quarterly', date: '2026-07-01', access: 'partner' },
  { name: 'EV Adoption Report 2026', type: 'special', date: '2026-06-15', access: 'commercial' },
];

export default function DataExchangeDashboard() {
  const [activeTab, setActiveTab] = useState<'market' | 'trends' | 'regions' | 'products'>('market');

  const tabs = [
    { id: 'market', label: 'Market Overview', icon: <BarChart3 size={18} /> },
    { id: 'trends', label: 'Price Trends', icon: <TrendingUp size={18} /> },
    { id: 'regions', label: 'Regional', icon: <MapPin size={18} /> },
    { id: 'products', label: 'Data Products', icon: <Database size={18} /> },
  ];

  const formatCurrency = (amount: number) => {
    return `KES ${(amount / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Database size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">KAYAD Data Exchange</h1>
                <p className="text-sm opacity-80">East Africa's Automotive Intelligence Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <Shield size={16} />
                Verified Data
              </span>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                <Download size={16} />
                Export
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

        {/* Market Overview Tab */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Active Listings', value: MARKET_OVERVIEW.totalActiveListings.toLocaleString(), icon: <Car size={20} />, change: '+5.2%' },
                { label: 'Sold This Month', value: MARKET_OVERVIEW.vehiclesSoldThisMonth.toLocaleString(), icon: <Activity size={20} />, change: '+12.3%' },
                { label: 'Avg Days to Sell', value: `${MARKET_OVERVIEW.avgDaysToSell} days`, icon: <Clock size={20} />, change: '-2 days' },
                { label: 'Avg Sale Price', value: formatCurrency(MARKET_OVERVIEW.avgSalePrice), icon: <DollarSign size={20} />, change: '+2.3%' },
                { label: 'Demand Score', value: `${MARKET_OVERVIEW.demandScore}/100`, icon: <TrendingUp size={20} />, change: '+3 pts' },
              ].map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex items-center gap-2 mb-2" style={{ color: KAYAD_COLORS.softBlue }}>
                    {metric.icon}
                    <span className="text-sm">{metric.label}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                    {metric.value}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {metric.change.startsWith('+') || metric.change.startsWith('-') ? (
                      <TrendingUp size={14} style={{ color: KAYAD_COLORS.emerald }} />
                    ) : null}
                    <span className="text-xs" style={{ color: KAYAD_COLORS.emerald }}>{metric.change}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Price Index */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>KAYAD Price Index</h3>
                <div className="flex items-end gap-4 mb-6">
                  <p className="text-4xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{PRICE_INDEX.currentValue}</p>
                  <div className="flex items-center gap-1 pb-1">
                    {PRICE_INDEX.change > 0 ? (
                      <ArrowUpRight size={20} style={{ color: KAYAD_COLORS.emerald }} />
                    ) : (
                      <ArrowDownRight size={20} style={{ color: KAYAD_COLORS.red }} />
                    )}
                    <span className="font-medium" style={{ color: PRICE_INDEX.change > 0 ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                      {PRICE_INDEX.changePercentage}%
                    </span>
                  </div>
                  <span className="text-sm pb-1" style={{ color: KAYAD_COLORS.softBlue }}>vs last month</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(PRICE_INDEX.categories).map(([key, cat]: [string, any]) => (
                    <div key={key} className="p-3 rounded-lg text-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <p className="text-xs capitalize mb-1" style={{ color: KAYAD_COLORS.softBlue }}>{key}</p>
                      <p className="font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{cat.value}</p>
                      <p className="text-xs" style={{ color: cat.change >= 0 ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                        {cat.change >= 0 ? '+' : ''}{cat.change}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Popular Vehicles */}
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Most Popular Vehicles</h3>
                <div className="space-y-3">
                  {POPULAR_VEHICLES.map((vehicle) => (
                    <div key={vehicle.rank} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${KAYAD_COLORS.purple}20`, color: KAYAD_COLORS.purple }}>
                          {vehicle.rank}
                        </span>
                        <div>
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{vehicle.make} {vehicle.model}</p>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{formatCurrency(vehicle.avgPrice)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{vehicle.popularity}%</p>
                          <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Popularity</p>
                        </div>
                        {vehicle.trend === 'up' ? (
                          <TrendingUp size={16} style={{ color: KAYAD_COLORS.emerald }} />
                        ) : vehicle.trend === 'down' ? (
                          <TrendingDown size={16} style={{ color: KAYAD_COLORS.red }} />
                        ) : (
                          <span className="w-4 h-4 rounded" style={{ backgroundColor: KAYAD_COLORS.softBlue }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Vehicle Price Trends</h3>
              <div className="h-64 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                <p style={{ color: KAYAD_COLORS.softBlue }}>Interactive price trend chart</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>7 Day Change</p>
                  <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>+0.8%</p>
                </div>
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>30 Day Change</p>
                  <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>+2.3%</p>
                </div>
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>90 Day Change</p>
                  <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>+4.1%</p>
                </div>
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>1 Year Change</p>
                  <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>+12.5%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regional Tab */}
        {activeTab === 'regions' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Regional Performance</h3>
              <div className="space-y-4">
                {REGIONAL_DATA.map((region, i) => (
                  <motion.div
                    key={region.region}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-lg border-l-4"
                    style={{ backgroundColor: KAYAD_COLORS.warmBeige, borderLeftColor: KAYAD_COLORS.purple }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <MapPin size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                        <div>
                          <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{region.region}</p>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{region.listings.toLocaleString()} listings</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Avg Price</p>
                          <p className="font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{formatCurrency(region.avgPrice)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Growth</p>
                          <p className="font-bold flex items-center gap-1" style={{ color: region.growth > 0 ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                            {region.growth > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {region.growth}%
                          </p>
                        </div>
                        {region.trend === 'up' ? (
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                            Trending Up
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                            Stable
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Available Data Products</h3>
                <div className="space-y-3">
                  {DATA_PRODUCTS.map((product, i) => (
                    <div key={product.code} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                          {product.access === 'public' ? (
                            <Eye size={20} style={{ color: KAYAD_COLORS.purple }} />
                          ) : product.access === 'partner' ? (
                            <Users size={20} style={{ color: KAYAD_COLORS.purple }} />
                          ) : (
                            <Lock size={20} style={{ color: KAYAD_COLORS.purple }} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{product.name}</p>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Updated {product.updated}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                          {product.access}
                        </span>
                        <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{product.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Market Reports</h3>
                <div className="space-y-3">
                  {MARKET_REPORTS.map((report, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-center gap-3">
                        <FileText size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                        <div>
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{report.name}</p>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{report.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                          {report.access}
                        </span>
                        <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.white }}>
                          <Download size={16} style={{ color: KAYAD_COLORS.softBlue }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* API Access */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>API Access</h3>
              <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>Data Exchange API v1</p>
                    <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Programmatic access to KAYAD automotive data</p>
                  </div>
                  <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                    <ExternalLink size={16} />
                    View Docs
                  </button>
                </div>
                <code className="text-sm p-2 rounded block" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.softBlue }}>
                  GET https://api.kayad.co.ke/v1/data/market/overview
                </code>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
