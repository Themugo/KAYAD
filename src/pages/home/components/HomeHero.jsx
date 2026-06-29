import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield, Lock, Gavel, CheckCircle } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';
import { carsAPI } from '../../../api/api';

// Premium hero slider images - using vehicle gallery images
const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1920&q=80',
];

export default function HomeHero({ liveCount, isAuth, user }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [images, setImages] = useState(HERO_IMAGES);

  // Fetch featured car images to use in slider
  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        const data = await carsAPI.list({ page: 1, limit: 5, sort: '-createdAt' });
        const cars = data.cars || data.data || [];
        
        if (cars.length > 0) {
          const carImages = cars
            .filter(c => c.images && c.images.length > 0)
            .map(c => c.images[0])
            .filter(Boolean);
          
          if (carImages.length >= 3) {
            setImages(carImages.slice(0, 5));
          }
        }
      } catch (err) {
        console.error('Failed to fetch hero images:', err);
        // Keep default images on error
      }
    };

    fetchHeroImages();
  }, []);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 1.1,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
      },
    },
    exit: (direction) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 1.1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
      },
    }),
  };

  const paginate = useCallback((newDirection) => {
    setDirection(newDirection);
    setCurrentIndex(prev => {
      if (newDirection === 1) {
        return (prev + 1) % images.length;
      } else {
        return (prev - 1 + images.length) % images.length;
      }
    });
  }, [images.length]);

  const goToSlide = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  return (
    <section 
      className="relative overflow-hidden"
      style={{ 
        height: '70vh',
        minHeight: '400px'
      }}
    >
      {/* Slider Container */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            <LazyImage
              src={images[currentIndex]}
              alt="Premium Vehicle"
              className="w-full h-full object-cover"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => paginate(-1)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center group"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
      </button>
      <button
        onClick={() => paginate(1)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center group"
        aria-label="Next slide"
      >
        <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-gold w-8' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 z-10 flex items-center">
        <div className="max-w-[1400px] mx-auto px-6 w-full">
          <div className="max-w-2xl">
            {/* Trust Indicators */}
            <div className="flex items-center gap-6 mb-8 flex-wrap">
              <div className="flex items-center gap-2 text-white/80">
                <Shield size={18} className="text-gold" />
                <span className="text-sm font-medium">Verified Dealers</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Lock size={18} className="text-gold" />
                <span className="text-sm font-medium">Escrow Protected</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Gavel size={18} className="text-gold" />
                <span className="text-sm font-medium">Live Auctions</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <CheckCircle size={18} className="text-gold" />
                <span className="text-sm font-medium">Vehicle Verification</span>
              </div>
            </div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="font-display font-black italic text-[clamp(2rem,5vw,4rem)] leading-[0.95] uppercase text-white tracking-[-0.02em] mb-4"
            >
              East Africa's Most Trusted
              <span className="block text-gold" style={{ textShadow: '0 0 40px rgba(212,196,168,0.4)' }}>
                Automotive Marketplace
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-white/70 text-lg mb-8 max-w-xl"
            >
              Verified dealers. Live auctions. Secure escrow.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex items-center gap-4 flex-wrap"
            >
              <Link
                to="/showroom"
                className="px-8 py-4 bg-gold text-black font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/90 transition-all duration-300 shadow-lg shadow-gold/20 no-underline"
              >
                Browse Cars
              </Link>
              <Link
                to="/auctions/calendar"
                className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-white/20 transition-all duration-300 no-underline"
              >
                Live Auctions
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile responsive height adjustments */}
      <style>{`
        @media (max-width: 1024px) {
          section {
            height: 60vh !important;
          }
        }
        @media (max-width: 768px) {
          section {
            height: 50vh !important;
          }
        }
      `}</style>
    </section>
  );
}
