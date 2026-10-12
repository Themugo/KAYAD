import { ShieldCheck, Users, Car, CheckCircle2, Award } from 'lucide-react';
import type { FC } from 'react';

export const TrustMetricsBar: FC = () => {
  const metrics = [
    {
      label: 'Escrow availability',
      value: 'Listing-level',
      subtitle: 'Only when the programme and listing allow it',
      icon: <ShieldCheck className="w-5 h-5 text-[#13B8A6]" />,
    },
    {
      label: 'Seller information',
      value: 'Profile-based',
      subtitle: 'Review the details shown for each seller',
      icon: <Users className="w-5 h-5 text-[#13B8A6]" />,
    },
    {
      label: 'Inspection options',
      value: 'Independent',
      subtitle: 'Provider, scope and pricing vary',
      icon: <Car className="w-5 h-5 text-[#13B8A6]" />,
    },
    {
      label: 'Transaction steps',
      value: 'Deal-specific',
      subtitle: 'Confirm the terms before payment',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
  ];

  return (
    <section className="py-10 bg-[#0A3340] dark:bg-[#0a3340] text-white border-y border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Label */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#BDE5DE] text-[11px] font-mono font-bold uppercase tracking-widest">
            <Award className="w-3.5 h-3.5 text-[#13B8A6]" />
            MARKETPLACE DETAILS TO REVIEW
          </span>
        </div>

        {/* 4 Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y-0 sm:divide-x divide-white/10">
          {metrics.map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-white/5 dark:bg-white/3 border border-white/10 backdrop-blur-md flex flex-col items-center text-center space-y-2 hover:bg-white/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#176B87] flex items-center justify-center border border-[#13B8A6]/30 group-hover:scale-110 transition-transform shadow-md">
                {item.icon}
              </div>

              <div className="space-y-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white block">
                  {item.value}
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#13B8A6] block">
                  {item.label}
                </span>
              </div>

              <p className="text-[11px] text-[#BDE5DE] font-sans font-medium line-clamp-1">
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
