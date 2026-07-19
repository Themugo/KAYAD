import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import CarCard, { type Car } from '../components/CarCard';
import { CARS } from '../data/cars';

type VehicleType = 'All' | 'SUV' | 'Pickup' | 'Sedan' | 'Wagon';

interface GalleryProps {
  viewCar: (car: Car) => void;
}

export default function Gallery({ viewCar }: GalleryProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<VehicleType>('All');
  const [maxPrice, setMaxPrice] = useState(20000000);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const types: VehicleType[] = ['All', 'SUV', 'Pickup', 'Sedan', 'Wagon'];

  const results = CARS.filter(car => {
    const matchQuery =
      !query ||
      car.make.toLowerCase().includes(query.toLowerCase()) ||
      car.model.toLowerCase().includes(query.toLowerCase()) ||
      car.city.toLowerCase().includes(query.toLowerCase());
    const matchType = typeFilter === 'All' || car.type === typeFilter;
    const matchPrice = car.price <= maxPrice;
    return matchQuery && matchType && matchPrice;
  });

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="relative bg-charcoal-900 pt-16 pb-14 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-1/2 h-full bg-gold-400/6 blur-3xl rounded-full pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label text-gold-400 mb-3">Browse All Listings</p>
          <h1 className="font-serif text-3xl sm:text-5xl text-white font-bold mb-2">Vehicle Gallery</h1>
          <p className="font-sans text-white/50 text-sm">{results.length} vehicles available</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by make, model, or city..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 placeholder-warm-400 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={14} className="text-warm-400 hover:text-warm-600" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2 bg-white border border-cream-300 text-charcoal-800 font-sans text-sm font-medium px-5 py-3 rounded-xl hover:border-gold-700 hover:text-gold-700 transition-all"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        {/* Expanded filters */}
        {filtersOpen && (
          <div className="bg-white rounded-2xl border border-cream-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="font-sans text-xs font-semibold text-warm-400 tracking-widest uppercase mb-3">Vehicle Type</p>
                <div className="flex flex-wrap gap-2">
                  {types.map(t => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={typeFilter === t ? 'pill-active' : 'pill-inactive'}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-sans text-xs font-semibold text-warm-400 tracking-widest uppercase mb-3">
                  Max Price: <span className="text-gold-700">KES {maxPrice.toLocaleString()}</span>
                </p>
                <input
                  type="range"
                  min={1000000}
                  max={20000000}
                  step={500000}
                  value={maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#16C4A4]"
                />
                <div className="flex justify-between font-sans text-xs text-warm-400 mt-1">
                  <span>KES 1M</span>
                  <span>KES 20M</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Type pills (always visible) */}
        <div className="flex items-center gap-2 flex-wrap mb-8">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={typeFilter === t ? 'pill-active' : 'pill-inactive'}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Grid */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map(car => (
              <CarCard key={car.id} car={car} onClick={() => viewCar(car)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-warm-400 mb-2">No vehicles found</p>
            <p className="font-sans text-sm text-warm-400">Try adjusting your search or filters</p>
            <button onClick={() => { setQuery(''); setTypeFilter('All'); setMaxPrice(20000000); }} className="mt-4 text-gold-700 font-sans text-sm font-medium hover:underline">
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
