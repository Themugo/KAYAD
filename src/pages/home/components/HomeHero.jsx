import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';
import { carsAPI } from '../../../api/api';

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

  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        // Priority 1: Admin-selected Hero Vehicles (showOnHero flag)
        // Priority 2: Featured Vehicles (isPromoted flag)
        // Priority 3: Random Active Listings with images
        const data = await carsAPI.list({ page: 1, limit: 10, sort: '-createdAt' });
        const cars = data.cars || data.data || [];
        
        // Filter for hero vehicles first
        const heroVehicles = cars.filter(c => c.showOnHero);
        const featuredVehicles = cars.filter(c => c.isPromoted && !c.showOnHero);
        const regularVehicles = cars.filter(c => !c.showOnHero && !c.isPromoted);
        
        // Build image list in priority order
        const priorityList = [...heroVehicles, ...featuredVehicles, ...regularVehicles];
        
        const withImages = priorityList
          .filter(c => c.images && c.images.length > 0 && c.images[0])
          .map(c => {
            const img = c.images[0];
            return typeof img === 'string' ? img : img?.url;
          })
          .filter(Boolean);

        if (withImages.length >= 3) {
          setImages(withImages.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to fetch hero images:', err);
      }
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

  return (
    <section className="relative overflow-hidden" style={{ height: '70vh', minHeight: '420px' }}>
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div key={currentIndex} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute inset-0">
            <LazyImage src={images[currentIndex]} alt="Premium Vehicle" className="w-full h-full object-cover" onLoad={() => setLoaded(true)} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      <button onClick={() => paginate(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/8 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center group" aria-label="Previous slide">
        <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
      </button>
      <button onClick={() => paginate(1)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/8 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center group" aria-label="Next slide">
        <ChevronRight size={22} className="group-hover:translate-x-0.5 transition-transform" />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {images.map((_, index) => (
          <button key={index} onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-gold w-7' : 'bg-white/25 w-2 hover:bg-white/45'}`}
            aria-label={`Go to slide ${index + 1}`} />
        ))}
      </div>

      <div className="absolute inset-0 z-10 flex items-center">
        <div className="max-w-[1400px] mx-auto px-6 w-full">
          <div className="max-w-xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
              className="mb-6">
              <h1 className="font-display font-black italic text-[clamp(2rem,4.5vw,3.5rem)] leading-[0.95] uppercase text-white tracking-[-0.02em] mb-2">
                Kenya's
                <span className="block text-gold" style={{ textShadow: '0 0 40px rgba(212,196,168,0.4)' }}>Premium Car</span>
                Marketplace
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-gold to-transparent rounded-full" />
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}
              className="text-white/70 text-[clamp(0.9rem,1.5vw,1.1rem)] font-medium mb-6 max-w-lg leading-relaxed">
              Live Bidding • Secure Escrow • M-Pesa Payments
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
              className="flex items-center gap-3 flex-wrap">
              <Link to="/showroom" className="px-8 py-4 bg-gold text-black font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/90 transition-all duration-300 shadow-lg shadow-gold/20 no-underline">Browse Cars</Link>
              <Link to="/auctions/calendar" className="px-8 py-4 bg-white/8 backdrop-blur-md border border-white/20 text-white font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-white/18 transition-all duration-300 no-underline">Live Auctions</Link>
              <Link to={isAuth ? '/seller' : '/register?sell=1&role=individual_seller'}
                className="px-8 py-4 bg-transparent border border-gold/30 text-gold font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/8 transition-all duration-300 no-underline">Sell Your Car</Link>
            </motion.div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 1024px) { section { height: 60vh !important; } }
        @media (max-width: 768px) { section { height: 50vh !important; } }
      `}</style>
    </section>
  );
}
