import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, Filter, Grid, List, SlidersHorizontal, X, ChevronDown, 
  MapPin, Heart, Share2, GitCompare, Eye, Clock, CheckCircle2,
  Shield, ShieldCheck, Star, TrendingUp, TrendingDown, Car, Truck,
  Zap, CreditCard, Calendar, Gauge, Settings2, Fuel, Building2,
  Phone, Mail, ArrowRight, Loader2, Sparkles, SortAsc, BookmarkPlus,
  AlertCircle, Gavel, Award, FileCheck, Percent, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { VehicleCard } from '../VehicleCard';

// ============================================================
// TYPES
// ============================================================

interface Vehicle {
  _id: string;
  title: string;
  price: number;
  originalPrice?: number;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  bodyType: string;
  driveType?: string;
  color?: string;
  location: string;
  images: string[];
  dealer: {
    name: string;
    logo?: string;
    rating?: number;
    verified: boolean;
    responseTime?: string;
  };
  inspectionStatus?: 'completed' | 'pending' | 'none';
  inspectionScore?: number;
  financeAvailable?: boolean;
  featured?: boolean;
  isNew?: boolean;
  isAuction?: boolean;
  auctionStatus?: 'live' | 'upcoming' | 'ended';
  currentBid?: number;
  badge?: 'new' | 'reduced' | 'featured' | 'hot';
  marketPrice?: number;
}

interface FilterState {
  make: string;
  model: string;
  yearMin: number;
  yearMax: number;
  priceMin: number;
  priceMax: number;
  mileageMin: number;
  mileageMax: number;
  fuel: string[];
  transmission: string[];
  bodyType: string[];
  condition: string[];
  location: string[];
  inspection: boolean;
  financeEligible: boolean;
  verifiedDealer: boolean;
  auction: boolean;
  featured: boolean;
}

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_VEHICLES: Vehicle[] = [
  {
    _id: '1',
    title: 'Toyota Land Cruiser 300 GX-R',
    price: 3200000,
    year: 2023,
    mileage: 15000,
    fuel: 'Diesel',
    transmission: 'Automatic',
    bodyType: 'SUV',
    location: 'Nairobi',
    images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800'],
    dealer: { name: 'Nairobi Auto Hub', rating: 4.8, verified: true },
    inspectionStatus: 'completed',
    inspectionScore: 94,
    financeAvailable: true,
    featured: true,
  },
  {
    _id: '2',
    title: 'Mercedes-Benz GLE 450 4MATIC',
    price: 1850000,
    originalPrice: 2100000,
    year: 2022,
    mileage: 28000,
    fuel: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'SUV',
    location: 'Mombasa',
    images: ['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800'],
    dealer: { name: 'Premium Motors KE', rating: 4.9, verified: true },
    inspectionStatus: 'completed',
    inspectionScore: 97,
    financeAvailable: true,
    badge: 'reduced',
  },
  {
    _id: '3',
    title: 'BMW X5 M Sport',
    price: 1650000,
    year: 2021,
    mileage: 42000,
    fuel: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'SUV',
    location: 'Nairobi',
    images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'],
    dealer: { name: 'German Auto Centre', rating: 4.7, verified: true },
    inspectionStatus: 'completed',
    inspectionScore: 91,
    financeAvailable: true,
  },
  {
    _id: '4',
    title: 'Porsche Cayenne S',
    price: 2450000,
    year: 2022,
    mileage: 18000,
    fuel: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'SUV',
    location: 'Nairobi',
    images: ['https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800'],
    dealer: { name: 'Luxury Auto KE', rating: 4.9, verified: true },
    inspectionStatus: 'completed',
    inspectionScore: 99,
    financeAvailable: true,
    badge: 'featured',
  },
  {
    _id: '5',
    title: 'Range Rover Autobiography',
    price: 3200000,
    year: 2023,
    mileage: 8000,
    fuel: 'Diesel',
    transmission: 'Automatic',
    bodyType: 'SUV',
    location: 'Kisumu',
    images: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'],
    dealer: { name: 'Elite Motors', rating: 4.8, verified: true },
    inspectionStatus: 'completed',
    inspectionScore: 96,
    financeAvailable: true,
    isNew: true,
  },
  {
    _id: '6',
    title: 'Ford Ranger Wildtrak',
    price: 850000,
    year: 2022,
    mileage: 35000,
    fuel: 'Diesel',
    transmission: 'Automatic',
    bodyType: 'Pickup',
    location: 'Nairobi',
    images: ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'],
    dealer: { name: 'Auto Trust Kenya', rating: 4.5, verified: true },
    inspectionStatus: 'completed',
    inspectionScore: 88,
    financeAvailable: true,
  },
  {
    _id: '7',
    title: 'Toyota Corolla Cross',
    price: 680000,
    year: 2023,
    mileage: 12000,
    fuel: 'Hybrid',
    transmission: 'Automatic',
    bodyType: 'SUV',
    location: 'Nairobi',
    images: ['https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800'],
    dealer: { name: 'Green Motors', rating: 4.6, verified: false },
    inspectionStatus: 'pending',
    financeAvailable: true,
  },
  {
    _id: '8',
    title: 'Audi Q7 S Line',
    price: 1950000,
    year: 2021,
    mileage: 48000,
    fuel: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'SUV',
    location: 'Mombasa',
    images: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'],
    dealer: { name: 'German Auto Centre', rating: 4.7, verified: true },
    inspectionStatus: 'completed',
    inspectionScore: 93,
    financeAvailable: true,
    isAuction: true,
    auctionStatus: 'live',
    currentBid: 1800000,
  },
];

const POPULAR_MAKES = ['Toyota', 'Mercedes-Benz', 'BMW', 'Audi', 'Land Rover', 'Ford', 'Honda', 'Nissan'];
const POPULAR_SEARCHES = ['Toyota Land Cruiser', 'Mercedes GLE', 'SUV under 2M', 'First car under 500K'];
const LOCATIONS = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kampala'];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const formatPrice = (price: number) => {
  if (price >= 1000000) {
    return `Ksh ${(price / 1000000).toFixed(1)}M`;
  }
  return `Ksh ${price.toLocaleString()}`;
};

const formatMileage = (mileage: number) => {
  if (mileage >= 1000) {
    return `${(mileage / 1000).toFixed(0)}k km`;
  }
  return `${mileage} km`;
};

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Search Bar Component */
const SearchBar: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocus: () => void;
  isFocused: boolean;
}> = ({ value, onChange, onSubmit, onFocus, isFocused }) => (
  <div className={`relative transition-all duration-200 ${isFocused ? 'ring-2 ring-[#17244B] shadow-lg' : 'ring-1 ring-slate-200'}`}>
    <div className="flex items-center bg-white rounded-xl overflow-hidden">
      <div className="flex-1 flex items-center px-4">
        <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="Search by make, model, or keyword..."
          className="w-full px-3 py-4 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
        />
        {value && (
          <button onClick={() => onChange('')} className="p-1 hover:bg-slate-100 rounded-full">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
      <button
        onClick={onSubmit}
        className="px-6 py-4 bg-[#17244B] text-white font-semibold hover:bg-[#1e3054] transition-colors"
      >
        Search
      </button>
    </div>
  </div>
);

/** Quick Filters */
const QuickFilters: React.FC<{
  activeFilters: string[];
  onToggle: (filter: string) => void;
}> = ({ activeFilters, onToggle }) => {
  const filters = [
    { id: 'new', label: 'New Arrivals', icon: Sparkles },
    { id: 'reduced', label: 'Price Reduced', icon: TrendingDown },
    { id: 'verified', label: 'Verified Dealers', icon: ShieldCheck },
    { id: 'inspected', label: 'Inspected', icon: CheckCircle2 },
    { id: 'finance', label: 'Finance Available', icon: CreditCard },
    { id: 'auction', label: 'Auctions', icon: Gavel },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilters.includes(filter.id);
        return (
          <button
            key={filter.id}
            onClick={() => onToggle(filter.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-[#17244B] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-[#17244B] hover:text-[#17244B]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {filter.label}
          </button>
        );
      })}
    </div>
  );
};

/** Filter Panel */
const FilterPanel: React.FC<{
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ filters, onChange, isOpen, onClose }) => {
  if (!isOpen) return null;

  const updateFilter = (key: keyof FilterState, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof FilterState, item: string) => {
    const current = filters[key] as string[] || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    updateFilter(key, updated);
  };

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={onClose} />
      
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl lg:relative lg:inset-auto lg:max-w-none lg:shadow-none overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between lg:hidden">
          <h3 className="text-lg font-bold text-slate-800">Filters</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Toggles */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Quick Filters</h4>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.verifiedDealer}
                onChange={(e) => updateFilter('verifiedDealer', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#17244B] focus:ring-[#17244B]"
              />
              <span className="text-slate-700">Verified Dealers Only</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.inspection}
                onChange={(e) => updateFilter('inspection', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#17244B] focus:ring-[#17244B]"
              />
              <span className="text-slate-700">Inspected Vehicles</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.financeEligible}
                onChange={(e) => updateFilter('financeEligible', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#17244B] focus:ring-[#17244B]"
              />
              <span className="text-slate-700">Finance Available</span>
            </label>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Price Range</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Min</label>
                <input
                  type="number"
                  value={filters.priceMin || ''}
                  onChange={(e) => updateFilter('priceMin', e.target.value ? Number(e.target.value) : 0)}
                  placeholder="Ksh 0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17244B]"
                />
              </div>
              <span className="text-slate-400 mt-5">-</span>
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Max</label>
                <input
                  type="number"
                  value={filters.priceMax || ''}
                  onChange={(e) => updateFilter('priceMax', e.target.value ? Number(e.target.value) : 0)}
                  placeholder="Ksh Any"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17244B]"
                />
              </div>
            </div>
          </div>

          {/* Year Range */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Year</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  value={filters.yearMin || ''}
                  onChange={(e) => updateFilter('yearMin', e.target.value ? Number(e.target.value) : 0)}
                  placeholder="From"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17244B]"
                />
              </div>
              <span className="text-slate-400">-</span>
              <div className="flex-1">
                <input
                  type="number"
                  value={filters.yearMax || ''}
                  onChange={(e) => updateFilter('yearMax', e.target.value ? Number(e.target.value) : 0)}
                  placeholder="To"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#17244B]"
                />
              </div>
            </div>
          </div>

          {/* Body Type */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Body Type</h4>
            <div className="flex flex-wrap gap-2">
              {['SUV', 'Sedan', 'Pickup', 'Hatchback', 'Coupe', 'Wagon', 'Van'].map((type) => (
                <button
                  key={type}
                  onClick={() => toggleArrayFilter('bodyType', type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.bodyType.includes(type)
                      ? 'bg-[#17244B] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Fuel Type */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Fuel Type</h4>
            <div className="flex flex-wrap gap-2">
              {['Petrol', 'Diesel', 'Hybrid', 'Electric'].map((fuel) => (
                <button
                  key={fuel}
                  onClick={() => toggleArrayFilter('fuel', fuel)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.fuel.includes(fuel)
                      ? 'bg-[#17244B] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {fuel}
                </button>
              ))}
            </div>
          </div>

          {/* Transmission */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Transmission</h4>
            <div className="flex flex-wrap gap-2">
              {['Automatic', 'Manual'].map((trans) => (
                <button
                  key={trans}
                  onClick={() => toggleArrayFilter('transmission', trans)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.transmission.includes(trans)
                      ? 'bg-[#17244B] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {trans}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Location</h4>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => toggleArrayFilter('location', loc)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filters.location.includes(loc)
                      ? 'bg-[#17244B] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => onChange({
              make: '', model: '', yearMin: 0, yearMax: 0, priceMin: 0, priceMax: 0,
              mileageMin: 0, mileageMax: 0, fuel: [], transmission: [], bodyType: [],
              condition: [], location: [], inspection: false, financeEligible: false,
              verifiedDealer: false, auction: false, featured: false
            })}
            className="w-full py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </div>
  );
};

/** Results Header */
const ResultsHeader: React.FC<{
  total: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onFilterToggle: () => void;
  activeFilterCount: number;
}> = ({ total, viewMode, onViewModeChange, sortBy, onSortChange, onFilterToggle, activeFilterCount }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-200">
    <div className="flex items-center gap-4">
      <button
        onClick={onFilterToggle}
        className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-[#17244B] transition-colors"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 bg-[#17244B] text-white text-xs rounded-full flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-800">{total.toLocaleString()}</span> vehicles found
      </p>
    </div>
    
    <div className="flex items-center gap-3">
      {/* Sort Dropdown */}
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-[#17244B] focus:outline-none focus:ring-2 focus:ring-[#17244B] cursor-pointer"
        >
          <option value="relevance">Most Relevant</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="year_desc">Newest First</option>
          <option value="year_asc">Oldest First</option>
          <option value="mileage_asc">Lowest Mileage</option>
          <option value="recent">Recently Added</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#17244B] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[#17244B] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

/** Vehicle Grid */
const VehicleGrid: React.FC<{
  vehicles: Vehicle[];
  viewMode: 'grid' | 'list';
  loading: boolean;
}> = ({ vehicles, viewMode, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
            <div className="aspect-[16/10] bg-slate-200" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-6 bg-slate-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-16">
        <Car className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">No vehicles found</h3>
        <p className="text-slate-500 mb-6">Try adjusting your filters or search terms</p>
        <button className="px-6 py-3 bg-[#17244B] text-white rounded-lg font-semibold hover:bg-[#1e3054] transition-colors">
          Clear All Filters
        </button>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${
      viewMode === 'grid'
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        : 'grid-cols-1'
    }`}>
      {vehicles.map((vehicle) => (
        <VehicleCard
          key={vehicle._id}
          car={{
            ...vehicle,
            id: vehicle._id,
            image: vehicle.images[0],
            images: vehicle.images,
            dealerName: vehicle.dealer.name,
            dealerRating: vehicle.dealer.rating,
            dealerVerified: vehicle.dealer.verified,
            has_inspection: vehicle.inspectionStatus === 'completed',
            financeOption: vehicle.financeAvailable,
            featured: vehicle.featured,
            isNew: vehicle.isNew,
            auction_status: vehicle.auctionStatus,
            currentBid: vehicle.currentBid,
          }}
          showDealer
          showTrust
          showCompare
          showFinance={vehicle.financeAvailable}
          onSave={(car, saved) => console.log('Save:', car.id, saved)}
          onCompare={(car, selected) => console.log('Compare:', car.id, selected)}
        />
      ))}
    </div>
  );
};

/** Trust Badges Bar */
const TrustBadges: React.FC = () => (
  <div className="bg-slate-50 border-y border-slate-200 py-3">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-center gap-8 flex-wrap text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>All Dealers Verified</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Vehicle Inspections</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          <span>Finance Available</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Award className="w-5 h-5 text-emerald-600" />
          <span>NTSA Verified</span>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

export const VehicleMarketplace: React.FC = () => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    make: '',
    model: '',
    yearMin: 0,
    yearMax: 0,
    priceMin: 0,
    priceMax: 0,
    mileageMin: 0,
    mileageMax: 0,
    fuel: [],
    transmission: [],
    bodyType: [],
    condition: [],
    location: [],
    inspection: false,
    financeEligible: false,
    verifiedDealer: false,
    auction: false,
    featured: false,
  });

  // Refs
  const searchRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    let result = [...MOCK_VEHICLES];

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.dealer.name.toLowerCase().includes(query) ||
          v.location.toLowerCase().includes(query)
      );
    }

    // Quick filters
    if (activeQuickFilters.includes('verified')) {
      result = result.filter((v) => v.dealer.verified);
    }
    if (activeQuickFilters.includes('inspected')) {
      result = result.filter((v) => v.inspectionStatus === 'completed');
    }
    if (activeQuickFilters.includes('finance')) {
      result = result.filter((v) => v.financeAvailable);
    }
    if (activeQuickFilters.includes('auction')) {
      result = result.filter((v) => v.isAuction);
    }
    if (activeQuickFilters.includes('new')) {
      result = result.filter((v) => v.isNew || v.badge === 'new');
    }
    if (activeQuickFilters.includes('reduced')) {
      result = result.filter((v) => v.originalPrice);
    }

    // Advanced filters
    if (filters.priceMin > 0) {
      result = result.filter((v) => v.price >= filters.priceMin);
    }
    if (filters.priceMax > 0) {
      result = result.filter((v) => v.price <= filters.priceMax);
    }
    if (filters.yearMin > 0) {
      result = result.filter((v) => v.year >= filters.yearMin);
    }
    if (filters.yearMax > 0) {
      result = result.filter((v) => v.year <= filters.yearMax);
    }
    if (filters.fuel.length > 0) {
      result = result.filter((v) => filters.fuel.includes(v.fuel));
    }
    if (filters.transmission.length > 0) {
      result = result.filter((v) => filters.transmission.includes(v.transmission));
    }
    if (filters.bodyType.length > 0) {
      result = result.filter((v) => filters.bodyType.includes(v.bodyType));
    }
    if (filters.location.length > 0) {
      result = result.filter((v) => filters.location.includes(v.location));
    }
    if (filters.inspection) {
      result = result.filter((v) => v.inspectionStatus === 'completed');
    }
    if (filters.financeEligible) {
      result = result.filter((v) => v.financeAvailable);
    }
    if (filters.verifiedDealer) {
      result = result.filter((v) => v.dealer.verified);
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'year_desc':
        result.sort((a, b) => b.year - a.year);
        break;
      case 'year_asc':
        result.sort((a, b) => a.year - b.year);
        break;
      case 'mileage_asc':
        result.sort((a, b) => a.mileage - b.mileage);
        break;
      default:
        // Relevance: featured first, then by inspection score
        result.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.inspectionScore || 0) - (a.inspectionScore || 0);
        });
    }

    return result;
  }, [searchQuery, filters, sortBy, activeQuickFilters]);

  // Toggle quick filter
  const toggleQuickFilter = useCallback((filter: string) => {
    setActiveQuickFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.yearMin || filters.yearMax) count++;
    if (filters.fuel.length) count++;
    if (filters.transmission.length) count++;
    if (filters.bodyType.length) count++;
    if (filters.location.length) count++;
    if (filters.inspection) count++;
    if (filters.financeEligible) count++;
    if (filters.verifiedDealer) count++;
    return count;
  }, [filters]);

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#17244B] via-[#1e3054] to-[#2a3a6e] py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Find Your Perfect Vehicle
            </h1>
            <p className="text-slate-300 text-lg">
              {MOCK_VEHICLES.length.toLocaleString()} verified vehicles from trusted dealers
            </p>
          </div>

          {/* Search Bar */}
          <div ref={searchRef} className="max-w-3xl mx-auto relative">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() => setShowSearchSuggestions(false)}
              onFocus={() => setShowSearchSuggestions(true)}
              isFocused={searchFocused}
            />

            {/* Search Suggestions */}
            {showSearchSuggestions && searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden z-50">
                {/* Popular Searches */}
                <div className="p-4 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Popular Searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((search) => (
                      <button
                        key={search}
                        onClick={() => {
                          setSearchQuery(search);
                          setShowSearchSuggestions(false);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <TrendingUp className="w-3 h-3" />
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Makes */}
                <div className="p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Popular Makes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_MAKES.map((make) => (
                      <button
                        key={make}
                        onClick={() => {
                          setSearchQuery(make);
                          setShowSearchSuggestions(false);
                        }}
                        className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        {make}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <TrustBadges />
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filter Sidebar - Desktop */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-4">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                isOpen={true}
                onClose={() => {}}
              />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Quick Filters */}
            <div className="mb-4">
              <QuickFilters
                activeFilters={activeQuickFilters}
                onToggle={toggleQuickFilter}
              />
            </div>

            {/* Results Header */}
            <ResultsHeader
              total={filteredVehicles.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onFilterToggle={() => setShowFilters(true)}
              activeFilterCount={activeFilterCount}
            />

            {/* Vehicle Grid */}
            <div className="mt-6">
              <VehicleGrid
                vehicles={filteredVehicles}
                viewMode={viewMode}
                loading={loading}
              />
            </div>

            {/* Load More */}
            {filteredVehicles.length > 0 && (
              <div className="mt-8 text-center">
                <button className="px-8 py-3 bg-white border-2 border-[#17244B] text-[#17244B] font-semibold rounded-xl hover:bg-[#17244B] hover:text-white transition-colors">
                  Load More Vehicles
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Panel */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </div>
  );
};

export default VehicleMarketplace;
