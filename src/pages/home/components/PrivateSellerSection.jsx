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
                P2P Marketplace
              </span>
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.5rem,3.5vw,2.8rem)] text-white leading-none mb-3">
              Sell Your Car
              <span className="block text-gold">Securely</span>
            </h2>
            <p className="text-white/50 text-sm mb-6 max-w-md">
              List in minutes. Reach thousands of verified buyers across Kenya. Every transaction is escrow-protected.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {[
                { icon: Shield, text: 'Mandatory escrow protection', color: 'var(--success)' },
                { icon: Users, text: 'Verified buyers only', color: 'var(--info)' },
                { icon: Globe, text: 'Nationwide reach', color: 'var(--gold)' },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <Icon size={14} style={{ color }} />
                  <span className="text-sm text-white/70">{text}</span>
                </div>
              ))}
            </div>
            <Link
              to="/register?sell=1&role=individual_seller"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-black font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/90 transition-all duration-300 shadow-lg shadow-gold/20 no-underline group"
            >
              Start Selling
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/30 text-3xl">🚗</div>
            <h3 className="font-display font-bold text-white text-lg mb-1">List Free. Sell Fast.</h3>
            <p className="text-white/50 text-xs mb-5">No dealer license required. Free to list. Pay only when you sell.</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="font-display font-black text-gold text-xl">Free</div><div className="text-white/40 text-[10px]">Listing</div></div>
              <div><div className="font-display font-black text-gold text-xl">24h</div><div className="text-white/40 text-[10px]">Approval</div></div>
              <div><div className="font-display font-black text-gold text-xl">100%</div><div className="text-white/40 text-[10px]">Secure</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
