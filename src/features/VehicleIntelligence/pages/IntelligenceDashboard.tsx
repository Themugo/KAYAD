// ============================================================
// KAYAD VEHICLE INTELLIGENCE NETWORK - ANALYTICS DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  DollarSign,
  Car,
  Users,
  Gavel,
  ClipboardCheck,
  Eye,
  Search,
  Activity,
  Zap,
  Target,
  Globe,
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
};

// Sample analytics data
const MARKET_DATA = {
  activeListings: 2458,
  avgListingPrice: 2850000,
  totalSales: 892,
  avgSalePrice: 2650000,
  priceChange30d: 3.2,
  avgDaysOnMarket: 42,
  demandIndex: 78,
  supplyIndex: 45,
  marketBalance: 'seller_market',
};

const TOP_MAKES = [
  { make: 'Toyota', count: 456, avgPrice: 2400000 },
  { make: 'Mercedes-Benz', count: 234, avgPrice: 5800000 },
  { make: 'BMW', count: 189, avgPrice: 4500000 },
  { make: 'Nissan', count: 167, avgPrice: 2100000 },
  { make: 'Volkswagen', count: 145, avgPrice: 1950000 },
];

const FRAUD_ALERTS = [
  { id: 1, type: 'mileage_inconsistency', severity: 'high', title: 'Mileage Decrease Detected', confidence: 85, vin: 'JTMCVREV0LD123456' },
  { id: 2, type: 'duplicate_listing', severity: 'medium', title: 'Duplicate Vehicle Listing', confidence: 72, vin: 'JMZGG12F561234567' },
  { id: 3, type: 'price_manipulation', severity: 'low', title: 'Suspiciously High Price', confidence: 60, vin: 'WVWZZZ3CZWE890123' },
];

const VEHICLE_VALUATIONS = [
  { vehicle: 'Toyota Corolla 2022', mileage: 15000, currentValue: 2650000, wholesaleValue: 2250000, confidence: 'high' },
  { vehicle: 'Mercedes C-Class 2021', mileage: 28000, currentValue: 4200000, wholesaleValue: 3570000, confidence: 'medium' },
  { vehicle: 'BMW 3 Series 2020', mileage: 35000, currentValue: 3850000, wholesaleValue: 3270000, confidence: 'high' },
];

const MARKET_TRENDS = [
  { month: 'Aug', listings: 2100, sales: 720 },
  { month: 'Sep', listings: 2250, sales: 780 },
  { month: 'Oct', listings: 2380, sales: 820 },
  { month: 'Nov', listings: 2400, sales: 845 },
  { month: 'Dec', listings: 2350, sales: 810 },
  { month: 'Jan', listings: 2458, sales: 892 },
];

export default function IntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'valuation' | 'fraud' | 'market'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
    { id: 'valuation', label: 'Valuation', icon: <DollarSign size={18} /> },
    { id: 'fraud', label: 'Fraud Detection', icon: <Shield size={18} /> },
    { id: 'market', label: 'Market', icon: <TrendingUp size={18} /> },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Brain size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Vehicle Intelligence Network</h1>
                <p className="text-sm opacity-80">AI-Powered Automotive Insights</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                Live
              </span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Updated: Just now
              </span>
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={<Car size={24} />}
                label="Active Listings"
                value={MARKET_DATA.activeListings.toLocaleString()}
                change="+12%"
                positive
              />
              <MetricCard
                icon={<DollarSign size={24} />}
                label="Avg Listing Price"
                value={`KES ${(MARKET_DATA.avgListingPrice / 1000000).toFixed(1)}M`}
                change={`${MARKET_DATA.priceChange30d > 0 ? '+' : ''}${MARKET_DATA.priceChange30d}%`}
                positive={MARKET_DATA.priceChange30d > 0}
              />
              <MetricCard
                icon={<Gavel size={24} />}
                label="Total Sales (30d)"
                value={MARKET_DATA.totalSales.toLocaleString()}
                change="+8%"
                positive
              />
              <MetricCard
                icon={<Shield size={24} />}
                label="Fraud Alerts"
                value={FRAUD_ALERTS.length.toString()}
                change="Active"
                alert={FRAUD_ALERTS.length > 0}
              />
            </div>

            {/* Market Balance & Demand */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Market Balance</h3>
                <div className="flex items-center justify-center py-8">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke={KAYAD_COLORS.warmBeige}
                        strokeWidth="20"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke={MARKET_DATA.marketBalance === 'seller_market' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber}
                        strokeWidth="20"
                        strokeDasharray={`${(MARKET_DATA.demandIndex / 100) * 440} 440`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                        {MARKET_DATA.demandIndex}
                      </span>
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Demand Index</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <span
                    className="px-4 py-2 rounded-full text-sm font-medium capitalize"
                    style={{ 
                      backgroundColor: MARKET_DATA.marketBalance === 'seller_market' ? `${KAYAD_COLORS.emerald}20` : `${KAYAD_COLORS.amber}20`,
                      color: MARKET_DATA.marketBalance === 'seller_market' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber,
                    }}
                  >
                    {MARKET_DATA.marketBalance.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="rounded-xl p-6 shadow-md lg:col-span-2" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Market Trends</h3>
                <div className="h-48 flex items-end gap-4">
                  {MARKET_TRENDS.map((trend, index) => (
                    <div key={trend.month} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{ 
                          height: `${(trend.sales / 1000) * 100}%`,
                          backgroundColor: KAYAD_COLORS.emerald,
                          opacity: 0.6 + (index * 0.06),
                        }}
                      />
                      <span className="text-xs mt-2" style={{ color: KAYAD_COLORS.softBlue }}>{trend.month}</span>
                      <span className="text-xs font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{trend.sales}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: KAYAD_COLORS.emerald }} />
                    <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Sales</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Makes */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Top Makes by Volume</h3>
              <div className="space-y-4">
                {TOP_MAKES.map((make, index) => (
                  <div key={make.make} className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{make.make}</span>
                        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{make.count} listings</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <div
                          className="h-full rounded-full"
                          style={{ 
                            width: `${(make.count / TOP_MAKES[0].count) * 100}%`,
                            backgroundColor: KAYAD_COLORS.emerald,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
                      KES {(make.avgPrice / 1000000).toFixed(1)}M avg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Valuation Tab */}
        {activeTab === 'valuation' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Vehicle Valuations</h3>
              <p className="text-sm mb-6" style={{ color: KAYAD_COLORS.softBlue }}>
                AI-powered valuations based on market data, condition, and comparable sales.
              </p>
              <div className="space-y-4">
                {VEHICLE_VALUATIONS.map((valuation, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border"
                    style={{ borderColor: KAYAD_COLORS.warmBeige }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{valuation.vehicle}</h4>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{valuation.mileage.toLocaleString()} km</p>
                      </div>
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: valuation.confidence === 'high' ? `${KAYAD_COLORS.emerald}20` : `${KAYAD_COLORS.amber}20`,
                          color: valuation.confidence === 'high' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber,
                        }}
                      >
                        {valuation.confidence} confidence
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <p className="text-xs mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Current Value</p>
                        <p className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>KES {valuation.currentValue.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <p className="text-xs mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Wholesale</p>
                        <p className="text-lg font-bold" style={{ color: KAYAD_COLORS.softBlue }}>KES {valuation.wholesaleValue.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.emerald}10` }}>
                        <p className="text-xs mb-1" style={{ color: KAYAD_COLORS.softBlue }}>Private Sale</p>
                        <p className="text-lg font-bold" style={{ color: KAYAD_COLORS.emerald }}>KES {(valuation.currentValue * 1.08).toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fraud Tab */}
        {activeTab === 'fraud' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Fraud Detection Alerts</h3>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Suspicious patterns detected by AI analysis</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: `${KAYAD_COLORS.amber}20`, color: KAYAD_COLORS.amber }}>
                  {FRAUD_ALERTS.length} Active
                </span>
              </div>
              <div className="space-y-4">
                {FRAUD_ALERTS.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border-2"
                    style={{ borderColor: alert.severity === 'high' ? KAYAD_COLORS.red : alert.severity === 'medium' ? KAYAD_COLORS.amber : KAYAD_COLORS.softBlue }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${alert.severity === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.amber}20` }}>
                          <AlertTriangle size={20} style={{ color: alert.severity === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.amber }} />
                        </div>
                        <div>
                          <h4 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{alert.title}</h4>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>VIN: {alert.vin}</p>
                          <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Confidence: {alert.confidence}%</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                          Investigate
                        </button>
                        <button className="px-3 py-1 rounded text-sm font-medium" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Fraud Detection Types */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-4 shadow-md text-center" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.red}20` }}>
                  <Activity size={24} style={{ color: KAYAD_COLORS.red }} />
                </div>
                <h4 className="font-medium mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>Mileage Check</h4>
                <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Active monitoring</p>
              </div>
              <div className="rounded-xl p-4 shadow-md text-center" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.amber}20` }}>
                  <Copy size={24} style={{ color: KAYAD_COLORS.amber }} />
                </div>
                <h4 className="font-medium mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>Duplicate Check</h4>
                <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Active monitoring</p>
              </div>
              <div className="rounded-xl p-4 shadow-md text-center" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20` }}>
                  <DollarSign size={24} style={{ color: KAYAD_COLORS.emerald }} />
                </div>
                <h4 className="font-medium mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>Price Analysis</h4>
                <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Active monitoring</p>
              </div>
              <div className="rounded-xl p-4 shadow-md text-center" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20` }}>
                  <Target size={24} style={{ color: KAYAD_COLORS.softBlue }} />
                </div>
                <h4 className="font-medium mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>VIN Validation</h4>
                <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Active monitoring</p>
              </div>
            </div>
          </div>
        )}

        {/* Market Tab */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-6" style={{ color: KAYAD_COLORS.lightNavy }}>Market Intelligence</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>12,458</p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Total Vehicles Analyzed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>KSh 2.4B</p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Total Market Value</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>892</p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Verified Sales (30d)</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>45</p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Avg Days to Sell</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                <h4 className="font-medium mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Intelligence Sources</h4>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                    <Car size={14} className="inline mr-1" /> Marketplace Listings
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                    <ClipboardCheck size={14} className="inline mr-1" /> Inspection Reports
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                    <Gavel size={14} className="inline mr-1" /> Auction Results
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                    <Search size={14} className="inline mr-1" /> Search Trends
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                    <Eye size={14} className="inline mr-1" /> View Analytics
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, change, positive, alert }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  alert?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: alert ? `${KAYAD_COLORS.amber}20` : `${KAYAD_COLORS.softBlue}15` }}
        >
          {icon}
        </div>
        {alert && (
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: KAYAD_COLORS.amber }} />
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
        {change && (
          <span className={`text-xs font-medium flex items-center gap-1 ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// Brain Icon Component
function Brain({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0 1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08A2.5 2.5 0 0 0 12 19.5a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0-1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-2.96-3.08A2.5 2.5 0 0 0 12 4.5" />
      <path d="m15.7 10.4-.9.4" />
      <path d="m9.2 13.2-.9.4" />
      <path d="m13.6 15.7.4-.9" />
      <path d="m10.8 9.2.4-.9" />
      <path d="m15.7 13.5.9.4" />
      <path d="m9.2 10.9.9.4" />
      <path d="m10.4 15.7-.4.9" />
      <path d="m13.1 9.2-.4.9" />
    </svg>
  );
}

// Copy Icon Component
function Copy({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
