import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, Clock, Award } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';
import { carsAPI } from '../../../api/api';
import CarCard from '../../../components/CarCard';

export default function HomeHero({ liveCount, isAuth, user }) {
  const [featuredCars, setFeaturedCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch featured cars
  useEffect(() => {
    let cancelled = false;
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const data = await carsAPI.list({ page: 1, limit: 8, sort: '-createdAt' });
        if (cancelled) return;
        
        let all = data.cars || data.data || [];
        
        // Prioritize promoted cars
        const featured = [
          ...all.filter(c => c.isPromoted).slice(0, 4),
          ...all.filter(c => !c.isPromoted).slice(0, 4)
        ].slice(0, 4); // Max 4 for desktop
        
        setFeaturedCars(featured);
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch featured cars:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFeatured();
    return () => { cancelled = true; };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/showroom?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  // Current height: min(70vh, 620px)
  // Reduced by 35%: min(45.5vh, 403px)
  const heroHeight = 'min(45.5vh, 403px)';

  return (
    <section className="relative overflow-hidden" style={{ minHeight: heroHeight }}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" />
      
      {/* Subtle animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
        {/* Top Section: Headline, Trust Indicators, Search */}
        <div className="mb-8">
          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-8 mb-6">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 text-white/60"
            >
              <Shield size={16} className="text-gold" />
              <span className="text-xs font-medium">Verified Dealers</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 text-white/60"
            >
              <Clock size={16} className="text-gold" />
              <span className="text-xs font-medium">24/7 Support</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-white/60"
            >
              <Award size={16} className="text-gold" />
              <span className="text-xs font-medium">Premium Quality</span>
            </motion.div>
          </div>

          {/* Headline */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center mb-6"
          >
            <h1 className="font-display font-black italic text-[clamp(1.8rem,4vw,2.8rem)] leading-[0.95] uppercase text-white tracking-[-0.02em] mb-2">
              Kenya's Premium
              <span className="text-gold" style={{ textShadow: '0 0 30px rgba(212,196,168,0.3)' }}>
                {' '}Automotive Marketplace
              </span>
            </h1>
            <p className="text-white/50 text-sm max-w-[500px] mx-auto">
              Live auctions, verified dealers, and M-Pesa secured escrow — East Africa's most sophisticated car marketplace.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleSearch}
            className="max-w-xl mx-auto mb-4"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-4 text-white/40" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by make, model, or year..."
                className="w-full pl-12 pr-4 py-3 rounded-full bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-gold/50 focus:bg-white/10 transition-all duration-300"
              />
              <button
                type="submit"
                className="absolute right-2 px-6 py-2 rounded-full bg-gold text-black font-semibold text-sm hover:bg-gold/90 transition-all duration-300"
              >
                Search
              </button>
            </div>
          </motion.form>

          {/* Live Auction Badge */}
          {liveCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <Link 
                to="/auctions/calendar"
                className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2 text-red-500 text-xs font-bold tracking-[0.08em] uppercase hover:bg-red-500/20 transition-all duration-300 no-underline"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {liveCount} Live Auction{liveCount !== 1 ? 's' : ''} — Bid Now
              </Link>
            </motion.div>
          )}
        </div>

        {/* Vehicle Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="vehicle-showcase"
        >
          {loading ? (
            <VehicleShowcaseSkeleton />
          ) : featuredCars.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {featuredCars.map((car, index) => (
                <motion.div
                  key={car._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                >
                  <FeaturedCarCard car={car} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/30 text-sm">
              No featured vehicles available
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none" style={{ background: 'linear-gradient(transparent, var(--bg))' }} />
    </section>
  );
}

// Featured Car Card Component
function FeaturedCarCard({ car }) {
  return (
    <Link 
      to={`/cars/${car._id}`}
      className="group block no-underline"
    >
      <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/10">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <LazyImage
            src={car.images?.[0] || '/placeholder-car.jpg'}
            alt={`${car.brand} ${car.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Price Badge */}
          {car.price && (
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <span className="text-gold font-bold text-sm">
                KES {car.price?.toLocaleString()}
              </span>
            </div>
          )}

          {/* Auction Badge */}
          {car.auctionEnd && new Date(car.auctionEnd) > new Date() && (
            <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm rounded-full px-2 py-1">
              <span className="text-white text-[10px] font-bold uppercase">Live Auction</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-display font-bold text-white text-sm mb-1 truncate">
            {car.brand} {car.title}
          </h3>
          <div className="flex items-center gap-3 text-white/50 text-xs">
            {car.year && <span>{car.year}</span>}
            {car.mileage && <span>• {car.mileage?.toLocaleString()} km</span>}
            {car.location && <span>• {car.location}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Loading Skeleton
function VehicleShowcaseSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
          <div className="aspect-[16/10] bg-gray-800 animate-pulse" />
          <div className="p-4">
            <div className="h-4 bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-3 bg-gray-700 rounded w-3/4 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
