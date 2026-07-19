import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Shield, Search, CheckCircle, Tag, CreditCard, Wrench, Loader } from 'lucide-react';
import CarCard, { type Car } from '../components/CarCard';
import HeroCarousel from '../components/HeroCarousel';
import { carsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/Skeleton';

type Filter = 'All' | 'SUV' | 'Pickup' | 'Auctions';

interface HomeProps {
  setPage: (page: string) => void;
  viewCar: (car: Car) => void;
}

const TRUST_BADGES = [
  { icon: Shield, title: 'Escrow Protection', desc: 'Funds held until safe delivery' },
  { icon: Search, title: 'Pre-Inspection', desc: 'Independent check before purchase' },
  { icon: CheckCircle, title: 'Verified Dealers', desc: 'All sellers vetted and approved' },
  { icon: Tag, title: 'Live Auctions', desc: 'Transparent real-time bidding' },
];

const FEATURES = [
  {
    icon: CreditCard,
    title: 'M-Pesa Escrow',
    desc: 'Your money is protected until you safely receive your car. No scams, no risk.',
  },
  {
    icon: Wrench,
    title: '150-Point Inspection',
    desc: 'Certified mechanics inspect every vehicle before you commit to buying.',
  },
  {
    icon: CheckCircle,
    title: 'Verified Dealers',
    desc: 'All dealers are vetted, licensed, and rated by real buyers like you.',
  },
  {
    icon: Tag,
    title: 'Live Auctions',
    desc: 'Bid on rare finds in real-time. Transparent pricing, no hidden fees.',
  },
];

export default function Home({ setPage, viewCar }: HomeProps) {
  const [filter, setFilter] = useState<Filter>('All');
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const nav = (page: string) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch cars from API
  useEffect(() => {
    const fetchCars = async () => {
      try {
        const data = await carsAPI.list({ page: 1, limit: 50 });
        const carList = data?.cars || data?.data || [];
        setCars(carList);
      } catch {
        toast('Failed to load vehicles. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchCars();
  }, []);

  // Filter cars based on selected filter
  const featured = useMemo(() => {
    let filtered = cars;
    if (filter === 'Auctions') {
      filtered = cars.filter(car => 
        car.auctionStatus === 'live' || 
        (car.auctionStartTime && car.auctionEnd && new Date(car.auctionStartTime) <= new Date() && new Date(car.auctionEnd) > new Date())
      );
    } else if (filter !== 'All') {
      filtered = cars.filter(car => car.type === filter || car.bodyType === filter);
    }
    return filtered.slice(0, 4);
  }, [cars, filter]);

  const filters: Filter[] = ['All', 'SUV', 'Pickup', 'Auctions'];

  // Handle carousel car click - convert to local format
  const handleCarouselView = (car: any) => {
    const localCar: Car = {
      id: car._id ? parseInt(car._id.replace(/\D/g, '') || '1') : 1,
      make: car.brand || car.make || '',
      model: car.model || car.title || '',
      price: car.price || car.currentBid || 0,
      year: car.year || 2024,
      mileage: typeof car.mileage === 'number' ? `${car.mileage} km` : (car.mileage || '0 km'),
      fuel: car.fuel || 'Petrol',
      city: car.location?.city || 'Nairobi',
      type: (car.type || car.bodyType || 'SUV') as Car['type'],
      badges: [],
      image: typeof car.images?.[0] === 'string' ? car.images[0] : car.images?.[0]?.url || car.image || '',
    };
    viewCar(localCar);
  };

  // Convert API car to CarCard format
  const toCardCar = (car: any): Car => ({
    id: car._id ? parseInt(car._id.replace(/\D/g, '') || '1') : 1,
    make: car.brand || car.make || '',
    model: car.model || car.title || '',
    price: car.price || car.currentBid || 0,
    year: car.year || 2024,
    mileage: typeof car.mileage === 'number' ? `${car.mileage} km` : (car.mileage || '0 km'),
    fuel: car.fuel || 'Petrol',
    city: car.location?.city || 'Nairobi',
    type: (car.type || car.bodyType || 'SUV') as Car['type'],
    badges: [],
    image: typeof car.images?.[0] === 'string' ? car.images[0] : car.images?.[0]?.url || car.image || '',
  });

  return (
    <div className="min-h-screen">

      {/* ── HERO CAROUSEL - Full Viewport ──────────────────────────── */}
      <section className="relative">
        <HeroCarousel onViewCar={handleCarouselView} />
      </section>

      {/* ── TRUST BADGES ──────────────────────────────────────────── */}
      <section className="bg-charcoal-800 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-gold-700/40">
            {TRUST_BADGES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-6">
                <div className="w-10 h-10 rounded-lg bg-gold-400/25 flex items-center justify-center flex-shrink-0 ring-1 ring-gold-400/30">
                  <Icon size={20} className="text-gold-400" />
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-white">{title}</p>
                  <p className="font-sans text-xs text-white/40 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED VEHICLES ─────────────────────────────────────── */}
      <section className="bg-cream-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label mb-3">Premium Selection</p>
            <h2 className="section-heading mb-3">Featured Vehicles</h2>
            <p className="font-sans text-warm-400 text-sm">
              Handpicked quality cars from verified dealers across Kenya
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex justify-center gap-2 flex-wrap mb-8">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={filter === f ? 'pill-active' : 'pill-inactive'}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                    <div className="aspect-[4/3] bg-cream-200" />
                    <div className="p-5">
                      <div className="h-4 bg-cream-200 rounded w-1/2 mb-2" />
                      <div className="h-6 bg-cream-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-cream-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </>
            ) : featured.length > 0 ? (
              featured.map(car => (
                <CarCard key={car._id || car.id} car={toCardCar(car)} onClick={() => viewCar(toCardCar(car))} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-warm-400">No vehicles found</p>
                <button
                  onClick={() => setFilter('All')}
                  className="mt-2 text-gold-600 hover:text-gold-700"
                >
                  View all vehicles
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <button
              onClick={() => nav('gallery')}
              className="font-sans text-sm text-gold-700 font-semibold hover:text-gold-600 transition-colors flex items-center gap-1"
            >
              View all vehicles <ArrowRight size={14} />
            </button>
            <button
              onClick={() => nav('gallery')}
              className="btn-outline-dark"
            >
              Browse All Cars <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── BUILT FOR KENYA ───────────────────────────────────────── */}
      <section className="bg-cream-50 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-heading mb-3">Built for Kenya</h2>
            <p className="font-sans text-warm-400 text-sm max-w-md mx-auto">
              We understand the Kenyan car market. Here's why thousands trust KAYAD.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-white p-6 rounded-2xl border border-cream-200 hover:shadow-md hover:border-gold-600/40 transition-all duration-200">
                <div className="w-11 h-11 rounded-xl bg-gold-600/15 flex items-center justify-center flex-shrink-0 ring-1 ring-gold-600/20">
                  <Icon size={20} className="text-gold-700" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-charcoal-900 mb-1">{title}</h3>
                  <p className="font-sans text-sm text-warm-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="relative bg-charcoal-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-full bg-gold-500/6 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-12 sm:py-20">
          <h2 className="font-serif text-2xl sm:text-4xl text-white font-bold mb-4">Ready to Find Your Dream Car?</h2>
          <p className="font-sans text-white/50 text-base mb-8">
            Join thousands of Kenyan car buyers who trust KAYAD for safe and transparent transactions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => nav('gallery')} className="btn-gold">
              Start Browsing
            </button>
            <button onClick={() => nav('support')} className="btn-outline">
              Become a Dealer
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
