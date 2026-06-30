import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Shield, Award, Crown, TrendingUp } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';

function DealerBadge({ tier }) {
  if (tier === 'premium') {
    return (
      <div className="absolute top-3 right-3 bg-gold rounded-full p-1.5 shadow-lg shadow-gold/30">
        <Crown size={14} className="text-black" />
      </div>
    );
  }
  if (tier === 'featured') {
    return (
      <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm rounded-full p-1.5 border border-white/20">
        <Award size={14} className="text-gold" />
      </div>
    );
  }
  return null;
}

export default function FeaturedDealers({ dealers = [] }) {
  if (dealers.length === 0) return null;

  return (
    <section className="section-spacing border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                Premium
              </span>
              <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Dealer Network</span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
              Trusted <span className="text-gold">Partners</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/register?role=dealer" className="section-link">Become a Partner →</Link>
          </div>
        </div>

        <div className="grid gap-5 rgrid rgrid-4">
          {dealers.map((dealer, index) => (
            <motion.div
              key={dealer._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Link to={`/dealer/${dealer._id}`} className="block no-underline group">
                <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/10 h-full">
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gold/8 to-transparent">
                    <LazyImage
                      src={dealer.logo || '/placeholder-dealer.jpg'}
                      alt={dealer.name}
                      className="w-full h-full object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                    />
                    <DealerBadge tier={index === 0 ? 'premium' : 'featured'} />
                    {index === 0 && (
                      <div className="absolute top-3 left-3 bg-gold/90 rounded-full px-2 py-0.5">
                        <span className="text-[8px] text-black font-extrabold tracking-wider">TOP</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-display font-bold text-white text-sm mb-2 text-center truncate">
                      {dealer.name}
                    </h3>

                    <div className="flex items-center justify-center gap-3 text-white/40 text-xs mb-3">
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-gold" />
                        <span className="text-gold font-semibold">{dealer.rating || '4.5'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={11} />
                        <span>{dealer.location || 'Kenya'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={11} />
                        <span>{dealer.carCount || 0} cars</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1 bg-gold/8 rounded-lg px-3 py-2 border border-gold/10">
                      <Shield size={11} className="text-gold" />
                      <span className="text-[10px] text-gold font-bold tracking-wide">Verified Partner</span>
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
