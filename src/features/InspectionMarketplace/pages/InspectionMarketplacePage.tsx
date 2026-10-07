// ============================================================
// KAYAD INSPECTION MARKETPLACE - MAIN PAGE
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, MapPin, Star, Clock, Shield, Wrench, Car, Zap } from 'lucide-react';
import { inspectionApi, SearchProvidersParams } from '../services/api';
import type { InspectionProvider, InspectionType } from '../types/inspection';
import { INSPECTION_TYPES } from '../types/inspection';
import ProviderCard from '../components/ProviderCard';
import ProviderFilters from '../components/ProviderFilters';
import BookingFlow from './BookingFlow';
import ProviderProfilePage from './ProviderProfilePage';

const KAYAD_COLORS = {
  lightNavy: '#12576D',
  warmBeige: '#F5F8F8',
  white: '#ffffff',
  emerald: '#13B8A6',
  mutedTerracotta: '#B8EEE7',
  softBlue: '#64748b',
};

export default function InspectionMarketplacePage() {
  const [providers, setProviders] = useState<InspectionProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<InspectionProvider | null>(null);
  const [selectedProviderLoading, setSelectedProviderLoading] = useState(false);
  const [selectedProviderError, setSelectedProviderError] = useState<string | null>(null);
  const [bookingProvider, setBookingProvider] = useState<InspectionProvider | null>(null);
  const [filters, setFilters] = useState<SearchProvidersParams>({
    page: 1,
    limit: 12,
    sortBy: 'rating',
    verified: true,
  });

  useEffect(() => {
    fetchProviders();
  }, [filters]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await inspectionApi.searchProviders(filters);
      setProviders(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = async (provider: InspectionProvider) => {
    setSelectedProviderLoading(true);
    setSelectedProviderError(null);
    try {
      const full = await inspectionApi.getProviderProfile(provider.id);
      setSelectedProvider(full);
    } catch (error) {
      console.error('Failed to load provider profile:', error);
      setSelectedProviderError('Could not load this provider profile. Please try again.');
    } finally {
      setSelectedProviderLoading(false);
    }
  };

  if (bookingProvider) {
    return <BookingFlow provider={bookingProvider} onCancel={() => setBookingProvider(null)} onComplete={() => setBookingProvider(null)} />;
  }

  if (selectedProvider) {
    return (
      <ProviderProfilePage
        provider={selectedProvider}
        loading={selectedProviderLoading}
        error={selectedProviderError}
        onBack={() => setSelectedProvider(null)}
        onBook={() => setBookingProvider(selectedProvider)}
      />
    );
  }

  const handleSearch = (query: string) => {
    // The public provider search contract supports county/town, not free-text
    // provider-name search. Keep the input honest instead of sending a
    // provider name as a county filter.
    setFilters(prev => ({ ...prev, county: query.trim() || undefined, page: 1 }));
  };

  const handleFilterChange = (newFilters: Partial<SearchProvidersParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const totalPages = Math.ceil(total / (filters.limit || 12));

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header
        className="py-12 px-4"
        style={{ backgroundColor: KAYAD_COLORS.lightNavy }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: KAYAD_COLORS.white }}
            >
              Find an Inspection Provider
            </h1>
            <p
              className="text-xl mb-8 max-w-2xl mx-auto"
              style={{ color: KAYAD_COLORS.mutedTerracotta }}
            >
              Compare available inspection providers by location, service, verification status and published availability.
            </p>
          </motion.div>

          <div className="max-w-2xl mx-auto mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 text-[11px] text-slate-300">
            <span>Looking to provide inspection services?</span>
            <button type="button" className="font-bold text-[#B8EEE7] hover:text-white underline underline-offset-2" onClick={() => window.dispatchEvent(new CustomEvent('kayad:open-inspection-provider-application'))}>Apply to join KAYAD</button>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2"
                style={{ color: KAYAD_COLORS.softBlue }}
                size={20}
              />
              <input
                type="text"
                placeholder="Search by county or town..."
                className="w-full pl-12 pr-4 py-4 rounded-lg border-2 border-transparent focus:border-[#13B8A6] outline-none shadow-lg"
                style={{ backgroundColor: KAYAD_COLORS.white }}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: showFilters ? KAYAD_COLORS.emerald : KAYAD_COLORS.warmBeige,
                  color: showFilters ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy
                }}
              >
                <Filter size={20} />
              </button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="max-w-7xl mx-auto px-4 py-6"
        >
          <ProviderFilters
            filters={filters}
            onChange={handleFilterChange}
          />
        </motion.div>
      )}

      {/* Quick Stats */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStatCard
            icon={<Shield className="text-[#13B8A6]" size={24} />}
            label="Providers found"
            value={String(total)}
          />
          <QuickStatCard
            icon={<Car className="text-[#176B87]" size={24} />}
            label="Service types"
            value={String(INSPECTION_TYPES.length)}
          />
          <QuickStatCard
            icon={<Star className="text-[#2F8F87]" size={24} />}
            label="Provider standard"
            value="Verified profiles"
          />
          <QuickStatCard
            icon={<Clock className="text-[#5AAFA4]" size={24} />}
            label="Scheduling"
            value="Filter available"
          />
        </div>
      </section>

      {/* Service types */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <h2
          className="text-2xl font-bold mb-6"
          style={{ color: KAYAD_COLORS.lightNavy }}
        >
          Service types
        </h2>
        <div className="flex flex-wrap gap-3">
          {INSPECTION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleFilterChange({ inspectionType: type.value as InspectionType })}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                filters.inspectionType === type.value
                  ? 'text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: filters.inspectionType === type.value
                  ? KAYAD_COLORS.emerald
                  : KAYAD_COLORS.white,
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      {selectedProviderLoading && (
        <div className="max-w-7xl mx-auto px-4 pb-4 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Loading provider profile…</div>
      )}
      {selectedProviderError && (
        <div className="max-w-7xl mx-auto px-4 pb-4 text-sm" role="alert" style={{ color: '#b91c1c' }}>{selectedProviderError}</div>
      )}

      {/* Results */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex justify-between items-center mb-6">
          <p style={{ color: KAYAD_COLORS.softBlue }}>
            Showing {providers.length} of {total} providers
          </p>
          <select
            value={filters.sortBy || 'rating'}
            onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
            className="px-4 py-2 rounded-lg border outline-none"
            style={{
              backgroundColor: KAYAD_COLORS.white,
              borderColor: '#D7E7E4',
              color: KAYAD_COLORS.lightNavy
            }}
          >
            <option value="rating">Highest Rated</option>
            <option value="reviews">Most Reviews</option>
            <option value="completions">Most Inspections</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl h-80"
                style={{ backgroundColor: KAYAD_COLORS.white }}
              />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <Wrench
              className="mx-auto mb-4"
              size={64}
              style={{ color: KAYAD_COLORS.mutedTerracotta }}
            />
            <h3
              className="text-xl font-semibold mb-2"
              style={{ color: KAYAD_COLORS.lightNavy }}
            >
              No providers found
            </h3>
            <p style={{ color: KAYAD_COLORS.softBlue }}>
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} onSelect={handleSelectProvider} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}
            >
              Previous
            </button>
            <span
              className="px-4 py-2"
              style={{ color: KAYAD_COLORS.softBlue }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}
            >
              Next
            </button>
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="rounded-xl border border-[#D7E7E4] bg-white px-5 py-4 text-sm text-slate-600">
          <span className="font-semibold text-[#0F5D73]">Provider access:</span> provider onboarding and business controls are exposed only through the authenticated provider workflow. This public discovery surface does not invent an application route.
        </div>
      </section>
    </div>
  );
}

function QuickStatCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-xl shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
          {label}
        </span>
      </div>
      <p
        className="text-2xl font-bold"
        style={{ color: KAYAD_COLORS.lightNavy }}
      >
        {value}
      </p>
    </motion.div>
  );
}
