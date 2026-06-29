import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Shield, Award } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';

export default function FeaturedDealers({ dealers = [] }) {
  if (dealers.length === 0) return null;

  return (
    <section className="py-12 md:py-16 border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                Premium
              </span>
              <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Featured Dealers</span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
              Top <span className="text-gold">Partners</span>
            </h2>
          </div>
          <Link to="/showroom" className="text-[11px] font-bold no-underline tracking-[0.06em] flex items-center gap-1 transition-colors duration-200 hover:text-gold" style={{ color: 'rgba(212,196,168,0.7)' }}>
            View All →
          </Link>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {dealers.map((dealer, index) => (
            <motion.div
              key={dealer._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/dealer/${dealer._id}`} className="block no-underline">
                <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/10">
                  {/* Logo */}
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gold/10 to-transparent">
                    <LazyImage
                      src={dealer.logo || '/placeholder-dealer.jpg'}
                      alt={dealer.name}
                      className="w-full h-full object-contain p-8"
                    />
                    
                    {/* Premium Badge */}
                    {dealer.isPremium && (
                      <div className="absolute top-3 right-3 bg-gold rounded-full p-2">
                        <Award size={16} className="text-black" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-display font-bold text-white text-sm mb-2 text-center">
                      {dealer.name}
                    </h3>
                    
                    <div className="flex items-center justify-center gap-3 text-white/40 text-xs mb-3">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-gold" />
                        <span>{dealer.rating || '4.5'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span>{dealer.location || 'Kenya'}</span>
                      </div>
                    </div>

                    {dealer.verified && (
                      <div className="flex items-center justify-center gap-1 bg-gold/10 rounded px-3 py-2">
                        <Shield size={12} className="text-gold" />
                        <span className="text-[10px] text-gold font-bold">Verified Dealer</span>
                      </div>
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
