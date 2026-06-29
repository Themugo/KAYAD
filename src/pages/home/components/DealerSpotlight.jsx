import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Car } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';

export default function DealerSpotlight({ dealers = [] }) {
  if (dealers.length === 0) return null;

  return (
    <section className="py-12 md:py-16 border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                Featured
              </span>
              <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Dealer Spotlight</span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
              Premium <span className="text-gold">Dealers</span>
            </h2>
          </div>
          <Link to="/showroom" className="text-[11px] font-bold no-underline tracking-[0.06em] flex items-center gap-1 transition-colors duration-200 hover:text-gold" style={{ color: 'rgba(212,196,168,0.7)' }}>
            View All →
          </Link>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {dealers.map((dealer, index) => (
            <motion.div
              key={dealer._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/dealer/${dealer._id}`} className="block no-underline">
                <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/10">
                  {/* Cover Image */}
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <LazyImage
                      src={dealer.coverImage || dealer.logo || '/placeholder-dealer.jpg'}
                      alt={dealer.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    {/* Verified Badge */}
                    {dealer.verified && (
                      <div className="absolute top-3 right-3 bg-gold/90 backdrop-blur-sm rounded-full px-3 py-1">
                        <span className="text-black text-[10px] font-bold uppercase">Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start gap-4 mb-3">
                      {dealer.logo && (
                        <img
                          src={dealer.logo}
                          alt={dealer.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-white text-base mb-1">
                          {dealer.name}
                        </h3>
                        <div className="flex items-center gap-1 text-white/50 text-xs">
                          <MapPin size={12} />
                          <span>{dealer.location || 'Kenya'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-white/40 text-xs mb-3">
                      <div className="flex items-center gap-1">
                        <Car size={12} />
                        <span>{dealer.listingsCount || 0} Listings</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-gold" />
                        <span>{dealer.rating || '4.5'}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {dealer.description && (
                      <p className="text-white/50 text-xs line-clamp-2">
                        {dealer.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
