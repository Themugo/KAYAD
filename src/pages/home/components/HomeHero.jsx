import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, Gavel, TrendingUp } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';
import { carsAPI, platformStatsAPI } from '../../../api/api';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1920&q=80',
];

export default function HomeHero({ liveCount, isAuth, user }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [images, setImages] = useState(FALLBACK_IMAGES);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        const data = await carsAPI.list({ page: 1, limit: 10, sort: '-createdAt' });
        const cars = data.cars || data.data || [];
        const heroVehicles = cars.filter(c => c.showOnHero);
        const featuredVehicles = cars.filter(c => c.isPromoted && !c.showOnHero);
        const regularVehicles = cars.filter(c => !c.showOnHero && !c.isPromoted);
        const priorityList = [...heroVehicles, ...featuredVehicles, ...regularVehicles];
        const withImages = priorityList
          .filter(c => c.images && c.images.length > 0 && c.images[0])
          .map(c => { const img = c.images[0]; return typeof img === 'string' ? img : img?.url; })
          .filter(Boolean);
        if (withImages.length >= 3) setImages(withImages.slice(0, 5));
      } catch (err) { console.error('Failed to fetch hero images:', err); }
    };
    fetchHeroImages();
    platformStatsAPI.get().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  const slideVariants = {
    enter: (direction) => ({ x: direction > 0 ? 800 : -800, opacity: 0, scale: 1.08 }),
    center: { x: 0, opacity: 1, scale: 1, transition: { x: { type: 'spring', stiffness: 250, damping: 25 }, opacity: { duration: 0.6 }, scale: { duration: 0.6 } } },
    exit: (direction) => ({ x: direction < 0 ? 800 : -800, opacity: 0, scale: 1.08, transition: { x: { type: 'spring', stiffness: 250, damping: 25 }, opacity: { duration: 0.4 }, scale: { duration: 0.4 } } }),
  };

  const paginate = useCallback((newDirection) => {
    setDirection(newDirection);
    setCurrentIndex(prev => {
      if (newDirection === 1) return (prev + 1) % images.length;
      return (prev - 1 + images.length) % images.length;
    });
  }, [images.length]);

  const goToSlide = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/showroom?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const totalCars = stats?.totalCars?.toLocaleString() || '—';
  const totalDealers = stats?.verifiedDealers?.toLocaleString() || '—';

  return (
    <section className="relative overflow-hidden" style={{ height: '80vh', minHeight: '520px' }}>
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div key={currentIndex} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute inset-0">
            <LazyImage src={images[currentIndex]} alt="Premium Vehicle" className="w-full h-full object-cover" onLoad={() => setLoaded(true)} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide navigation arrows */}
      <button onClick={() => paginate(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/8 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center group" aria-label="Previous slide">
        <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
      </button>
      <button onClick={() => paginate(1)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/8 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center group" aria-label="Next slide">
        <ChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-36 md:bottom-32 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {images.map((_, index) => (
          <button key={index} onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-gold w-7' : 'bg-white/25 w-2 hover:bg-white/45'}`}
            aria-label={`Go to slide ${index + 1}`} />
        ))}
      </div>

      {/* Hero content */}
      <div className="absolute inset-0 z-10 flex items-center">
        <div className="max-w-[1400px] mx-auto px-6 w-full">
          <div className="max-w-xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                {liveCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.08em] uppercase bg-red-500/15 border border-red-500/25 text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {liveCount} Live Auction{liveCount !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-[10px] font-semibold tracking-[0.12em] text-white/30 uppercase">
                  Kenya's #1 Auto Marketplace
                </span>
              </div>
              <h1 className="font-display font-black italic text-[clamp(2rem,4.5vw,3.8rem)] leading-[0.92] uppercase text-white tracking-[-0.02em] mb-3">
                Drive with
                <span className="block text-gold" style={{ textShadow: '0 0 40px rgba(212,196,168,0.4)' }}>Confidence.</span>
              </h1>
              <p className="text-white/60 text-[clamp(0.85rem,1.3vw,1rem)] font-medium max-w-md leading-relaxed">
                East Africa's most trusted marketplace. Every transaction secured by mandatory escrow.
              </p>
            </motion.div>

            {/* Search bar */}
            <motion.form onSubmit={handleSearch} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="relative mb-5 max-w-md"
            >
              <div className="flex items-center rounded-full overflow-hidden border border-white/10" style={{ background: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(12px)' }}>
                <Search size={16} className="ml-4 text-white/30 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by make, model, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-white text-sm py-3 px-3 outline-none placeholder-white/30"
                />
                <button type="submit" className="bg-gold hover:bg-gold/90 text-black text-xs font-bold uppercase tracking-[0.08em] px-5 py-3 rounded-full mx-1 transition-all duration-200 flex-shrink-0 cursor-pointer border-none">
                  Search
                </button>
              </div>
            </motion.form>

            {/* Primary CTAs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }} className="flex items-center gap-3 flex-wrap mb-6">
              <Link to="/showroom" className="btn-gold px-8 py-4 rounded-full text-sm uppercase tracking-[0.08em] no-underline shadow-lg shadow-gold/20">
                Browse Cars
              </Link>
              <Link to="/auctions/calendar" className="inline-flex items-center gap-2 px-8 py-4 bg-white/8 backdrop-blur-md border border-white/20 text-white font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-white/18 transition-all duration-300 no-underline">
                <Gavel size={14} /> Live Auctions
              </Link>
              <Link to={isAuth ? '/seller' : '/register?sell=1&role=individual_seller'}
                className="px-8 py-4 bg-transparent border border-gold/30 text-gold font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/8 transition-all duration-300 no-underline">
                Sell Your Car
              </Link>
            </motion.div>

            {/* Floating stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
              className="flex items-center gap-6"
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-gold" />
                <span className="text-xs text-white/40"><strong className="text-white/70">{totalCars}</strong> vehicles</span>
              </div>
              <div className="flex items-center gap-2">
                <Gavel size={13} className="text-gold" />
                <span className="text-xs text-white/40"><strong className="text-white/70">{totalDealers}</strong> dealers</span>
              </div>
              {liveCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">{liveCount} Live</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) { section { height: 70vh !important; min-height: 480px !important; } }
        @media (max-width: 768px) { section { height: 60vh !important; min-height: 440px !important; } }
        @media (max-width: 480px) { section { height: 75vh !important; min-height: 500px !important; } }
      `}</style>
    </section>
  );
}
