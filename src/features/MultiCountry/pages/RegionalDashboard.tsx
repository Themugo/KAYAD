// ============================================================
// KAYAD MULTI-COUNTRY FRAMEWORK
// REGIONAL DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  MapPin,
  Users,
  Car,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Filter,
  Settings,
  RefreshCw,
  Flag,
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

// Country data
const COUNTRIES = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', status: 'active', isPrimary: true },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX', status: 'active', isPrimary: false },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS', status: 'active', isPrimary: false },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF', status: 'inactive', isPrimary: false },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', currency: 'BIF', status: 'inactive', isPrimary: false },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', currency: 'SSP', status: 'inactive', isPrimary: false },
];

const COUNTRY_ANALYTICS: Record<string, any> = {
  KE: { users: 45678, listings: 12345, vehiclesSold: 2345, revenue: 24500000000, dealers: 1234, growth: 15.2 },
  UG: { users: 12345, listings: 4567, vehiclesSold: 876, revenue: 8760000000, dealers: 345, growth: 22.5 },
  TZ: { users: 23456, listings: 8901, vehiclesSold: 1567, revenue: 12300000000, dealers: 567, growth: 18.3 },
  RW: { users: 0, listings: 0, vehiclesSold: 0, revenue: 0, dealers: 0, growth: 0 },
  BI: { users: 0, listings: 0, vehiclesSold: 0, revenue: 0, dealers: 0, growth: 0 },
  SS: { users: 0, listings: 0, vehiclesSold: 0, revenue: 0, dealers: 0, growth: 0 },
};

const PAYMENT_PROVIDERS: Record<string, any> = {
  KE: [{ code: 'mpesa', name: 'M-Pesa', type: 'Mobile Money', status: 'active' }],
  UG: [],
  TZ: [],
};

const CROSS_BORDER_ROUTES = [
  { from: 'KE', to: 'UG', importDuty: 15, transportDays: 3 },
  { from: 'KE', to: 'TZ', importDuty: 20, transportDays: 2 },
  { from: 'KE', to: 'RW', importDuty: 10, transportDays: 4 },
  { from: 'UG', to: 'KE', importDuty: 15, transportDays: 3 },
  { from: 'TZ', to: 'KE', importDuty: 20, transportDays: 2 },
];

const TAXES = {
  KE: [
    { name: 'VAT', rate: 16, type: 'vehicle & services' },
    { name: 'Stamp Duty', rate: 0.1, type: 'vehicle transfer' },
    { name: 'Import Duty', rate: 25, type: 'imports > KES 500K' },
  ],
  UG: [
    { name: 'VAT', rate: 18, type: 'vehicle & services' },
    { name: 'Withholding Tax', rate: 6, type: 'services' },
  ],
  TZ: [
    { name: 'VAT', rate: 18, type: 'vehicle & services' },
    { name: 'Excise Duty', rate: 10, type: 'vehicles' },
  ],
};

export default function RegionalDashboard() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'countries' | 'payments' | 'compliance'>('overview');

  const tabs = [
    { id: 'overview', label: 'Regional Overview', icon: <Globe size={18} /> },
    { id: 'countries', label: 'Countries', icon: <MapPin size={18} /> },
    { id: 'payments', label: 'Payment Providers', icon: <DollarSign size={18} /> },
    { id: 'compliance', label: 'Compliance', icon: <CheckCircle size={18} /> },
  ];

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { KES: 'KES', UGX: 'USh', TZS: 'TSh', RWF: 'RWF', BIF: 'FBu', SSP: 'SSP' };
    return `${symbols[currency] || currency} ${(amount / 1000000).toFixed(0)}M`;
  };

  const getTotalStats = () => {
    const activeCountries = COUNTRIES.filter(c => c.status === 'active');
    return {
      totalUsers: activeCountries.reduce((sum, c) => sum + (COUNTRY_ANALYTICS[c.code]?.users || 0), 0),
      totalListings: activeCountries.reduce((sum, c) => sum + (COUNTRY_ANALYTICS[c.code]?.listings || 0), 0),
      totalSold: activeCountries.reduce((sum, c) => sum + (COUNTRY_ANALYTICS[c.code]?.vehiclesSold || 0), 0),
      totalRevenue: activeCountries.reduce((sum, c) => sum + (COUNTRY_ANALYTICS[c.code]?.revenue || 0), 0),
      activeCountries: activeCountries.length,
    };
  };

  const stats = getTotalStats();

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
                <h1 className="text-xl font-bold text-white">Multi-Country Framework</h1>
                <p className="text-sm opacity-80">East African Automotive Infrastructure</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <CheckCircle size={16} />
                3 Active Countries
              </span>
              <button className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Settings size={20} color={KAYAD_COLORS.white} />
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Regional Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Users size={24} />}
                label="Total Users"
                value={stats.totalUsers.toLocaleString()}
                change="+12.5%"
              />
              <StatCard
                icon={<Car size={24} />}
                label="Active Listings"
                value={stats.totalListings.toLocaleString()}
                change="+8.3%"
              />
              <StatCard
                icon={<CheckCircle size={24} />}
                label="Vehicles Sold"
                value={stats.totalSold.toLocaleString()}
                change="+15.2%"
              />
              <StatCard
                icon={<DollarSign size={24} />}
                label="Total Revenue"
                value={formatCurrency(stats.totalRevenue, 'KES')}
                change="+18.7%"
              />
            </div>

            {/* Regional Map Placeholder */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>East Africa Coverage</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {COUNTRIES.map((country) => (
                  <div
                    key={country.code}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      country.status === 'active' ? 'border-emerald-500' : 'border-gray-200'
                    }`}
                    style={{ 
                      backgroundColor: country.status === 'active' ? `${KAYAD_COLORS.emerald}08` : KAYAD_COLORS.warmBeige,
                      opacity: country.status === 'active' ? 1 : 0.6
                    }}
                    onClick={() => setSelectedCountry(country.code)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">{country.flag}</span>
                      {country.isPrimary && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{country.name}</p>
                    <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{country.currency}</p>
                    {country.status === 'active' && COUNTRY_ANALYTICS[country.code] && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                          {COUNTRY_ANALYTICS[country.code].users.toLocaleString()} users
                        </p>
                      </div>
                    )}
                    {country.status === 'inactive' && (
                      <span className="mt-2 text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Coming Soon</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cross-Border Routes */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Cross-Border Routes</h3>
              <div className="space-y-3">
                {CROSS_BORDER_ROUTES.map((route, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-3">
                      <Flag size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                      <span style={{ color: KAYAD_COLORS.lightNavy }}>
                        {COUNTRIES.find(c => c.code === route.from)?.flag} {route.from} → {route.to} {COUNTRIES.find(c => c.code === route.to)?.flag}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Import Duty</p>
                        <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{route.importDuty}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Transit</p>
                        <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{route.transportDays} days</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Countries Tab */}
        {activeTab === 'countries' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Country Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {COUNTRIES.map((country) => (
                <motion.div
                  key={country.code}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-6 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-5xl">{country.flag}</span>
                      <div>
                        <h3 className="text-xl font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                          {country.name}
                        </h3>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{country.code} • {country.currency}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                      country.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {country.status}
                    </span>
                  </div>

                  {country.status === 'active' && COUNTRY_ANALYTICS[country.code] && (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Users</p>
                        <p className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                          {(COUNTRY_ANALYTICS[country.code].users / 1000).toFixed(0)}K
                        </p>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Listings</p>
                        <p className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                          {(COUNTRY_ANALYTICS[country.code].listings / 1000).toFixed(1)}K
                        </p>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Growth</p>
                        <p className="text-lg font-bold" style={{ color: KAYAD_COLORS.emerald }}>
                          +{COUNTRY_ANALYTICS[country.code].growth}%
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                      Configure
                    </button>
                    <button className="flex-1 px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                      {country.status === 'active' ? 'Manage' : 'Activate'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Payment Providers by Country</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {['KE', 'UG', 'TZ'].map((code) => {
                const country = COUNTRIES.find(c => c.code === code)!;
                const providers = PAYMENT_PROVIDERS[code] || [];
                return (
                  <div key={code} className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{country.flag}</span>
                      <div>
                        <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{country.name}</h3>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{country.currency}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {providers.map((provider: any) => (
                        <div key={provider.code} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                          <div className="flex items-center gap-3">
                            <DollarSign size={18} style={{ color: KAYAD_COLORS.softBlue }} />
                            <div>
                              <p className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{provider.name}</p>
                              <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{provider.type}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                            {provider.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Tax & Compliance Configuration</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {['KE', 'UG', 'TZ'].map((code) => {
                const country = COUNTRIES.find(c => c.code === code)!;
                const taxes = TAXES[code] || [];
                return (
                  <div key={code} className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{country.flag}</span>
                      <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{country.name}</h3>
                    </div>
                    <div className="space-y-3">
                      {taxes.map((tax: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{tax.name}</p>
                            <span className="font-bold" style={{ color: KAYAD_COLORS.emerald }}>{tax.rate}%</span>
                          </div>
                          <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{tax.type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Components
function StatCard({ icon, label, value, change }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div style={{ color: KAYAD_COLORS.softBlue }}>{icon}</div>
      </div>
      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
        {change && (
          <span className="text-xs font-medium flex items-center gap-1" style={{ color: KAYAD_COLORS.emerald }}>
            <TrendingUp size={12} />
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}
