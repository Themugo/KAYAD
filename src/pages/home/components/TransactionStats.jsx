import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Clock, Award } from 'lucide-react';

const TRANSACTION_DATA = [
  { icon: DollarSign, value: 'KES 2.4B+', label: 'Transaction Volume', color: 'var(--gold)' },
  { icon: TrendingUp, value: '8,500+', label: 'Completed Sales', color: 'var(--success)' },
  { icon: Clock, value: '24h', label: 'Avg. Listing to Sold', color: 'var(--info)' },
  { icon: Award, value: '98.7%', label: 'Satisfaction Rate', color: 'var(--gold)' },
];

export default function TransactionStats() {
  return (
    <section className="section-spacing border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="text-center mb-8">
          <div className="text-[8px] text-white/18 font-bold tracking-[0.18em] uppercase mb-1">Market Activity</div>
          <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
            Platform <span className="text-gold">Statistics</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRANSACTION_DATA.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl p-5 text-center border"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <s.icon size={20} style={{ color: s.color, margin: '0 auto 8px' }} />
              <div className="font-display font-black italic text-xl md:text-2xl text-white leading-none mb-1">{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
