import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, Globe, ArrowRight } from 'lucide-react';

export default function PrivateSellerSection() {
  return (
    <section className="py-16 md:py-24 border-t border-white/[0.04] relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-7 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                  P2P Marketplace
                </span>
                <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Private Sellers</span>
              </div>
              <h2 className="font-display font-black italic text-[clamp(2rem,4vw,3.5rem)] text-white leading-none m-0 mb-4">
                Sell Your Vehicle
                <span className="block text-gold" style={{ textShadow: '0 0 40px rgba(212,196,168,0.4)' }}>
                  Securely
                </span>
              </h2>
              <p className="text-white/60 text-lg mb-8 max-w-lg">
                Connect directly with verified buyers. Your vehicle gets nationwide visibility with mandatory escrow protection.
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base mb-1">
                    Mandatory Escrow Protection
                  </h3>
                  <p className="text-white/50 text-sm">
                    All transactions secured through our escrow system. Funds held until you confirm successful handover.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Users size={20} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base mb-1">
                    Verified Buyers
                  </h3>
                  <p className="text-white/50 text-sm">
                    All buyers are ID-verified and phone-verified. No ghost buyers, no time wasters.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Globe size={20} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base mb-1">
                    Nationwide Visibility
                  </h3>
                  <p className="text-white/50 text-sm">
                    Your listing reaches buyers across Kenya. Featured placement options available.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Link
              to="/register?sell=1&role=individual_seller"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gold text-black font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/90 transition-all duration-300 shadow-lg shadow-gold/20 no-underline group"
            >
              Sell Your Car
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Right Side - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-gold/10 rounded-full blur-2xl" />
              <div className="absolute bottom-4 left-4 w-32 h-32 bg-gold/5 rounded-full blur-3xl" />
              
              {/* Content */}
              <div className="relative p-8 md:p-12">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/30">
                    <span className="text-5xl">🚗</span>
                  </div>
                  <h3 className="font-display font-bold text-white text-xl mb-2">
                    Start Selling Today
                  </h3>
                  <p className="text-white/50 text-sm mb-6">
                    List your vehicle in minutes. No dealer license required.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="font-display font-black text-gold text-2xl">Free</div>
                      <div className="text-white/40 text-xs">Listing</div>
                    </div>
                    <div>
                      <div className="font-display font-black text-gold text-2xl">24h</div>
                      <div className="text-white/40 text-xs">Approval</div>
                    </div>
                    <div>
                      <div className="font-display font-black text-gold text-2xl">100%</div>
                      <div className="text-white/40 text-xs">Secure</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
