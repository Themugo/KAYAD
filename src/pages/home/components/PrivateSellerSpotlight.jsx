import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Car, Shield } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';

export default function PrivateSellerSpotlight({ sellers = [] }) {
  if (sellers.length === 0) return null;

  return (
    <section className="py-12 md:py-16 border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                P2P
              </span>
              <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Private Sellers</span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
              Trusted <span className="text-gold">Sellers</span>
            </h2>
          </div>
          <Link to="/showroom" className="text-[11px] font-bold no-underline tracking-[0.06em] flex items-center gap-1 transition-colors duration-200 hover:text-gold" style={{ color: 'rgba(212,196,168,0.7)' }}>
            Browse All →
          </Link>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sellers.map((seller, index) => (
            <motion.div
              key={seller._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/cars?seller=${seller._id}`} className="block no-underline">
                <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/10">
                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                        <span className="font-display font-bold text-gold text-xl">
                          {seller.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-white text-base mb-1">
                          {seller.name}
                        </h3>
                        <div className="flex items-center gap-1 text-white/50 text-xs">
                          <MapPin size={12} />
                          <span>{seller.location || 'Kenya'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-white/40 text-xs mb-4">
                      <div className="flex items-center gap-1">
                        <Car size={12} />
                        <span>{seller.listingsCount || 0} Listings</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-gold" />
                        <span>{seller.rating || '4.5'}</span>
                      </div>
                    </div>

                    {/* Trust Indicators */}
                    <div className="flex items-center gap-2">
                      {seller.verified && (
                        <div className="flex items-center gap-1 bg-gold/10 rounded px-2 py-1">
                          <Shield size={10} className="text-gold" />
                          <span className="text-[10px] text-gold font-bold">Verified</span>
                        </div>
                      )}
                      {seller.responseRate && (
                        <div className="text-[10px] text-white/40">
                          {seller.responseRate}% response rate
                        </div>
                      )}
                    </div>
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
