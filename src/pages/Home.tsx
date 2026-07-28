import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CarCard, { type Car } from '../components/features/car/CarCard';
import { CARS } from '../data/cars';
import {
  ArrowRight,
  Search,
  Shield,
  Gavel,
} from 'lucide-react';

type Filter = 'All' | 'SUV' | 'Pickup' | 'Sedan' | 'Wagon';

interface HomeProps {
  setPage: (page: string) => void;
  viewCar: (car: Car) => void;
}

const BRAND = '#16C4A4';

const HERO_SLIDES = CARS.slice(0, 5);

export default function Home({ setPage, viewCar }: HomeProps) {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<Filter>('All');
  const [heroSearch, setHeroSearch] = useState('');

  const nav = useCallback(
    (page: string) => {
      setPage(page);
      navigate('/' + page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setPage, navigate],
  );

  const featured = CARS.filter(car => {
    if (filter === 'All') return true;
    return car.type === filter;
  }).slice(0, 8);

  const filters: Filter[] = ['All', 'SUV', 'Pickup', 'Sedan', 'Wagon'];

  return (
    <div className="min-h-screen bg-[#FCF9F4]">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="bg-[#0A1626] px-4 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left: Text & Search */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#16C4A4] text-xs font-semibold uppercase tracking-wider mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16C4A4] animate-pulse" />
                Kenya's Car Marketplace
              </div>
              
              <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Find Your <span className="text-[#16C4A4]">Perfect Ride</span>
              </h1>
              
              <p className="text-white/60 text-sm lg:text-base mb-6 max-w-md mx-auto lg:mx-0">
                Verified dealers, secure escrow, live auctions.
              </p>

              {/* Search */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = heroSearch.trim();
                  navigate(q ? `/gallery?q=${encodeURIComponent(q)}` : '/gallery');
                  setPage('gallery');
                }}
                className="flex max-w-lg mx-auto lg:mx-0"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <input
                    type="text"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    placeholder="Search make, model..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-l-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-[#16C4A4] transition-colors"
                  />
                </div>
                <button 
                  type="submit"
                  className="px-6 py-3.5 bg-[#16C4A4] text-[#0A1626] font-semibold text-sm rounded-r-xl hover:bg-[#2DD9BE] transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Quick actions */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-6">
                <button 
                  onClick={() => nav('gallery')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors border border-white/10"
                >
                  <Shield size={16} className="text-[#16C4A4]" />
                  Browse Cars
                </button>
                <button 
                  onClick={() => nav('auction')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors border border-white/10"
                >
                  <Gavel size={16} className="text-[#EF4444]" />
                  Live Auctions
                </button>
              </div>
            </div>

            {/* Right: Featured Vehicle Card */}
            <div className="flex-1 w-full max-w-md">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={HERO_SLIDES[0].image} 
                  alt={`${HERO_SLIDES[0].make} ${HERO_SLIDES[0].model}`}
                  className="w-full h-64 lg:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-[#16C4A4] text-xs font-bold uppercase tracking-wider mb-1">
                    {HERO_SLIDES[0].make}
                  </p>
                  <h3 className="text-white text-lg font-bold mb-2">
                    {HERO_SLIDES[0].model}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-xl">
                      KES {HERO_SLIDES[0].price.toLocaleString()}
                    </span>
                    <button 
                      onClick={() => viewCar(HERO_SLIDES[0])}
                      className="px-4 py-2 bg-[#16C4A4] text-[#0A1626] text-xs font-bold rounded-lg hover:bg-[#2DD9BE] transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Inventory ────────────────────────────────────── */}
      <section className="px-4 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-[#1E3063] mb-1">
                Featured Vehicles
              </h2>
              <p className="text-[#6B7A99] text-sm">
                {CARS.length}+ vehicles available
              </p>
            </div>
            <button 
              onClick={() => nav('gallery')}
              className="inline-flex items-center gap-2 text-[#16C4A4] font-semibold text-sm hover:gap-3 transition-all"
            >
              View all <ArrowRight size={16} />
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-[#16C4A4] text-white'
                    : 'bg-white text-[#6B7A99] border border-[#E2D8C7] hover:border-[#16C4A4]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Car grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {featured.map(car => (
              <CarCard key={car.id} car={car} onClick={() => viewCar(car)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Strip ─────────────────────────────────────────── */}
      <section className="px-4 py-10 bg-white border-y border-[#E2D8C7]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#16C4A4]/10 flex items-center justify-center">
                <Shield size={20} className="text-[#16C4A4]" />
              </div>
              <div>
                <p className="font-semibold text-[#1E3063] text-sm">Escrow Protection</p>
                <p className="text-[#6B7A99] text-xs">Secure payments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#16C4A4]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#16C4A4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#1E3063] text-sm">150-Point Check</p>
                <p className="text-[#6B7A99] text-xs">Every vehicle</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#16C4A4]/10 flex items-center justify-center">
                <Gavel size={20} className="text-[#16C4A4]" />
              </div>
              <div>
                <p className="font-semibold text-[#1E3063] text-sm">Live Auctions</p>
                <p className="text-[#6B7A99] text-xs">Real-time bidding</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#16C4A4]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#16C4A4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#1E3063] text-sm">Verified Dealers</p>
                <p className="text-[#6B7A99] text-xs">Vetted sellers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="px-4 py-16 bg-[#0A1626]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Ready to sell your vehicle?
          </h2>
          <p className="text-white/60 mb-6">
            List your car and reach thousands of verified buyers.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={() => nav('register')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#16C4A4] text-[#0A1626] font-semibold rounded-lg hover:bg-[#2DD9BE] transition-colors"
            >
              Start Selling <ArrowRight size={16} />
            </button>
            <button 
              onClick={() => nav('gallery')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Browse First
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
