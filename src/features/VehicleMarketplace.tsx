import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle } from '../types';
import VehicleCard from '../components/VehicleCard';
import { 
  SlidersHorizontal, 
  Search, 
  RotateCcw, 
  MapPin, 
  Map, 
  Grid, 
  List as ListIcon, 
  Sparkles, 
  ArrowRightLeft,
  Filter,
  X,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
  Tag,
  Sliders,
  Layers
} from 'lucide-react';
import { Input, Select, Button, Badge, Card, SkeletonGrid } from '../components/ui';

interface VehicleMarketplaceProps {
  vehicles: Vehicle[];
  savedVehicles: string[];
  comparedVehicles: string[];
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onQuickView: (vehicle: Vehicle) => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCompareModal: () => void;
}

interface SavedSearchPreset {
  id: string;
  name: string;
  make: string;
  maxPrice: number;
  bodyStyle: string;
  fuel: string;
}

export const VehicleMarketplace: React.FC<VehicleMarketplaceProps> = ({
  vehicles,
  savedVehicles,
  comparedVehicles,
  onToggleSave,
  onToggleCompare,
  onQuickView,
  onStartEscrow,
  selectedCounty,
  onCountyChange,
  searchQuery,
  onSearchChange,
  onOpenCompareModal
}) => {
  // Advanced Filter States
  const [selectedMake, setSelectedMake] = useState<string>('All');
  const [selectedBodyStyle, setSelectedBodyStyle] = useState<string>('All');
  const [selectedFuel, setSelectedFuel] = useState<string>('All');
  const [selectedTransmission, setSelectedTransmission] = useState<string>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');
  const [selectedSellerType, setSelectedSellerType] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number>(10000000);
  const [maxMileage, setMaxMileage] = useState<number>(200000);
  const [activeChip, setActiveChip] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<'freshness' | 'price-asc' | 'price-desc' | 'mileage'>('freshness');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Loading Simulation State for Responsive Feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Saved Search Presets State
  const [savedPresets, setSavedPresets] = useState<SavedSearchPreset[]>([
    { id: 'p1', name: 'Under Ksh 3.5M SUVs', make: 'All', maxPrice: 3500000, bodyStyle: 'SUV', fuel: 'All' },
    { id: 'p2', name: 'Toyota Land Cruisers', make: 'Toyota', maxPrice: 10000000, bodyStyle: 'All', fuel: 'All' },
    { id: 'p3', name: 'Low-Mileage Hybrids', make: 'All', maxPrice: 5000000, bodyStyle: 'All', fuel: 'Hybrid' },
  ]);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);

  // Trigger brief skeleton loading on filter/search change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCounty, selectedMake, selectedBodyStyle, selectedFuel, selectedTransmission, selectedCondition, selectedSellerType, maxPrice, maxMileage, activeChip, sortBy]);

  // Dynamic Options Extracted from Backend Data
  const makes = useMemo(() => ['All', ...Array.from(new Set(vehicles.map((v) => v.make)))], [vehicles]);
  const bodyStyles = useMemo(() => ['All', ...Array.from(new Set(vehicles.map((v) => v.bodyStyle).filter(Boolean)))], [vehicles]);
  const fuels = useMemo(() => ['All', 'Diesel', 'Petrol', 'Hybrid', 'Electric'], []);

  // Smart Filter Chips Definition
  const filterChips = [
    { id: 'All', label: 'All Listings' },
    { id: 'under-3.5m', label: 'Under Ksh 3.5M' },
    { id: 'family-suv', label: 'Family SUVs' },
    { id: 'low-mileage', label: 'Low Mileage (< 45k km)' },
    { id: 'verified-dealer', label: 'Verified Dealers' },
    { id: 'inspected', label: '150-Pt Inspected' },
    { id: 'escrow', label: 'Escrow Ready' },
    { id: 'hybrids', label: 'Hybrid & Electric' },
  ];

  // Filtering Logic
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // County filter
      if (selectedCounty !== 'All East Africa' && v.county !== selectedCounty) {
        return false;
      }
      // Query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const match = v.title.toLowerCase().includes(q) || 
                      v.make.toLowerCase().includes(q) || 
                      v.model.toLowerCase().includes(q) ||
                      v.sellerName.toLowerCase().includes(q) ||
                      v.location.toLowerCase().includes(q) ||
                      v.county.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Make filter
      if (selectedMake !== 'All' && v.make !== selectedMake) return false;
      // Body style
      if (selectedBodyStyle !== 'All' && v.bodyStyle !== selectedBodyStyle) return false;
      // Fuel
      if (selectedFuel !== 'All' && v.fuelType !== selectedFuel) return false;
      // Transmission
      if (selectedTransmission !== 'All' && v.transmission !== selectedTransmission) return false;
      // Condition
      if (selectedCondition !== 'All' && v.condition !== selectedCondition) return false;
      // Seller type
      if (selectedSellerType !== 'All' && v.sellerType !== selectedSellerType) return false;
      // Price
      if (v.price > maxPrice) return false;
      // Mileage
      if (v.mileage > maxMileage) return false;

      // Smart Chips
      if (activeChip === 'under-3.5m' && v.price > 3500000) return false;
      if (activeChip === 'family-suv' && v.bodyStyle !== 'SUV') return false;
      if (activeChip === 'low-mileage' && v.mileage > 45000) return false;
      if (activeChip === 'verified-dealer' && v.sellerType !== 'Verified Dealer') return false;
      if (activeChip === 'inspected' && !v.inspectionPassed) return false;
      if (activeChip === 'escrow' && !v.escrowEligible) return false;
      if (activeChip === 'hybrids' && !['Hybrid', 'Electric'].includes(v.fuelType)) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'mileage') return a.mileage - b.mileage;
      return 0; // Freshness default
    });
  }, [
    vehicles, 
    selectedCounty, 
    searchQuery, 
    selectedMake, 
    selectedBodyStyle, 
    selectedFuel, 
    selectedTransmission, 
    selectedCondition, 
    selectedSellerType, 
    maxPrice, 
    maxMileage, 
    activeChip, 
    sortBy
  ]);

  // Reset pagination when filter results change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredVehicles.length]);

  // Paginated View Slice
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + pageSize);

  const resetFilters = () => {
    setSelectedMake('All');
    setSelectedBodyStyle('All');
    setSelectedFuel('All');
    setSelectedTransmission('All');
    setSelectedCondition('All');
    setSelectedSellerType('All');
    setMaxPrice(10000000);
    setMaxMileage(200000);
    setActiveChip('All');
    onSearchChange('');
  };

  const applyPreset = (preset: SavedSearchPreset) => {
    setSelectedMake(preset.make);
    setMaxPrice(preset.maxPrice);
    setSelectedBodyStyle(preset.bodyStyle);
    setSelectedFuel(preset.fuel);
    setActiveChip('All');
  };

  const handleSaveCurrentPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const preset: SavedSearchPreset = {
      id: `p-${Date.now()}`,
      name: newPresetName.trim(),
      make: selectedMake,
      maxPrice,
      bodyStyle: selectedBodyStyle,
      fuel: selectedFuel
    };
    setSavedPresets((prev) => [...prev, preset]);
    setNewPresetName('');
    setShowSavePresetModal(false);
  };

  // Active filter items for removable chips
  const activeFilters = useMemo(() => {
    const list: { id: string; label: string; onClear: () => void }[] = [];
    if (searchQuery) list.push({ id: 'search', label: `"${searchQuery}"`, onClear: () => onSearchChange('') });
    if (selectedMake !== 'All') list.push({ id: 'make', label: `Make: ${selectedMake}`, onClear: () => setSelectedMake('All') });
    if (selectedBodyStyle !== 'All') list.push({ id: 'body', label: `Body: ${selectedBodyStyle}`, onClear: () => setSelectedBodyStyle('All') });
    if (selectedFuel !== 'All') list.push({ id: 'fuel', label: `Fuel: ${selectedFuel}`, onClear: () => setSelectedFuel('All') });
    if (selectedSellerType !== 'All') list.push({ id: 'seller', label: `Seller: ${selectedSellerType}`, onClear: () => setSelectedSellerType('All') });
    if (maxPrice < 10000000) list.push({ id: 'price', label: `Max Price: Ksh ${(maxPrice / 1000000).toFixed(1)}M`, onClear: () => setMaxPrice(10000000) });
    if (activeChip !== 'All') {
      const chip = filterChips.find((c) => c.id === activeChip);
      if (chip) list.push({ id: 'chip', label: `Preset: ${chip.label}`, onClear: () => setActiveChip('All') });
    }
    return list;
  }, [searchQuery, selectedMake, selectedBodyStyle, selectedFuel, selectedSellerType, maxPrice, activeChip]);

  return (
    <div className="space-y-6">
      
      {/* 1. STICKY SEARCH & HIGHLIGHT BAR */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-card border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Toyota Prado, Subaru, Diesel, Crown Motors, Nairobi..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
            className="pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full"
              title="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="hidden sm:inline">Region:</span>
            <select
              value={selectedCounty}
              onChange={(e) => onCountyChange(e.target.value)}
              className="bg-transparent font-bold text-[#1E3063] focus:outline-none cursor-pointer"
            >
              <option value="All East Africa">All East Africa</option>
              <option value="Nairobi">Nairobi</option>
              <option value="Mombasa">Mombasa</option>
              <option value="Kiambu">Kiambu</option>
              <option value="Nakuru">Nakuru</option>
              <option value="Eldoret">Eldoret</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="md"
            className="md:hidden min-h-[44px] px-4 font-bold"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <Filter className="w-4 h-4 text-amber-500" />
            <span>Filters ({activeFilters.length})</span>
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => setShowSavePresetModal(true)}
            className="hidden sm:inline-flex"
            title="Save this search filter combination"
          >
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>Save Filter</span>
          </Button>
        </div>
      </div>

      {/* 2. ADVANCED FILTERS BAR & DYNAMIC PRESET CHIPS */}
      <div className="space-y-4">
        {/* Desktop Advanced Filter Panel */}
        <div className={`bg-white rounded-2xl p-5 shadow-card border border-slate-200 space-y-4 ${
          showMobileFilters ? 'block' : 'hidden md:block'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1E3063] uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                Advanced Inventory Filters
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {filteredVehicles.length} vehicles found
              </span>
            </div>

            <div className="flex items-center gap-3">
              {activeFilters.length > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset ({activeFilters.length})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <Select
              label="Make"
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              options={makes.map((m) => ({ value: m, label: m }))}
            />

            <Select
              label="Body Style"
              value={selectedBodyStyle}
              onChange={(e) => setSelectedBodyStyle(e.target.value)}
              options={bodyStyles.map((b) => ({ value: b, label: b }))}
            />

            <Select
              label="Fuel Type"
              value={selectedFuel}
              onChange={(e) => setSelectedFuel(e.target.value)}
              options={fuels.map((f) => ({ value: f, label: f }))}
            />

            <Select
              label="Seller Type"
              value={selectedSellerType}
              onChange={(e) => setSelectedSellerType(e.target.value)}
              options={[
                { value: 'All', label: 'All Sellers' },
                { value: 'Verified Dealer', label: 'Verified Dealer' },
                { value: 'Private Seller', label: 'Private Seller' }
              ]}
            />

            {/* Max Price Slider */}
            <div className="space-y-1 col-span-2 sm:col-span-1 lg:col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <div className="flex justify-between font-bold text-slate-500 text-[10px] uppercase">
                <span>Max Budget Limit</span>
                <span className="text-[#1E3063] font-extrabold text-xs">Ksh {(maxPrice / 1000000).toFixed(1)}M</span>
              </div>
              <input
                type="range"
                min={1000000}
                max={15000000}
                step={250000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#1E3063] cursor-pointer"
              />
            </div>
          </div>

          {/* Saved Search Presets */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <Bookmark className="w-3 h-3 text-amber-500" /> Presets:
            </span>
            {savedPresets.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-[#1E3063] font-semibold transition-all whitespace-nowrap text-[11px]"
              >
                ⚡ {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* 3. DYNAMIC SMART FILTER CHIPS (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveChip(chip.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeChip === chip.id
                  ? 'bg-[#1E3063] text-white shadow-sm ring-2 ring-[#1E3063]/30'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {activeChip === chip.id && <Check className="w-3 h-3 text-amber-400" />}
              {chip.label}
            </button>
          ))}
        </div>

        {/* 4. ACTIVE REMOVABLE FILTER CHIPS (1-Click Clear) */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[11px] font-bold text-slate-500">Active Filters:</span>
            {activeFilters.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-[#1E3063] font-bold border border-amber-200"
              >
                {f.label}
                <button
                  onClick={f.onClear}
                  className="hover:text-rose-600 transition-colors ml-0.5"
                  title="Remove filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={resetFilters}
              className="text-[11px] font-bold text-rose-600 hover:underline ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* 5. RESULTS HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-xl font-extrabold text-[#1E3063] font-display flex items-center gap-2">
            Verified Vehicles
            <span className="text-xs bg-[#1E3063] text-white px-2.5 py-0.5 rounded-full font-sans font-bold">
              {filteredVehicles.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Showing inspect-certified marketplace inventory in {selectedCounty}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-white px-3 py-2 rounded-xl border border-slate-200">
            <span className="hidden sm:inline">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent font-bold text-[#1E3063] focus:outline-none cursor-pointer"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-white px-3.5 py-2 rounded-xl border border-slate-200">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent font-bold text-[#1E3063] focus:outline-none cursor-pointer text-xs"
            >
              <option value="freshness">Freshness / Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="mileage">Lowest Mileage</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#1E3063] text-white' : 'text-slate-500 hover:text-slate-800'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#1E3063] text-white' : 'text-slate-500 hover:text-slate-800'}`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-[#1E3063] text-white' : 'text-slate-500 hover:text-slate-800'}`}
              title="Map View"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. VEHICLE RESULTS GRID / LIST / MAP / SKELETON */}
      {isLoading ? (
        <SkeletonGrid count={pageSize} />
      ) : viewMode === 'map' ? (
        <Card className="p-8 text-center space-y-4">
          <Map className="w-12 h-12 text-[#1E3063] mx-auto" />
          <h3 className="text-lg font-bold text-[#1E3063]">County Dealership Location Map</h3>
          <p className="text-slate-600 text-xs max-w-lg mx-auto">
            Viewing verified vehicle locations across {selectedCounty}. Showing dealerships in Westlands, Nyali, Thika Road, Milimani and Central.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto pt-4 text-left">
            {filteredVehicles.map((v) => (
              <div 
                key={v.id} 
                onClick={() => onQuickView(v)}
                className="p-3 bg-slate-50 hover:bg-amber-50 transition-colors cursor-pointer rounded-xl border border-slate-200 text-xs space-y-1"
              >
                <p className="font-bold text-[#1E3063]">{v.title}</p>
                <p className="text-slate-500 font-medium">{v.location}</p>
                <p className="text-emerald-700 font-extrabold mt-1">Ksh {v.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : filteredVehicles.length === 0 ? (
        /* Rich Usable Empty State with Quick Recovery Suggestions */
        <Card className="p-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Search className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#1E3063] font-display">No vehicles match your active filter criteria</h3>
            <p className="text-slate-500 text-xs max-w-md mx-auto mt-1">
              Try adjusting your price slider or searching popular vehicle keywords below to discover verified listings across East Africa.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto pt-2">
            <span className="text-xs font-bold text-slate-400 w-full mb-1">Suggested Quick Searches:</span>
            {['Toyota Prado', 'Subaru Outback', 'Diesel SUV', 'Verified Dealer', 'Under 3.5M'].map((keyword) => (
              <button
                key={keyword}
                onClick={() => {
                  resetFilters();
                  if (keyword === 'Under 3.5M') {
                    setActiveChip('under-3.5m');
                  } else if (keyword === 'Verified Dealer') {
                    setSelectedSellerType('Verified Dealer');
                  } else {
                    onSearchChange(keyword);
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-800 font-bold text-xs rounded-xl transition-all border border-slate-200"
              >
                🔍 {keyword}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={resetFilters}
            >
              <RotateCcw className="w-4 h-4" /> Reset All Filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
        }>
          {paginatedVehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              isSaved={savedVehicles.includes(v.id)}
              isCompared={comparedVehicles.includes(v.id)}
              onToggleSave={onToggleSave}
              onToggleCompare={onToggleCompare}
              onQuickView={onQuickView}
              onStartEscrow={onStartEscrow}
            />
          ))}
        </div>
      )}

      {/* 7. PAGINATION CONTROLS */}
      {filteredVehicles.length > pageSize && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
          <span className="text-slate-500">
            Showing <strong className="text-[#1E3063]">{startIndex + 1}–{Math.min(startIndex + pageSize, filteredVehicles.length)}</strong> of <strong className="text-[#1E3063]">{filteredVehicles.length}</strong> vehicles
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl font-bold transition-all ${
                    currentPage === pageNum
                      ? 'bg-[#1E3063] text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 8. FLOATING STICKY COMPARE DRAWER (Reduces Clicks Required to Compare) */}
      {comparedVehicles.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-40 bg-[#1E3063] text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#17244B] font-black flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-sm truncate font-display">
                Comparing {comparedVehicles.length} {comparedVehicles.length === 1 ? 'Vehicle' : 'Vehicles'}
              </p>
              <p className="text-[11px] text-slate-300 truncate">Max 4 allowed side-by-side</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="accent"
              size="sm"
              onClick={onOpenCompareModal}
            >
              Compare Matrix
            </Button>
            <button
              onClick={() => comparedVehicles.forEach((id) => onToggleCompare(id))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              title="Clear comparison list"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 9. SAVE PRESET MODAL */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-[#1E3063] text-sm font-display flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-500" />
                Save Current Search Filter
              </h3>
              <button onClick={() => setShowSavePresetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentPreset} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Preset Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Favorite Prado Search"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-slate-600 space-y-1 border border-slate-200">
                <p className="font-bold text-[#1E3063]">Included Criteria:</p>
                <p>• Make: {selectedMake}</p>
                <p>• Max Budget: Ksh {(maxPrice / 1000000).toFixed(1)}M</p>
                <p>• Body: {selectedBodyStyle}</p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="md" fullWidth onClick={() => setShowSavePresetModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" fullWidth type="submit">
                  Save Preset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default VehicleMarketplace;
