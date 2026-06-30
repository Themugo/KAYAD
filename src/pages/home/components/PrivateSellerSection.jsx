import { Link } from 'react-router-dom';
import { Shield, Users, Globe, ArrowRight } from 'lucide-react';

export default function PrivateSellerSection() {
  return (
    <section className="section-spacing border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
                Private Sellers
              </span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.5rem,3.5vw,2.8rem)] text-white leading-none mb-3">
              Sell Your Car
              <span className="block text-gold">Fast & Secure</span>
            </h2>
            <p className="text-white/50 text-sm mb-6 max-w-md">
              List in minutes. Escrow-protected transactions with verified buyers nationwide.
            </p>
            
            {/* Single strong CTA */}
            <Link
              to="/register?sell=1&role=individual_seller"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-black font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/90 transition-all duration-300 shadow-lg shadow-gold/20 no-underline group mb-8"
            >
              Start Selling Now
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Key benefits - simplified */}
            <div className="flex flex-wrap gap-4">
              {[
                { icon: Shield, text: 'Escrow Protected', color: 'var(--success)' },
                { icon: Users, text: 'Verified Buyers', color: 'var(--info)' },
                { icon: Globe, text: 'Nationwide Reach', color: 'var(--gold)' },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Icon size={14} style={{ color }} />
                  <span className="text-sm text-white/70 font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simplified stats card */}
          <div className="rounded-2xl overflow-hidden border border-white/10 p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(212,196,168,0.08) 0%, rgba(255,255,255,0.02) 100%)' }}>
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/30 text-4xl shadow-lg">🚗</div>
            <h3 className="font-display font-bold text-white text-xl mb-2">Free Listing. Fast Sale.</h3>
            <p className="text-white/50 text-sm mb-6">No dealer license required. Pay only when you sell.</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="font-display font-black text-gold text-2xl">Free</div>
                <div className="text-white/40 text-[10px] uppercase tracking-wider mt-1">To List</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="font-display font-black text-gold text-2xl">24h</div>
                <div className="text-white/40 text-[10px] uppercase tracking-wider mt-1">Approval</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="font-display font-black text-gold text-2xl">100%</div>
                <div className="text-white/40 text-[10px] uppercase tracking-wider mt-1">Secure</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
