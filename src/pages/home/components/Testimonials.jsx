import { Link } from 'react-router-dom';
import { Shield, Search, CheckCircle, Gavel } from 'lucide-react';

const FEATURES = [
  { icon: Shield, title: 'Escrow Protection', desc: 'Funds held securely until you confirm delivery. Every transaction fully protected.', link: '/escrow' },
  { icon: Search, title: 'Pre-Inspection', desc: '150-point forensic inspection on every vehicle. Know exactly what you\'re buying.', link: '/pre-inspection' },
  { icon: CheckCircle, title: 'Verified Dealers', desc: 'KRA-vetted, phone-verified dealers with real buyer ratings and transaction history.', link: '/showroom' },
  { icon: Gavel, title: 'Live Auctions', desc: 'Real-time bidding with countdown timers. Bid from anywhere in Kenya.', link: '/auctions/calendar' },
];

export default function WhyKayad() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="font-display font-black italic text-[clamp(1.6rem,3vw,2.4rem)] text-white leading-none mb-3">
            Why <span className="text-gold">KAYAD</span>
          </h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
            Built for trust. Powered by technology.
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <Link key={f.title} to={f.link} className="group no-underline">
              <div className="rounded-xl p-6 border text-center h-full transition-all duration-300 hover:border-gold/30 group-hover:-translate-y-1"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300"
                  style={{ background: 'rgba(212,196,168,0.08)' }}
                >
                  <f.icon size={20} className="text-gold/80 group-hover:text-gold transition-colors duration-300" />
                </div>
                <h3 className="font-display font-bold text-white text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
