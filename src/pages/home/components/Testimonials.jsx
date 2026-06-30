import { motion } from 'framer-motion';
import { Shield, CheckCircle, Gavel, Lock, Search, Star } from 'lucide-react';

const CAPABILITIES = [
  { icon: Lock, title: 'Escrow Protection', desc: 'Every transaction is secured by our mandatory escrow system. Funds are held until you confirm delivery.' },
  { icon: CheckCircle, title: 'Verified Dealers', desc: 'All dealers are KRA-vetted, phone-verified, and rated by real buyers on every completed sale.' },
  { icon: Search, title: 'Pre-Inspection', desc: 'Order a 150-point forensic inspection on any vehicle. Know exactly what you\'re buying before you pay.' },
  { icon: Gavel, title: 'Live Auctions', desc: 'Real-time bidding with countdown timers. Place bids from your phone and win premium vehicles.' },
  { icon: Shield, title: 'Secure Payments', desc: 'Pay via M-Pesa STK push or bank transfer. All payments are tracked and receipted.' },
  { icon: Star, title: 'Buyer Protection', desc: 'Dedicated dispute resolution team. If something goes wrong, we mediate and protect your funds.' },
];

export default function Testimonials() {
  return (
    <section className="section-spacing border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
              Why KAYAD
            </span>
          </div>
          <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
            Built for Trust. <span className="text-gold">Powered by Technology.</span>
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl p-6 border"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <c.icon size={20} className="text-gold" style={{ marginBottom: 10 }} />
              <h3 className="font-display font-bold text-white text-sm mb-1.5">{c.title}</h3>
              <p className="text-xs text-white/45 leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
