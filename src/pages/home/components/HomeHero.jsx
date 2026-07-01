import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';
import { carsAPI } from '../../../api/api';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1920&q=80',
];

export default function HomeHero({ liveCount, isAuth, user }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [images, setImages] = useState(FALLBACK_IMAGES);
  const [searchQuery, setSearchQuery] = useState('');
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
    if (searchQuery.trim()) navigate(`/showroom?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <section className="home-hero-section relative overflow-hidden" style={{ height: '85vh', minHeight: '560px' }}>
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div key={currentIndex} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute inset-0">
            <LazyImage src={images[currentIndex]} alt="Premium vehicle" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      <button onClick={() => paginate(-1)} className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/8 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all duration-300 items-center justify-center" aria-label="Previous">
        <ChevronLeft size={20} />
      </button>
      <button onClick={() => paginate(1)} className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/8 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all duration-300 items-center justify-center" aria-label="Next">
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {images.map((_, i) => (
          <button key={i} onClick={() => goToSlide(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-gold w-8' : 'bg-white/20 w-1.5 hover:bg-white/40'}`}
            aria-label={`Slide ${i + 1}`} />
        ))}
      </div>

      <div className="absolute inset-0 z-10 flex items-center">
        <div className="max-w-[1400px] mx-auto px-8 w-full">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="mb-6">
              <h1 className="font-display font-black italic text-[clamp(2.2rem,5vw,4.2rem)] leading-[0.9] uppercase text-white tracking-[-0.02em] mb-4">
                Kenya's Premium
                <span className="block text-gold" style={{ textShadow: '0 0 50px rgba(212,196,168,0.3)' }}>Car Marketplace</span>
              </h1>
              <p className="text-white/50 text-[clamp(0.9rem,1.2vw,1.05rem)] max-w-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Every transaction secured by mandatory escrow. East Africa's most trusted way to buy and sell premium vehicles.
              </p>
            </motion.div>

            <motion.form onSubmit={handleSearch} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="relative mb-8 max-w-lg"
            >
              <div className="flex items-center rounded-full overflow-hidden" style={{ background: 'rgba(15,15,15,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Search size={16} className="ml-4 text-white/30 flex-shrink-0" />
                <input type="text" placeholder="Search by make, model, or keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-white text-sm py-3.5 px-3 outline-none placeholder-white/25" />
                <button type="submit" className="bg-gold hover:bg-gold/90 text-black text-xs font-bold uppercase tracking-[0.08em] px-6 py-3.5 rounded-full mx-1 transition-all duration-200 flex-shrink-0 cursor-pointer border-none">
                  Search
                </button>
              </div>
            </motion.form>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Link to="/showroom" className="btn-gold px-8 py-3.5 rounded-full text-sm uppercase tracking-[0.08em] no-underline text-center">
                Browse Cars
              </Link>
              {liveCount > 0 && (
                <Link to="/auctions/calendar" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/15 text-white text-sm uppercase tracking-[0.08em] rounded-full hover:bg-white/8 transition-all duration-300 no-underline font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {liveCount} Live Auction{liveCount !== 1 ? 's' : ''}
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) { .home-hero-section { height: 70vh !important; min-height: 480px !important; } }
        @media (max-width: 768px) { .home-hero-section { height: 65vh !important; min-height: 420px !important; } }
        @media (max-width: 480px) {
          .home-hero-section { height: 75vh !important; min-height: 460px !important; }
          .home-hero-section .px-8 { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>
    </section>
  );
}
