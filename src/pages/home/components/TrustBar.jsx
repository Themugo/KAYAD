import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, Gavel, Lock, Star, CheckCircle, TrendingUp } from 'lucide-react';
import { platformStatsAPI } from '../../../api/api';

const FEATURES = [
  { icon: Lock, title: 'Escrow Protection', desc: 'Funds held securely until you confirm delivery.', color: 'var(--gold)' },
  { icon: Search, title: 'Pre-Inspection', desc: '150-point forensic inspection on every vehicle.', color: 'var(--info)' },
  { icon: CheckCircle, title: 'Verified Dealers', desc: 'KRA-vetted dealers with real buyer ratings.', color: 'var(--success)' },
  { icon: Gavel, title: 'Live Auctions', desc: 'Real-time bidding with countdown timers.', color: 'var(--gold)' },
  { icon: Shield, title: 'Buyer Protection', desc: 'Dedicated dispute resolution protects your funds.', color: 'var(--info)' },
  { icon: Star, title: 'Secure Payments', desc: 'M-Pesa & bank transfers. Every payment tracked.', color: 'var(--success)' },
];

export default function TrustBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    platformStatsAPI.get().then(setStats).catch(() => {});
  }, []);

  const statItems = stats ? [
    { value: `${(stats.totalCars || 0).toLocaleString()}+`, label: 'Vehicles Listed' },
    { value: `${(stats.verifiedDealers || 0).toLocaleString()}+`, label: 'Verified Dealers' },
    { value: `${(stats.escrowCount || 0).toLocaleString()}+`, label: 'Escrow Transactions' },
  ] : [];

  return (
    <section className="border-y border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7 py-10 md:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase mb-2" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
            Trust & Security
          </div>
          <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
            Why Buyers Trust <span className="text-gold">KAYAD</span>
          </h2>
        </div>

        {/* Stats row */}
        {statItems.length > 0 && (
          <div className="flex justify-center gap-8 md:gap-12 mb-8">
            {statItems.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <div className="font-display font-black italic text-2xl md:text-3xl text-gold leading-none mb-1">{s.value}</div>
                <div className="text-[11px] text-white/40 font-medium tracking-wide">{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl p-4 text-center border"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <f.icon size={18} style={{ color: f.color, margin: '0 auto 6px' }} />
              <h3 className="font-display font-bold text-white text-xs mb-1">{f.title}</h3>
              <p className="text-white/40 text-[10px] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
