import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Shield, Star, Eye, Clock, Heart, GitCompare, Phone, ExternalLink } from 'lucide-react';
import { formatKES, timeAgo } from '../utils/helpers';
import { carsAPI } from '../api/api';

interface FeaturedCar {
  _id: string;
  title: string;
  brand: string;
  model: string;
  price: number;
  currentBid?: number;
  year: number;
  mileage?: number | string;
  fuel?: string;
  transmission?: string;
  location?: { city?: string };
  images?: Array<{ url?: string } | string>;
  isPromoted?: boolean;
  views?: number;
  createdAt?: string;
  escrowEnabled?: boolean;
  auctionStatus?: string;
  auctionEnd?: string;
  ntsaVerified?: boolean;
  dealer?: { name?: string; isBank?: boolean };
  isNegotiable?: boolean;
  hasFinancing?: boolean;
}

interface HeroCarouselProps {
  onViewCar: (car: FeaturedCar) => void;
  onCompare?: (car: FeaturedCar) => void;
  onFavorite?: (carId: string) => void;
  isFavorited?: (carId: string) => boolean;
  isComparing?: (carId: string) => boolean;
}

export default function HeroCarousel({ onViewCar, onCompare, onFavorite, isFavorited, isComparing }: HeroCarouselProps) {
  const [cars, setCars] = useState<FeaturedCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Fetch featured cars from API
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const data = await carsAPI.list({ page: 1, limit: 20, status: 'active' });
        const fetchedCars = data?.cars || data?.data || [];
        // Filter for promoted or featured
        const featured = fetchedCars.filter((car: FeaturedCar) => 
          car.isPromoted || (car.views && car.views > 100)
        );
        setCars(featured.length > 0 ? featured : fetchedCars.slice(0, 5));
      } catch {
        // API not available, will use demo data
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  // Demo featured cars fallback
  const demoCars: FeaturedCar[] = useMemo(() => [
    {
      _id: 'featured-1',
      title: 'Toyota Land Cruiser GX-R 2024',
      brand: 'Toyota',
      model: 'Land Cruiser GX-R',
      price: 18500000,
      year: 2024,
      mileage: '12,500 km',
      fuel: 'Petrol',
      transmission: 'Automatic',
      location: { city: 'Nairobi' },
      images: ['https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=1920&h=1080&fit=crop&q=90'],
      isPromoted: true,
      views: 1250,
      escrowEnabled: true,
      ntsaVerified: true,
      dealer: { name: 'Premium Motors KE' },
    },
    {
      _id: 'featured-2',
      title: 'Mercedes-Benz GLE 450 AMG 2023',
      brand: 'Mercedes-Benz',
      model: 'GLE 450 AMG',
      price: 14200000,
      year: 2023,
      mileage: '8,200 km',
      fuel: 'Petrol',
      transmission: 'Automatic',
      location: { city: 'Mombasa' },
      images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1920&h=1080&fit=crop&q=90'],
      isPromoted: true,
      views: 890,
      escrowEnabled: true,
      ntsaVerified: true,
      isNegotiable: true,
    },
    {
      _id: 'featured-3',
      title: 'Range Rover Sport HSE 2023',
      brand: 'Range Rover',
      model: 'Sport HSE',
      price: 16800000,
      year: 2023,
      mileage: '15,800 km',
      fuel: 'Diesel',
      transmission: 'Automatic',
      location: { city: 'Nairobi' },
      images: ['https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=1920&h=1080&fit=crop&q=90'],
      isPromoted: true,
      views: 720,
      escrowEnabled: true,
      dealer: { name: 'Elite Auto KE' },
      hasFinancing: true,
    },
    {
      _id: 'featured-4',
      title: 'Porsche Cayenne S 2022',
      brand: 'Porsche',
      model: 'Cayenne S',
      price: 13200000,
      year: 2022,
      mileage: '22,500 km',
      fuel: 'Petrol',
      transmission: 'Automatic',
      location: { city: 'Nairobi' },
      images: ['https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=1920&h=1080&fit=crop&q=90'],
      isPromoted: true,
      views: 560,
      escrowEnabled: true,
      ntsaVerified: true,
      isNegotiable: true,
    },
  ], []);

  const displayCars = cars.length > 0 ? cars : demoCars;
  const currentCar = displayCars[currentIndex];

  // Navigation functions
  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % displayCars.length);
  }, [displayCars.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + displayCars.length) % displayCars.length);
  }, [displayCars.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-play with pause/resume
  const startAutoplay = useCallback(() => {
    if (displayCars.length <= 1 || isPaused || isHovered) return;
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(nextSlide, 6000);
  }, [displayCars.length, isPaused, isHovered, nextSlide]);

  const stopAutoplay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  // Pause on hover
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    stopAutoplay();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
    
    startAutoplay();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Get image URL with responsive sizing
  const getImageUrl = (car: FeaturedCar, idx: number) => {
    const imgs = car.images || [];
    const img = imgs[0];
    let url = typeof img === 'string' ? img : img?.url;
    
    if (!url) {
      url = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=1920&h=1080&fit=crop&q=90';
    }
    
    return url;
  };

  // Toggle pause
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  if (!currentCar) return null;

  const isFav = isFavorited?.(currentCar._id) || false;
  const isComp = isComparing?.(currentCar._id) || false;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen min-h-[600px] overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides Container - Full Viewport */}
      <div 
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {displayCars.map((car, idx) => (
          <div
            key={car._id || idx}
            className="w-full h-full flex-shrink-0 relative"
          >
            {/* Background Image - Full Cover */}
            <div className="absolute inset-0">
              <img
                src={getImageUrl(car, idx)}
                alt={car.title}
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  imageLoaded[idx] ? 'opacity-100' : 'opacity-0'
                }`}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={() => setImageLoaded(prev => ({ ...prev, [idx]: true }))}
              />
              {/* Loading placeholder */}
              {!imageLoaded[idx] && (
                <div className="absolute inset-0 bg-charcoal-900 animate-pulse" />
              )}
            </div>

            {/* Premium Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/95 via-charcoal-950/60 to-charcoal-950/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/90 via-charcoal-950/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-charcoal-950/40" />

            {/* Main Content Container */}
            <div className="relative h-full flex items-center">
              <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
                <div className="max-w-2xl">
                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    {car.isPromoted && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-gold-500 to-gold-600 text-charcoal-900 text-xs font-bold rounded-full shadow-lg shadow-gold-500/30">
                        <Star size={12} fill="currentColor" /> FEATURED
                      </span>
                    )}
                    {car.escrowEnabled && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-charcoal-800/80 backdrop-blur-md text-white/90 text-xs font-semibold rounded-full border border-white/10">
                        <Shield size={12} /> ESCROW PROTECTED
                      </span>
                    )}
                    {car.ntsaVerified && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500/90 backdrop-blur-md text-white text-xs font-semibold rounded-full">
                        ✓ NTSA VERIFIED
                      </span>
                    )}
                    {car.auctionStatus === 'live' && (
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/90 backdrop-blur-md text-white text-xs font-bold rounded-full animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full" />
                        LIVE AUCTION
                      </span>
                    )}
                    {car.isNegotiable && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/10 backdrop-blur-md text-white/80 text-xs font-medium rounded-full border border-white/20">
                        NEGOTIABLE
                      </span>
                    )}
                    {car.hasFinancing && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gold-500/20 backdrop-blur-md text-gold-400 text-xs font-medium rounded-full border border-gold-500/30">
                        FINANCING AVAILABLE
                      </span>
                    )}
                  </div>

                  {/* Vehicle Title */}
                  <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-white font-bold mb-4 leading-tight">
                    {car.title}
                  </h2>

                  {/* Dealer Name */}
                  {car.dealer?.name && (
                    <p className="text-white/60 text-sm font-medium mb-6 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gold-500 rounded-full" />
                      {car.dealer.name}
                      {car.dealer.isBank && <span className="text-emerald-400">(Bank Owned)</span>}
                    </p>
                  )}

                  {/* Quick Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {car.year && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Year</p>
                        <p className="text-white font-semibold">{car.year}</p>
                      </div>
                    )}
                    {car.mileage && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Mileage</p>
                        <p className="text-white font-semibold">{typeof car.mileage === 'number' ? `${car.mileage.toLocaleString()} km` : car.mileage}</p>
                      </div>
                    )}
                    {car.fuel && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Fuel</p>
                        <p className="text-white font-semibold">{car.fuel}</p>
                      </div>
                    )}
                    {car.transmission && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Transmission</p>
                        <p className="text-white font-semibold">{car.transmission}</p>
                      </div>
                    )}
                  </div>

                  {/* Price Section */}
                  <div className="flex flex-wrap items-end gap-6 mb-8">
                    <div>
                      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
                        {car.currentBid ? 'Current Bid' : 'Price'}
                      </p>
                      <p className="font-serif text-4xl sm:text-5xl lg:text-6xl text-gold-400 font-bold">
                        {formatKES(car.currentBid || car.price)}
                      </p>
                    </div>
                    
                    {/* Location */}
                    {car.location?.city && (
                      <div className="flex items-center gap-2 text-white/60">
                        <MapPin size={18} />
                        <span>{car.location.city}, Kenya</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-4">
                    <button 
                      onClick={() => onViewCar(car)}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-charcoal-900 font-bold rounded-full transition-all duration-200 shadow-xl shadow-gold-500/30 hover:shadow-gold-500/50 hover:scale-105"
                    >
                      View Details <ExternalLink size={16} />
                    </button>
                    
                    <button className="inline-flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold rounded-full transition-all duration-200 border border-white/20 hover:border-white/40">
                      <Phone size={16} /> Contact Seller
                    </button>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onFavorite?.(car._id); }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isFav 
                            ? 'bg-red-500 text-white' 
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40'
                        }`}
                      >
                        <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCompare?.(car); }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isComp 
                            ? 'bg-gold-500 text-charcoal-900' 
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40'
                        }`}
                      >
                        <GitCompare size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-6 mt-8 text-white/40 text-sm">
                    {car.views && (
                      <span className="flex items-center gap-1.5">
                        <Eye size={14} /> {car.views.toLocaleString()} views
                      </span>
                    )}
                    {car.createdAt && (
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} /> Listed {timeAgo(car.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {displayCars.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-200 z-20 border border-white/10 hover:border-white/30 hover:scale-110 group"
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-200 z-20 border border-white/10 hover:border-white/30 hover:scale-110 group"
            aria-label="Next slide"
          >
            <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {displayCars.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
          {displayCars.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
              className={`rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'w-8 h-2 bg-gold-400' 
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {displayCars.length > 1 && !isPaused && !isHovered && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
          <div 
            key={currentIndex}
            className="h-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-[6000ms] linear"
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Slide Counter */}
      {displayCars.length > 1 && (
        <div className="absolute bottom-8 right-8 text-white/60 text-sm font-medium z-20">
          <span className="text-white font-bold">{currentIndex + 1}</span>
          <span className="mx-1">/</span>
          <span>{displayCars.length}</span>
        </div>
      )}

      {/* Pause/Play Button */}
      {displayCars.length > 1 && (
        <button
          onClick={togglePause}
          className="absolute bottom-8 left-8 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-200 z-20 border border-white/10 hover:border-white/30"
          aria-label={isPaused ? 'Play' : 'Pause'}
        >
          {isPaused ? (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
          )}
        </button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-charcoal-950 flex items-center justify-center z-30">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
            <p className="text-white/60 font-medium">Loading featured vehicles...</p>
          </div>
        </div>
      )}

      {/* Swipe Indicator (Mobile) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 translate-y-8 opacity-0 hover:opacity-100 transition-opacity z-20 pointer-events-none sm:hidden">
        <p className="text-white/40 text-xs">Swipe to navigate</p>
      </div>
    </div>
  );
}
