import { motion } from 'framer-motion';
import { Shield, Star, Building2, Users } from 'lucide-react';

const STATS = [
  { icon: Users, value: '12,000+', label: 'Vehicles Listed', color: 'var(--gold)' },
  { icon: Building2, value: '500+', label: 'Verified Dealers', color: 'var(--success)' },
  { icon: Shield, value: '100%', label: 'Escrow Protected', color: 'var(--info)' },
  { icon: Star, value: '4.8★', label: 'Buyer Rating', color: 'var(--gold)' },
];

export default function TrustBar() {
  return (
    <section className="border-y border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center justify-center p-6 md:p-8 text-center"
              style={{ background: 'var(--surface)' }}
            >
              <s.icon size={22} style={{ color: s.color, marginBottom: 8 }} />
              <div className="font-display font-black italic text-2xl md:text-3xl text-white leading-none mb-1">
                {s.value}
              </div>
              <div className="text-xs text-white/40 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
