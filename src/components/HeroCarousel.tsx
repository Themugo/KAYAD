import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Shield, Star, Eye, Clock } from 'lucide-react';
import { formatKES, timeAgo } from '../utils/helpers';

interface FeaturedCar {
  _id: string;
  title: string;
  brand: string;
  model: string;
  price: number;
  currentBid?: number;
  year: number;
  mileage?: number;
  fuel?: string;
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
}

interface HeroCarouselProps {
  onViewCar: (car: FeaturedCar) => void;
}

export default function HeroCarousel({ onViewCar }: HeroCarouselProps) {
  const [cars, setCars] = useState<FeaturedCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch featured cars (promoted or top-viewed)
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Try to fetch from API
        const response = await fetch('/api/cars?page=1&limit=10&status=active');
        if (response.ok) {
          const data = await response.json();
          const fetchedCars = data?.cars || data?.data || [];
          // Filter for promoted or top viewed
          const featured = fetchedCars.filter((car: FeaturedCar) => 
            car.isPromoted || (car.views && car.views > 100)
          ).slice(0, 5);
          setCars(featured.length > 0 ? featured : fetchedCars.slice(0, 5));
        }
      } catch {
        // API not available, will use demo data
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  // Fallback demo featured cars
  const demoCars: FeaturedCar[] = [
    {
      _id: 'featured-1',
      title: 'Toyota Land Cruiser GX-R 2024',
      brand: 'Toyota',
      model: 'Land Cruiser GX-R',
      price: 18500000,
      year: 2024,
      mileage: '12,500 km',
      fuel: 'Petrol',
      location: { city: 'Nairobi' },
      images: ['https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=1200&h=800&fit=crop'],
      isPromoted: true,
      views: 1250,
      escrowEnabled: true,
      ntsaVerified: true,
    },
    {
      _id: 'featured-2',
      title: 'Mercedes-Benz GLE 450 2023',
      brand: 'Mercedes-Benz',
      model: 'GLE 450',
      price: 14200000,
      year: 2023,
      mileage: '8,200 km',
      fuel: 'Petrol',
      location: { city: 'Mombasa' },
      images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1200&h=800&fit=crop'],
      isPromoted: true,
      views: 890,
      escrowEnabled: true,
      ntsaVerified: true,
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
      location: { city: 'Nairobi' },
      images: ['https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=1200&h=800&fit=crop'],
      isPromoted: true,
      views: 720,
      escrowEnabled: true,
      dealer: { name: 'Premium Motors KE' },
    },
  ];

  const displayCars = cars.length > 0 ? cars : demoCars;

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
  useEffect(() => {
    if (displayCars.length <= 1) return;
    autoPlayRef.current = setInterval(nextSlide, 5000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [nextSlide, displayCars.length]);

  const pauseAutoplay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
  };

  const resumeAutoplay = () => {
    if (displayCars.length <= 1) return;
    autoPlayRef.current = setInterval(nextSlide, 5000);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    pauseAutoplay();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) nextSlide();
    else if (diff < -50) prevSlide();
    setTouchStart(null);
    resumeAutoplay();
  };

  const currentCar = displayCars[currentIndex];
  if (!currentCar) return null;

  const firstImage = (car: FeaturedCar) => {
    const imgs = car.images || [];
    const img = imgs[0];
    if (typeof img === 'string') return img;
    return img?.url || 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=1200&h=800&fit=crop';
  };

  return (
    <div 
      className="relative w-full overflow-hidden rounded-2xl"
      onMouseEnter={pauseAutoplay}
      onMouseLeave={resumeAutoplay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Container */}
      <div 
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {displayCars.map((car, idx) => (
          <div
            key={car._id || idx}
            className="w-full flex-shrink-0"
            onClick={() => onViewCar(car as any)}
          >
            <div className="relative aspect-[21/9] bg-charcoal-800 overflow-hidden">
              <img
                src={firstImage(car)}
                alt={car.title}
                className="w-full h-full object-cover"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/90 via-charcoal-950/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-transparent to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex items-center">
                <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12">
                  <div className="max-w-xl">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {car.isPromoted && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gold-500/90 text-charcoal-900 text-xs font-bold rounded-full">
                          <Star size={12} /> FEATURED
                        </span>
                      )}
                      {car.escrowEnabled && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-charcoal-800/80 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
                          <Shield size={12} /> ESCROW
                        </span>
                      )}
                      {car.ntsaVerified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/90 text-white text-xs font-semibold rounded-full">
                          ✓ NTSA OK
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white font-bold mb-2 leading-tight">
                      {car.title}
                    </h2>

                    {/* Quick Specs */}
                    <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm mb-4">
                      {car.year && <span>{car.year}</span>}
                      {car.mileage && <span>· {car.mileage}</span>}
                      {car.fuel && <span>· {car.fuel}</span>}
                      {car.location?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {car.location.city}
                        </span>
                      )}
                    </div>

                    {/* Price & Stats */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
                          {car.currentBid ? 'Current Bid' : 'Price'}
                        </p>
                        <p className="font-serif text-3xl sm:text-4xl text-gold-400 font-bold">
                          {formatKES(car.currentBid || car.price)}
                        </p>
                      </div>
                      
                      <div className="hidden sm:flex items-center gap-4 text-white/50 text-xs">
                        {car.views && (
                          <span className="flex items-center gap-1">
                            <Eye size={14} /> {car.views.toLocaleString()}
                          </span>
                        )}
                        {car.createdAt && (
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {timeAgo(car.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Badge */}
              {car.auctionStatus === 'live' && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-500/90 text-white text-xs font-bold rounded-full">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE AUCTION
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {displayCars.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all z-10"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all z-10"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {displayCars.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {displayCars.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); goToSlide(idx); }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'w-6 bg-gold-400' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-charcoal-800 animate-pulse flex items-center justify-center">
          <div className="text-gold-400 font-serif text-xl">Loading featured vehicles...</div>
        </div>
      )}
    </div>
  );
}
