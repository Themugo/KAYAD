import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Star, Heart, GitCompare, Phone, ExternalLink } from 'lucide-react';
import { formatKES } from '../utils/helpers';
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
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const minSwipeDistance = 50;

  // Fetch featured cars from API
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const data = await carsAPI.list({ page: 1, limit: 20, status: 'active' });
        const fetchedCars = data?.cars || data?.data || [];
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
      images: ['https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=1600&h=900&fit=crop&q=90'],
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
      images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1600&h=900&fit=crop&q=90'],
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
      images: ['https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=1600&h=900&fit=crop&q=90'],
      isPromoted: true,
      views: 720,
      escrowEnabled: true,
      dealer: { name: 'Elite Auto KE' },
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
      images: ['https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=1600&h=900&fit=crop&q=90'],
      isPromoted: true,
      views: 560,
      escrowEnabled: true,
      ntsaVerified: true,
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

  // Auto-play
  const startAutoplay = useCallback(() => {
    if (displayCars.length <= 1 || isHovered) return;
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(nextSlide, 6000);
  }, [displayCars.length, isHovered, nextSlide]);

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

  // Touch handlers
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
    if (distance > minSwipeDistance) nextSlide();
    if (distance < -minSwipeDistance) prevSlide();
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

  const getImageUrl = (car: FeaturedCar) => {
    const imgs = car.images || [];
    const img = imgs[0];
    return typeof img === 'string' ? img : img?.url || 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=1600&h=900&fit=crop&q=90';
  };

  if (!currentCar) return null;

  const isFav = isFavorited?.(currentCar._id) || false;
  const isComp = isComparing?.(currentCar._id) || false;

  return (
    <div 
      className="relative w-full h-[65vh] min-h-[400px] max-h-[800px] overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides Container - Balanced Height */}
      <div 
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {displayCars.map((car, idx) => (
          <div
            key={car._id || idx}
            className="w-full h-full flex-shrink-0 relative"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={getImageUrl(car)}
                alt={car.title}
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  imageLoaded[idx] ? 'opacity-100' : 'opacity-0'
                }`}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={() => setImageLoaded(prev => ({ ...prev, [idx]: true }))}
              />
              {!imageLoaded[idx] && (
                <div className="absolute inset-0 bg-charcoal-900 animate-pulse" />
              )}
            </div>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/95 via-charcoal-950/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-charcoal-950/30 to-transparent" />

            {/* Content */}
            <div className="relative h-full flex items-center">
              <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
                <div className="max-w-xl lg:max-w-2xl">
                  {/* Featured Badge */}
                  {car.isPromoted && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-gold-500 to-gold-600 text-charcoal-900 text-xs font-bold rounded-full mb-4">
                      <Star size={12} fill="currentColor" /> FEATURED
                    </span>
                  )}

                  {/* Vehicle Title */}
                  <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-white font-bold mb-3 leading-tight">
                    {car.title}
                  </h2>

                  {/* Dealer & Location */}
                  <div className="flex flex-wrap items-center gap-3 text-white/60 text-sm mb-4">
                    {car.dealer?.name && (
                      <span className="flex items-center gap-1.5">
                        {car.dealer.name}
                      </span>
                    )}
                    {car.location?.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {car.location.city}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <p className="font-serif text-3xl sm:text-4xl lg:text-5xl text-gold-400 font-bold mb-6">
                    {formatKES(car.currentBid || car.price)}
                  </p>

                  {/* Year */}
                  <p className="text-white/50 text-sm mb-6">
                    {car.year} {car.mileage && `• ${car.mileage}`} {car.fuel && `• ${car.fuel}`}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => onViewCar(car)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-charcoal-900 font-bold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      View Details <ExternalLink size={16} />
                    </button>
                    
                    <button className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold rounded-full transition-all duration-200 border border-white/20 hover:border-white/40">
                      <Phone size={16} /> Contact
                    </button>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onFavorite?.(car._id); }}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isFav 
                            ? 'bg-red-500 text-white' 
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40'
                        }`}
                      >
                        <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCompare?.(car); }}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isComp 
                            ? 'bg-gold-500 text-charcoal-900' 
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40'
                        }`}
                      >
                        <GitCompare size={18} />
                      </button>
                    </div>
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
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-200 z-20 border border-white/10 hover:border-white/30 hover:scale-110"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all duration-200 z-20 border border-white/10 hover:border-white/30 hover:scale-110"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {displayCars.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {displayCars.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
              className={`rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'w-6 h-2 bg-gold-400' 
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Slide Counter */}
      {displayCars.length > 1 && (
        <div className="absolute bottom-6 right-6 text-white/60 text-xs font-medium z-20">
          <span className="text-white font-bold">{currentIndex + 1}</span>
          <span className="mx-1">/</span>
          <span>{displayCars.length}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-charcoal-950 flex items-center justify-center z-30">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
