import { motion } from 'framer-motion';
import { Star, Shield, TrendingUp, MessageCircle } from 'lucide-react';

const METRICS = [
  { icon: Star, value: '4.8 / 5', label: 'Average Rating', sub: 'From 2,400+ verified reviews' },
  { icon: Shield, value: '100%', label: 'Escrow Satisfaction', sub: 'Zero unresolved disputes' },
  { icon: TrendingUp, value: '8,500+', label: 'Completed Transactions', sub: 'Across Kenya' },
  { icon: MessageCircle, value: '98%', label: 'Seller Response Rate', sub: 'Within 2 hours' },
];

export default function Testimonials() {
  return (
    <section className="section-spacing border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
              Trust Metrics
            </span>
          </div>
          <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
            Why Kenya Trusts <span className="text-gold">KAYAD</span>
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl p-6 text-center border"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <m.icon size={22} className="text-gold" style={{ margin: '0 auto 10px' }} />
              <div className="font-display font-black italic text-2xl text-white mb-1">{m.value}</div>
              <div className="text-sm text-white/80 font-medium mb-0.5">{m.label}</div>
              <div className="text-xs text-white/40">{m.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
