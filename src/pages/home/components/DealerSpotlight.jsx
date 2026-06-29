import { Link } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, Car, Award, ChevronLeft, ChevronRight, TrendingUp, Calendar, Shield, Crown } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';

export default function DealerSpotlight({ dealers = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  if (dealers.length === 0) return null;

  const paginate = useCallback((newDirection) => {
    setDirection(newDirection);
    setCurrentIndex(prev => {
      if (newDirection === 1) {
        return (prev + 1) % dealers.length;
      } else {
        return (prev - 1 + dealers.length) % dealers.length;
      }
    });
  }, [dealers.length]);

  const goToSlide = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.95,
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
      scale: 0.95,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.5 },
        scale: { duration: 0.5 },
      },
    }),
  };

  const currentDealer = dealers[currentIndex];

  return (
    <section className="py-16 md:py-24 border-t border-white/[0.04] relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-7 relative z-10">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              {currentDealer.isPremium && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.15)', border: '1px solid rgba(212,196,168,0.3)' }}>
                  <Crown size={10} />
                  Premium
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                Featured
              </span>
              <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Dealer Spotlight</span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.5rem,3vw,2.5rem)] text-white leading-none m-0">
              Elite <span className="text-gold">Dealers</span>
            </h2>
          </div>
          <Link to="/showroom" className="text-[11px] font-bold no-underline tracking-[0.06em] flex items-center gap-1 transition-colors duration-200 hover:text-gold" style={{ color: 'rgba(212,196,168,0.7)' }}>
            View All →
          </Link>
        </div>

        {/* Carousel */}
        <div className="relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="relative"
            >
              <Link to={`/dealer/${currentDealer._id}`} className="block no-underline">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-gold/30 transition-all duration-500 hover:shadow-2xl hover:shadow-gold/10">
                  {/* Premium Border for Sponsored Dealers */}
                  {currentDealer.isSponsored && (
                    <div className="absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-r from-gold via-gold/50 to-gold opacity-50 pointer-events-none" />
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Left Side - Dealer Info */}
                    <div className="p-8 md:p-12">
                      {/* Header */}
                      <div className="flex items-start gap-6 mb-8">
                        <div className="relative">
                          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-gold/30">
                            <LazyImage
                              src={currentDealer.logo || '/placeholder-dealer.jpg'}
                              alt={currentDealer.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {currentDealer.verified && (
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gold rounded-full flex items-center justify-center border-4 border-[#0a0a0a]">
                              <Shield size={14} className="text-black" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-display font-black text-white text-2xl md:text-3xl">
                              {currentDealer.name}
                            </h3>
                            {currentDealer.isPremium && (
                              <Crown size={20} className="text-gold" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-white/50 text-sm mb-3">
                            <MapPin size={14} />
                            <span>{currentDealer.location || 'Kenya'}</span>
                          </div>
                          {currentDealer.description && (
                            <p className="text-white/60 text-sm line-clamp-2">
                              {currentDealer.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Trust Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Star size={16} className="text-gold fill-gold" />
                            <span className="text-white/40 text-xs uppercase tracking-wider">Trust Score</span>
                          </div>
                          <p className="font-display font-black text-white text-2xl">
                            {currentDealer.trustScore || currentDealer.rating || '9.5'}
                            <span className="text-gold text-lg">/10</span>
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Car size={16} className="text-gold" />
                            <span className="text-white/40 text-xs uppercase tracking-wider">Sales</span>
                          </div>
                          <p className="font-display font-black text-white text-2xl">
                            {currentDealer.completedSales || currentDealer.listingsCount || 0}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar size={16} className="text-gold" />
                            <span className="text-white/40 text-xs uppercase tracking-wider">Years</span>
                          </div>
                          <p className="font-display font-black text-white text-2xl">
                            {currentDealer.yearsActive || new Date().getFullYear() - (currentDealer.joinedYear || 2020)}
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={16} className="text-gold" />
                            <span className="text-white/40 text-xs uppercase tracking-wider">Rating</span>
                          </div>
                          <p className="font-display font-black text-white text-2xl">
                            {currentDealer.rating || '4.8'}
                            <span className="text-gold text-lg">★</span>
                          </p>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="flex items-center gap-4">
                        <button className="px-8 py-3 bg-gold text-black font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/90 transition-all duration-300 shadow-lg shadow-gold/20">
                          View Inventory
                        </button>
                        {currentDealer.isSponsored && (
                          <span className="text-[10px] text-gold/60 uppercase tracking-wider">
                            Sponsored Placement
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Side - Featured Inventory */}
                    <div className="relative aspect-[4/3] lg:aspect-auto bg-black/30">
                      <LazyImage
                        src={currentDealer.coverImage || currentDealer.featuredImage || '/placeholder-dealer.jpg'}
                        alt={`${currentDealer.name} Inventory`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      
                      {/* Featured Inventory Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                        <div className="flex items-center gap-2 mb-4">
                          <Award size={16} className="text-gold" />
                          <span className="text-white/80 text-xs uppercase tracking-wider">Featured Inventory</span>
                        </div>
                        
                        {currentDealer.featuredInventory && currentDealer.featuredInventory.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {currentDealer.featuredInventory.slice(0, 3).map((vehicle, idx) => (
                              <div key={idx} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-white/10">
                                <LazyImage
                                  src={vehicle.image}
                                  alt={vehicle.name}
                                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-2 left-2 right-2">
                                  <p className="text-white text-[10px] font-bold truncate">{vehicle.name}</p>
                                  {vehicle.price && (
                                    <p className="text-gold text-[10px]">KES {vehicle.price.toLocaleString()}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-white/40 text-sm">
                              {currentDealer.listingsCount || 0} vehicles available
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center group"
            aria-label="Previous dealer"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => paginate(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center group"
            aria-label="Next dealer"
          >
            <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {dealers.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-gold w-8' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to dealer ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
