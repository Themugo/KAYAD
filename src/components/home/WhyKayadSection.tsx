import { ShieldCheck, Lock, UserCheck, Shield } from 'lucide-react';
import type { FC } from 'react';

export const WhyKayadSection: FC = () => {
  const cards = [
    {
      title: 'Verified Vehicles',
      desc: 'Every vehicle undergoes a 150-point inspection and KRA logbook audit before listing.',
      icon: <ShieldCheck className="w-6 h-6 text-[#00C9CE]" />
    },
    {
      title: 'Secure Escrow',
      desc: 'Funds are held safely in CBK-regulated bank vaults until buyer inspection approval.',
      icon: <Lock className="w-6 h-6 text-[#00C9CE]" />
    },
    {
      title: 'Trusted Sellers',
      desc: 'All buyers and sellers pass mandatory biometric ID and KRA PIN verification.',
      icon: <UserCheck className="w-6 h-6 text-[#00C9CE]" />
    }
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#FCF9F4] text-[#1E3063] border-b border-[#E8E1D5] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3063]/10 border border-[#1E3063]/20 text-[#1E3063] font-mono font-bold text-xs uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span>THE KAYAD ADVANTAGE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-[#1E3063] font-serif tracking-tight">
            Why KAYAD
          </h2>
        </div>

        {/* 3 Concise Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2D8C7] shadow-xs hover:border-[#1E3063] hover:shadow-xl transition-all duration-300 space-y-4 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1E3063]/10 border border-[#1E3063]/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                {card.icon}
              </div>

              <h3 className="text-xl font-serif font-black text-[#1E3063]">
                {card.title}
              </h3>

              <p className="text-xs sm:text-sm text-[#6B7A99] font-sans font-medium leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
