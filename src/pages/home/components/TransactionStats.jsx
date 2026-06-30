import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Clock, Award } from 'lucide-react';
import { platformStatsAPI } from '../../../api/api';

export default function TransactionStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    platformStatsAPI.get().then(setStats).catch(() => {});
  }, []);

  const items = [
    { icon: DollarSign, value: stats?.totalRevenue ? `KES ${(stats.totalRevenue / 1e6).toFixed(1)}M+` : '—', label: 'Transaction Volume', color: 'var(--gold)' },
    { icon: TrendingUp, value: stats ? `${(stats.totalTransactions || 0).toLocaleString()}+` : '—', label: 'Completed Sales', color: 'var(--success)' },
    { icon: Clock, value: stats?.totalCars > 0 ? `${((stats.totalCars / (stats.totalTransactions || 1)) * 24).toFixed(0)}h` : '—', label: 'Avg. Listing to Sold', color: 'var(--info)' },
    { icon: Award, value: stats?.totalTransactions > 0 ? `${Math.min(99, Math.round((stats.escrowCount / Math.max(stats.totalTransactions, 1)) * 100))}%` : '—', label: 'Escrow Completion Rate', color: 'var(--gold)' },
  ];

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
          {items.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl p-5 text-center border"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
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
