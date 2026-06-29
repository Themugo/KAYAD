import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LazyImage from '../../components/LazyImage';
import { carsAPI } from '../../api/api';

export default function HomeHero({ liveCount, isAuth, user }) {
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch featured cars for carousel
  useEffect(() => {
    let cancelled = false;
    const fetchFeaturedCars = async () => {
      try {
        setLoading(true);
        const data = await carsAPI.list({ page: 1, limit: 10, sort: '-createdAt' });
        if (cancelled) return;
        
        let all = data.cars || data.data || [];
        
        // Prioritize promoted cars, then recent
        const featured = [
          ...all.filter(c => c.isPromoted).slice(0, 5),
          ...all.filter(c => !c.isPromoted).slice(0, 5)
        ].slice(0, 6); // Max 6 slides
        
        // Create slide objects with car data
        const slideData = featured.map(car => ({
          id: car._id,
          title: car.title,
          brand: car.brand,
          price: car.price,
          image: car.images?.[0] || '/placeholder-car.jpg',
          year: car.year,
          mileage: car.mileage,
          location: car.location || 'Nairobi',
          isAuction: car.auctionEnd && new Date(car.auctionEnd) > new Date()
        }));
        
        if (slideData.length > 0) {
          setSlides(slideData);
        } else {
          // Fallback to static slides if no cars
          setSlides(getStaticSlides());
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch featured cars:', err);
          setError(err);
          setSlides(getStaticSlides());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFeaturedCars();
    return () => { cancelled = true; };
  }, []);

  // Auto-rotation timer with cleanup
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000); // 6 second interval

    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const goToSlide = (index) => setCurrentSlide(index);

  // Touch swipe handlers
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    const diff = touchStart - touchEnd;
    if (diff > 50) nextSlide();
    if (diff < -50) prevSlide();
  };

  if (loading) {
    return <HeroSkeleton />;
  }

  return (
    <section 
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: '70vh', minHeight: 'min(70vh, 620px)' }}
    >
      {/* Carousel Slides */}
      <AnimatePresence mode='wait'>
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {slides[currentSlide] && (
            <>
              {/* Background Image */}
              <LazyImage
                src={slides[currentSlide].image}
                alt={`${slides[currentSlide].brand} ${slides[currentSlide].title}`}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.4)' }}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              {/* Content */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 pb-6 pt-10 md:pt-16">
                <div className="flex items-center gap-3 mb-4 z-[1]">
                  <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.4))' }} />
                  <span className="text-gold text-[9px] font-extrabold tracking-[0.16em] uppercase">Kenya's Premium Car Marketplace</span>
                  <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, rgba(212,196,168,0.4), transparent)' }} />
                </div>

                {liveCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1 mb-3 z-[1]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 block animate-pulse" />
                    <span className="text-[9px] text-red-500 font-bold tracking-[0.08em] uppercase">{liveCount} Live Auction{liveCount !== 1 ? 's' : ''} — Bid Now</span>
                  </div>
                )}

                <h1 className="z-[1]" style={{ margin: 0 }}>
                  <span className="block font-display font-black italic text-[clamp(2rem,5vw,3.8rem)] leading-[0.92] uppercase text-white tracking-[-0.015em]">
                    {slides[currentSlide].brand}
                  </span>
                  <span className="block font-display font-black italic text-[clamp(2rem,5vw,3.8rem)] leading-[0.92] uppercase tracking-[-0.015em]" style={{ color: 'var(--gold)', textShadow: '0 0 40px rgba(212,196,168,0.3)' }}>
                    {slides[currentSlide].title}
                  </span>
                </h1>

                <p className="text-white/50 text-xs md:text-sm max-w-[480px] mx-auto mb-5 leading-relaxed z-[1] font-normal">
                  {slides[currentSlide].year} • {slides[currentSlide].mileage?.toLocaleString()} km • {slides[currentSlide].location}
                </p>

                <div className="flex gap-2.5 justify-center flex-wrap z-[1]">
                  <Link 
                    to={`/cars/${slides[currentSlide].id}`} 
                    className="home-hero-primary-btn px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.1em] text-black no-underline inline-block transition-all duration-300"
                  >
                    View Details
                  </Link>
                  <Link 
                    to="/showroom" 
                    className="home-hero-secondary-btn px-8 py-3 rounded-full font-semibold text-[10px] uppercase tracking-[0.1em] text-white/75 no-underline inline-block transition-all duration-300 border border-white/14"
                  >
                    Browse Gallery
                  </Link>
                </div>

                {isAuth && (
                  <div className="mt-4 text-[10px] text-white/18 z-[1]">
                    Welcome back, <strong className="text-white/60">{user?.name?.split(' ')[0] || user?.email}</strong>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      {slides.length > 1 && (
        <>
          {/* Previous Button */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-300 backdrop-blur-sm"
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Next Button */}
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-300 backdrop-blur-sm"
            aria-label="Next slide"
          >
            <ChevronRight size={24} />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-gold w-6' : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-[1]" style={{ background: 'linear-gradient(transparent, var(--bg))' }} />
    </section>
  );
}

// Fallback static slides
function getStaticSlides() {
  return [
    {
      id: 'static-1',
      title: 'Premium Collection',
      brand: 'Luxury Drive',
      price: 2500000,
      image: '/placeholder-car-1.jpg',
      year: 2024,
      mileage: 5000,
      location: 'Nairobi',
      isAuction: false
    },
    {
      id: 'static-2',
      title: 'Sports Edition',
      brand: 'Performance',
      price: 3500000,
      image: '/placeholder-car-2.jpg',
      year: 2023,
      mileage: 12000,
      location: 'Mombasa',
      isAuction: true
    }
  ];
}

// Loading skeleton
function HeroSkeleton() {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: '70vh', minHeight: 'min(70vh, 620px)' }}>
      <div className="absolute inset-0 bg-gray-900 animate-pulse" />
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <div className="w-32 h-8 bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="w-64 h-16 bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="w-48 h-4 bg-gray-700 rounded mb-6 animate-pulse" />
        <div className="flex gap-4">
          <div className="w-32 h-10 bg-gray-700 rounded-full animate-pulse" />
          <div className="w-32 h-10 bg-gray-700 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
