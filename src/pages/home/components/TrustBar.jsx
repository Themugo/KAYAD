import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Star, Building2, Users } from 'lucide-react';
import { platformStatsAPI } from '../../../api/api';

function StatBlock({ icon: Icon, value, label, color }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-8 text-center" style={{ background: 'var(--surface)' }}>
      <Icon size={22} style={{ color, marginBottom: 8 }} />
      <div className="font-display font-black italic text-2xl md:text-3xl text-white leading-none mb-1">{value}</div>
      <div className="text-xs text-white/40 font-medium">{label}</div>
    </div>
  );
}

export default function TrustBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    platformStatsAPI.get().then(setStats).catch(() => {});
  }, []);

  const items = [
    { icon: Users, value: stats ? `${(stats.totalCars || 0).toLocaleString()}+` : '—', label: 'Vehicles Listed', color: 'var(--gold)' },
    { icon: Building2, value: stats ? `${(stats.verifiedDealers || 0).toLocaleString()}+` : '—', label: 'Verified Dealers', color: 'var(--success)' },
    { icon: Shield, value: stats?.escrowCount > 0 ? `${stats.escrowCount}+` : '—', label: 'Escrow Transactions', color: 'var(--info)' },
    { icon: Star, value: stats ? `${stats.platformRating || 4.8}★` : '—', label: 'Platform Rating', color: 'var(--gold)' },
  ];

  return (
    <section className="border-y border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {items.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <StatBlock {...s} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
