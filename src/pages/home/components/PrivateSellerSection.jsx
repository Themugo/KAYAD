import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, Globe, ArrowRight, Lock, CheckCircle, Clock } from 'lucide-react';

export default function PrivateSellerSection() {
  return (
    <section className="section-spacing border-t border-white/[0.04] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-7 relative z-10">
        <div className="flex items-end justify-between mb-1">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                P2P Marketplace
              </span>
              <span className="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Private Sellers</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-display font-black italic text-[clamp(2rem,4vw,3.5rem)] text-white leading-none m-0 mb-4">
              Sell Your Vehicle
              <span className="block text-gold" style={{ textShadow: '0 0 40px rgba(212,196,168,0.4)' }}>
                Securely
              </span>
            </h2>
            <p className="text-white/60 text-base mb-8 max-w-lg leading-relaxed">
              Connect directly with verified buyers. Your listing reaches buyers across Kenya with mandatory escrow protection on every transaction.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0 border border-success/20">
                  <Shield size={18} className="text-success" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-sm mb-0.5">Mandatory Escrow Protection</h3>
                  <p className="text-white/45 text-xs leading-relaxed">Funds held securely until you confirm successful handover. No risk, no surprises.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center flex-shrink-0 border border-info/20">
                  <Users size={18} className="text-info" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-sm mb-0.5">Verified Buyers Only</h3>
                  <p className="text-white/45 text-xs leading-relaxed">All buyers ID-verified and phone-verified. No ghost buyers, no time wasters.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0 border border-gold/20">
                  <Globe size={18} className="text-gold" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-sm mb-0.5">Nationwide Visibility</h3>
                  <p className="text-white/45 text-xs leading-relaxed">Featured placement options available. Reach thousands of active car buyers across Kenya.</p>
                </div>
              </div>
            </div>

            <Link
              to="/register?sell=1&role=individual_seller"
              className="inline-flex items-center gap-3 px-7 py-3.5 bg-gold text-black font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/90 transition-all duration-300 shadow-lg shadow-gold/20 no-underline group"
            >
              Start Selling
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10">
              <div className="absolute top-4 right-4 w-20 h-20 bg-gold/10 rounded-full blur-2xl" />
              <div className="absolute bottom-4 left-4 w-32 h-32 bg-gold/5 rounded-full blur-3xl" />

              <div className="relative p-8 md:p-10">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/30">
                    <span className="text-4xl">🚗</span>
                  </div>
                  <h3 className="font-display font-bold text-white text-lg mb-2">
                    Start Selling Today
                  </h3>
                  <p className="text-white/50 text-sm mb-6">
                    List your vehicle in minutes. No dealer license required.
                  </p>

                  <div className="grid grid-cols-3 gap-4 text-center mb-6">
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

                  <div className="flex items-center justify-center gap-4 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                      <Lock size={12} className="text-gold" />
                      Escrow
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle size={12} className="text-gold" />
                      Verified
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-gold" />
                      Fast
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
